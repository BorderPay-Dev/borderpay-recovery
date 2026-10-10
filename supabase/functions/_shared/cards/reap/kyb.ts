import { ContractError, contracts, validateSchema } from "./contracts.ts";
import { SandboxTransport } from "./transport.ts";
export function validateKybPack(
  pack: unknown,
  verifiedCorporateDomains: ReadonlySet<string>,
  today = new Date().toISOString().slice(0, 10),
) {
  validateSchema(
    contracts.createKyb.body.content["application/json"].schema,
    pack,
  );
  const p = pack as {
    validEmailDomains: string[];
    dateOfIncorporation: string;
    uboDeclaration: {
      externalUserId: string;
      ownershipPct: number;
      identity: { dob: string };
      document: { expiryDate?: string }[];
    }[];
  };
  // Website/email ownership must be established separately; never infer the
  // employee-card domain from a free/disposable onboarding email address.
  if (
    p.validEmailDomains.some((d) =>
      !verifiedCorporateDomains.has(d.toLowerCase())
    )
  ) throw new ContractError(["unverified_employee_email_domain"]);
  validateSchema({ type: "string", format: "date" }, p.dateOfIncorporation);
  if (p.dateOfIncorporation > today) {
    throw new ContractError(["future_incorporation_date"]);
  }
  const people = new Set<string>();
  let total = 0;
  for (const u of p.uboDeclaration) {
    if (people.has(u.externalUserId)) {
      throw new ContractError(["duplicate_owner"]);
    }
    people.add(u.externalUserId);
    const points = Math.round(u.ownershipPct * 100);
    if (Math.abs(points - u.ownershipPct * 100) > 0.000001) {
      throw new ContractError(["ownership_precision"]);
    }
    total += points;
    const cutoff = new Date(today + "T00:00:00Z");
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
    if (new Date(u.identity.dob + "T00:00:00Z") > cutoff) {
      throw new ContractError(["owner_underage"]);
    }
    if (
      u.document.some((d) => d.expiryDate !== undefined && d.expiryDate < today)
    ) throw new ContractError(["expired_identity_document"]);
  }
  if (total > 10000) throw new ContractError(["ownership_exceeds_100_percent"]);
  return structuredClone(pack);
}
const statuses = [
  "PENDING_SUBMISSION",
  "UNDER_REVIEW",
  "PENDING_ADDITIONAL_INFO",
  "APPROVED",
  "CANCELLED_BY_CLIENT",
  "REJECTED",
] as const;
export interface KybSnapshot {
  entityId: string;
  status: typeof statuses[number];
  cardIssuanceEnabled: boolean;
  checkedAt: string;
  uboEntities: unknown[];
}
export async function readKybSnapshot(
  transport: SandboxTransport,
  entityId: string,
): Promise<KybSnapshot> {
  const checkedAt = new Date().toISOString();
  const raw = await transport.execute("getKyb", { path: { entityId } });
  validateSchema({
    type: "object",
    required: ["entityId", "status", "cardIssuanceEnabled", "uboEntities"],
    properties: {
      entityId: { const: entityId },
      status: { enum: statuses },
      cardIssuanceEnabled: { type: "boolean" },
      uboEntities: { type: "array" },
    },
  }, raw);
  const r = raw as Omit<KybSnapshot, "checkedAt">;
  // An approval string alone never grants issuing access.
  return {
    entityId,
    status: r.status,
    cardIssuanceEnabled: r.status === "APPROVED" &&
      r.cardIssuanceEnabled === true,
    checkedAt,
    uboEntities: r.uboEntities,
  };
}
