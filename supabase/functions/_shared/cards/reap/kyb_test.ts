import { readKybSnapshot, validateKybPack } from "./kyb.ts";
import { SandboxTransport } from "./transport.ts";
import { planWebhookWork } from "./work-plan.ts";
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
function pack() {
  return {
    legalBusinessName: "Synthetic Limited",
    legalFormOfCompany: "PRIVATE_LIMITED",
    businessRegistrationNumber: "SYNTHETIC-ONLY",
    registeredAddress: {
      line1: "1 Synthetic Street",
      city: "London",
      country: "GBR",
    },
    principalPlaceOfBusinessAddress: {
      line1: "2 Synthetic Street",
      city: "London",
      country: "GBR",
    },
    validEmailDomains: ["synthetic.example"],
    lineOfBusiness: "INFORMATION_TECHNOLOGY_SOFTWARE",
    dateOfIncorporation: "2020-01-01",
    uboDeclaration: [{
      externalUserId: "owner-1",
      ownershipPct: 100,
      identity: {
        firstName: "Synthetic",
        lastName: "Person",
        fullName: "Synthetic Person",
        dob: "1990-01-01",
        nationality: "GBR",
      },
      document: [{
        documentCategory: "IDV",
        type: "PASSPORT",
        number: "SYNTHETIC",
        country: "GBR",
        expiryDate: "2030-01-01",
      }],
      address: {
        country: "GBR",
        formattedAddress: "1 Synthetic Street, London",
      },
    }],
  };
}
Deno.test("UKYB pack retains operating address and owner identifiers", () => {
  const p = validateKybPack(
    pack(),
    new Set(["synthetic.example"]),
    "2026-10-10",
  ) as ReturnType<typeof pack>;
  assert(
    p.uboDeclaration[0].externalUserId === "owner-1" &&
      p.principalPlaceOfBusinessAddress.line1 !== p.registeredAddress.line1,
  );
});
Deno.test("KYB rejects duplicate owners, excessive ownership and unverified employee domains", async () => {
  const p = pack();
  p.uboDeclaration.push({ ...p.uboDeclaration[0] });
  await rejects(() => validateKybPack(p, new Set(["synthetic.example"])));
  const q = pack();
  q.uboDeclaration[0].ownershipPct = 101;
  await rejects(() => validateKybPack(q, new Set(["synthetic.example"])));
  await rejects(() => validateKybPack(pack(), new Set()));
});
Deno.test("KYB rejects expired documents and minors before API submission", async () => {
  const p = pack();
  p.uboDeclaration[0].document[0].expiryDate = "2020-01-01";
  await rejects(() => validateKybPack(p, new Set(["synthetic.example"])));
  const q = pack();
  q.uboDeclaration[0].identity.dob = "2020-01-01";
  await rejects(() => validateKybPack(q, new Set(["synthetic.example"])));
});
Deno.test("APPROVED without actual card issuing grant remains disabled", async () => {
  const client = new SandboxTransport(
    { compliance: "synthetic" },
    (() =>
      Promise.resolve(
        Response.json({
          entityId: uuid,
          status: "APPROVED",
          cardIssuanceEnabled: false,
          uboEntities: [],
        }),
      )) as typeof fetch,
  );
  assert(!(await readKybSnapshot(client, uuid)).cardIssuanceEnabled);
});
Deno.test("provider entity mismatch cannot update a merchant snapshot", async () => {
  const client = new SandboxTransport(
    { compliance: "synthetic" },
    (() =>
      Promise.resolve(
        Response.json({
          entityId: "different",
          status: "APPROVED",
          cardIssuanceEnabled: true,
          uboEntities: [],
        }),
      )) as typeof fetch,
  );
  await rejects(() => readKybSnapshot(client, uuid));
});
Deno.test("late webhook schedules current state read rather than overwriting approval", () => {
  const work = planWebhookWork({
    service: "compliance",
    traceId: "old",
    businessKey: "old",
    payloadHash: "old",
    eventType: "kyb_status_change",
    eventName: "",
    body: { data: { entityId: uuid, status: "UNDER_REVIEW" } },
  });
  assert(work.kind === "refresh_kyb");
});
