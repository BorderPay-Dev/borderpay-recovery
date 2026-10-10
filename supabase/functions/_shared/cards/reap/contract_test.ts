import { contracts, prepareRequest, validateSchema } from "./contracts.ts";
import { SandboxTransport } from "./transport.ts";
import { prepareKybUpload } from "./documents.ts";
import { minorUnits, reconcileSettlement } from "./reconciliation.ts";
const assert = (c: unknown) => {
  if (!c) throw new Error("Assertion failed");
};
async function rejects(fn: () => unknown) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error("Expected rejection");
}
const uuid = "00000000-0000-4000-8000-000000000001";
Deno.test("all 33 operations retain documented sources and hashes", () => {
  assert(Object.keys(contracts).length === 33);
  for (const c of Object.values(contracts)) {
    assert(c.source.startsWith("https://reap"));
    assert(/^[0-9a-f]{64}$/.test(c.sourceSha256));
  }
});
Deno.test("exact documented paths and request shapes", () => {
  const f = prepareRequest("freezeCard", {
    path: { cardId: uuid },
    body: { freeze: false },
  });
  assert(f.path === `/cards/${uuid}/status` && f.method === "PUT");
  const s = prepareRequest("submitKyb", { path: { entityId: uuid } });
  assert(s.body === undefined && s.method === "POST");
  const w = prepareRequest("subscribeCards", {
    body: { subscriberUrl: "https://example.com/hooks" },
  });
  assert(w.path === "/webhooks");
});
Deno.test("wrong webhook field, date, type, UUID and consumer scopes rejected", async () => {
  await rejects(() =>
    prepareRequest("subscribeCards", {
      body: { subscribeUrl: "https://example.com" },
    })
  );
  await rejects(() =>
    prepareRequest("requestReport", {
      path: { fileType: "daily" },
      query: { date: "2026-02-31" },
    })
  );
  await rejects(() =>
    prepareRequest("freezeCard", {
      path: { cardId: uuid },
      body: { freeze: "false" },
    })
  );
  await rejects(() =>
    prepareRequest("getCard", { path: { cardId: "../reveal" } })
  );
  const client = new SandboxTransport({});
  await rejects(() =>
    client.execute("createBusiness", {
      body: { externalId: "x", type: "INDIVIDUAL" },
    }, uuid)
  );
});
Deno.test("transport keeps keys separate, uses exact version and does not redirect", async () => {
  const calls: { url: string; headers: Headers }[] = [];
  const client = new SandboxTransport(
    { cards: "cards-synthetic", compliance: "compliance-synthetic" },
    ((url, init) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers) });
      assert(init?.redirect === "error");
      return Promise.resolve(Response.json({ id: uuid }));
    }) as typeof fetch,
  );
  await client.execute("getCard", { path: { cardId: uuid } });
  await client.execute("getEntity", { path: { entityId: uuid } });
  assert(calls[0].url.startsWith("https://sandbox.api.caas.reap.global/"));
  assert(
    calls[1].url.startsWith("https://sandbox-compliance.api.reap.global/"),
  );
  assert(calls[0].headers.get("x-reap-api-key") === "cards-synthetic");
  assert(calls[1].headers.get("x-reap-api-key") === "compliance-synthetic");
  assert(calls[0].headers.get("Accept-Version") === "v2.0");
  assert(!calls[1].headers.has("Accept-Version"));
});
Deno.test("mutation requires operation key and never blindly retries a timeout", async () => {
  let count = 0;
  const client = new SandboxTransport(
    { cards: "synthetic" },
    (() => {
      count++;
      return Promise.reject(new Error("timeout"));
    }) as typeof fetch,
  );
  await rejects(() =>
    client.execute("adjustCredit", {
      path: { cardId: uuid },
      body: { adjustment: "20.00" },
    })
  );
  assert(count === 0);
  await rejects(() =>
    client.execute("adjustCredit", {
      path: { cardId: uuid },
      body: { adjustment: "20.00" },
    }, uuid)
  );
  assert(count === 1);
  await rejects(() =>
    client.execute("adjustCredit", {
      path: { cardId: uuid },
      body: { adjustment: 20 },
    }, uuid)
  );
  assert(count === 1);
});
Deno.test("UBO array cannot be accidentally replaced by a generic amendment", async () => {
  const c = new SandboxTransport({});
  await rejects(() =>
    c.execute("amendKyb", {
      path: { entityId: uuid },
      body: { uboDeclaration: [] },
    }, uuid)
  );
});
Deno.test("UKYB requires owner identity, ownership, registered and operating addresses", async () => {
  const schema = contracts.createKyb.body.content["application/json"].schema;
  await rejects(() =>
    validateSchema(schema, { legalBusinessName: "Synthetic Business" })
  );
  assert(
    schema.required.includes("uboDeclaration") &&
      schema.required.includes("principalPlaceOfBusinessAddress") &&
      schema.required.includes("validEmailDomains"),
  );
});
async function evidence(name = "id.pdf", type = "application/pdf") {
  const file = new File(["synthetic evidence only"], name, { type });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return {
    file,
    scanStatus: "clean" as const,
    sha256: [...new Uint8Array(digest)].map((n) =>
      n.toString(16).padStart(2, "0")
    ).join(""),
  };
}
Deno.test("UBO upload uses BUSINESS URL, owner field and ordered files", async () => {
  const a = await evidence(), b = await evidence("back.pdf");
  const upload = await prepareKybUpload({
    businessEntityId: uuid,
    documentType: "ubo-kyc",
    individualEntityId: "00000000-0000-4000-8000-000000000002",
    uboDocumentType: "ID_CARD",
    files: [a, b],
    existingFileCount: 0,
  });
  assert(upload.path === `/entity/${uuid}/ukyb/documents`);
  assert(upload.body.get("individualEntityId") !== uuid);
  assert(upload.body.getAll("files").length === 2);
});
Deno.test("rejects quarantined or changed evidence, MIME mismatch and file cap", async () => {
  const base = {
    businessEntityId: uuid,
    documentType: "certificate-of-incorporation",
    existingFileCount: 0,
  };
  const e = await evidence();
  await rejects(() =>
    prepareKybUpload({ ...base, files: [{ ...e, sha256: "0".repeat(64) }] })
  );
  await rejects(() =>
    prepareKybUpload({
      ...base,
      files: [{ ...e, scanStatus: "quarantined" as "clean" }],
    })
  );
  await rejects(async () =>
    prepareKybUpload({
      ...base,
      files: [await evidence("photo.jpg", "application/pdf")],
    })
  );
  await rejects(() =>
    prepareKybUpload({ ...base, files: [e], existingFileCount: 20 })
  );
});
Deno.test("decimal arithmetic retains cents and rejects missing amounts", async () => {
  assert(minorUnits("0.10") + minorUnits("0.20") === 30n);
  await rejects(() => minorUnits(""));
  await rejects(() => minorUnits("1e3"));
  await rejects(() => minorUnits("0.001"));
});
Deno.test("report reconciliation handles duplicates, refunds and currencies independently", () => {
  const rows = [{
    eventKey: "a",
    currency: "USD",
    status: "PENDING",
    type: "AUTHORIZATION",
    incoming: "0",
    outgoing: "10",
    balance: "90",
  }, {
    eventKey: "b",
    currency: "USD",
    status: "CLEARED",
    type: "CAPTURE_SETTLEMENT",
    incoming: "0",
    outgoing: "0",
    balance: "90",
  }, {
    eventKey: "c",
    currency: "USD",
    status: "CLEARED",
    type: "REFUND_SETTLEMENT",
    incoming: "10",
    outgoing: "0",
    balance: "100",
  }];
  const r = reconcileSettlement([...rows, rows[0]], { USD: "100", HKD: "20" }, {
    USD: "100",
    HKD: "20",
  });
  assert(
    r.matched && r.duplicates === 1 && r.balanceMinor.USD === "10000" &&
      r.refundInMinor.USD === "1000",
  );
  assert(r.clearingOutMinor.USD === "0"); // Clearing isn't double-counted as another debit.
});
Deno.test("unknown closing balance and conflicting rows never reconcile silently", () => {
  const row = {
    eventKey: "a",
    currency: "USD",
    status: "CLEARED",
    type: "CAPTURE_SETTLEMENT",
    incoming: "0",
    outgoing: "10",
    balance: "90",
  };
  assert(
    !reconcileSettlement([row, { ...row, outgoing: "20" }], { USD: "100" }, {})
      .matched,
  );
});
