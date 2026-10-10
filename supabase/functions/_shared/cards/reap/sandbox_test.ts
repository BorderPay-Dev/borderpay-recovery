import { ReapSandboxClient, ReapSandboxError } from "./sandbox-client.ts";
import { prepareMerchantCard } from "./prepare-business-card.ts";
const assert = (condition: unknown) => {
  if (!condition) throw new Error("Assertion failed");
};
async function rejects(fn: () => unknown, code?: string) {
  try {
    await fn();
  } catch (e) {
    if (code) assert(e instanceof ReapSandboxError && e.code === code);
    return;
  }
  throw new Error("Expected rejection");
}
const key = "00000000-0000-4000-8000-000000000001";
const fixture = () => ({
  cardType: "Virtual",
  customerType: "Business",
  spendLimit: 0,
  programType: "commercial",
  scheme: "visa",
  preferredCardName: "SYNTHETIC TEST",
  meta: {
    id: "synthetic-cardholder",
    otpPhoneNumber: { dialCode: 1, phoneNumber: "2025550100" },
  },
  kyc: {
    fullName: "Synthetic Test Ltd",
    entityType: "Company",
    entityId: "synthetic-approved-entity",
    businessName: "Synthetic Test Ltd",
    businessRegistrationNumber: "SYNTHETIC-ONLY",
    registeredAddress: {
      line1: "1 Test Street",
      city: "London",
      country: "GBR",
    },
    businessOperationAddress: {
      line1: "1 Test Street",
      city: "London",
      country: "GBR",
    },
    cardholder: {
      firstName: "Synthetic",
      dob: "1990-01-01",
      idDocumentType: "Passport",
      idDocumentNumber: "SYNTHETIC",
      residentialAddress: {
        line1: "1 Test Street",
        line2: "Unit 1",
        city: "London",
        country: "GBR",
      },
    },
  },
});
Deno.test("uses sandbox origin, version and auth; blocks redirects", async () => {
  const client = new ReapSandboxClient(
    "synthetic-key",
    (async (url, init) => {
      assert(url === "https://sandbox.api.caas.reap.global/card-design/");
      const h = new Headers(init?.headers);
      assert(h.get("Accept-Version") === "v2.0");
      assert(h.get("x-reap-api-key") === "synthetic-key");
      assert(init?.redirect === "error");
      return Response.json({ items: [] });
    }) as typeof fetch,
  );
  await client.listDesigns();
  assert(!JSON.stringify(client).includes("synthetic-key"));
});
Deno.test("invalid IDs and pagination make no network request", async () => {
  let calls = 0;
  const client = new ReapSandboxClient(
    "synthetic",
    (async () => {
      calls++;
      return Response.json({});
    }) as typeof fetch,
  );
  await rejects(() => client.getCard("../reveal"), "invalid_card_id");
  await rejects(() => client.listCards(1, 101), "invalid_pagination");
  assert(calls === 0);
});
Deno.test("provider errors never expose response body", async () => {
  const client = new ReapSandboxClient(
    "synthetic",
    (async () =>
      new Response("secret-personal-information", {
        status: 401,
      })) as typeof fetch,
  );
  await rejects(() => client.listCards(), "sandbox_request_failed");
});
Deno.test("network errors sanitized and not automatically retried", async () => {
  let calls = 0;
  const client = new ReapSandboxClient(
    "synthetic",
    (async () => {
      calls++;
      throw new Error("credential-containing-url");
    }) as typeof fetch,
  );
  await rejects(
    () => client.listCards(),
    "sandbox_transport_or_response_failed",
  );
  assert(calls === 1);
});
Deno.test("prepares business merchant request with stable idempotency key", () => {
  const f = fixture();
  const a = prepareMerchantCard(f, key);
  const b = prepareMerchantCard(f, key);
  assert(JSON.stringify(a) === JSON.stringify(b));
  f.kyc.businessName = "changed";
  assert(
    (a.body.kyc as Record<string, unknown>).businessName ===
      "Synthetic Test Ltd",
  );
});
Deno.test("consumer and retail input rejected", async () => {
  await rejects(() =>
    prepareMerchantCard({ ...fixture(), customerType: "Consumer" }, key)
  );
  await rejects(() =>
    prepareMerchantCard({ ...fixture(), programType: "retail" }, key)
  );
});
Deno.test("merchant entity and cardholder mandatory", async () => {
  const f = fixture();
  f.kyc.entityId = "";
  await rejects(() => prepareMerchantCard(f, key));
  const b = fixture();
  Object.assign(b.kyc, { cardholder: {} });
  await rejects(() => prepareMerchantCard(b, key));
});
Deno.test("rejects missing business and underage/invalid identity fields", async () => {
  const f = fixture();
  f.kyc.businessRegistrationNumber = "";
  await rejects(() => prepareMerchantCard(f, key));
  for (const dob of ["2020-01-01", "1990-02-31"]) {
    const f = fixture();
    f.kyc.cardholder.dob = dob;
    await rejects(() => prepareMerchantCard(f, key));
  }
});
Deno.test("funding, unknown fields and physical cards cannot slip into starter", async () => {
  for (
    const extra of [{ spendLimit: 1 }, { cardType: "Physical" }, {
      logo_url: "https://example.com",
    }]
  ) {
    await rejects(() => prepareMerchantCard({ ...fixture(), ...extra }, key));
  }
});
Deno.test("caller must persist an operation UUID", async () => {
  await rejects(() => prepareMerchantCard(fixture(), ""));
  await rejects(() => prepareMerchantCard(fixture(), "merchant-name"));
});
