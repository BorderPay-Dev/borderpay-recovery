import schema from "./business-card.schema.json" with { type: "json" };
// This prepares a request only. Issuing requires an authenticated tenant binding,
// persisted idempotency operation and a confirmed REAP sandbox programme.
type Schema = {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  enum?: unknown[];
  oneOf?: Schema[];
  additionalProperties?: boolean;
  nullable?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  format?: string;
};
function valid(value: unknown, s: Schema): boolean {
  if (value === null) return s.nullable === true;
  if (s.oneOf) {
    return s.oneOf.filter((branch) => valid(value, branch)).length === 1;
  }
  if (s.enum && !s.enum.includes(value)) return false;
  if (s.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    if (s.required?.some((key) => !(key in obj))) return false;
    return Object.entries(obj).every(([key, v]) =>
      s.properties?.[key]
        ? valid(v, s.properties[key])
        : s.additionalProperties !== false
    );
  }
  if (s.type === "string") {
    if (typeof value !== "string" || !value.trim()) return false;
    if (s.minLength !== undefined && value.length < s.minLength) return false;
    if (s.maxLength !== undefined && value.length > s.maxLength) return false;
    if (
      s.format === "uuid" &&
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ) return false;
    if (s.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return false;
    }
  }
  if (
    s.type === "number" &&
    (typeof value !== "number" || !Number.isFinite(value) ||
      (s.minimum !== undefined && value < s.minimum))
  ) return false;
  return true;
}
export function prepareMerchantCard(input: unknown, operationKey: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(operationKey)
  ) {
    throw new Error(
      "Persist a UUIDv4 operation key before preparing a request.",
    );
  }
  if (!valid(input, schema as Schema)) {
    throw new Error("Business card details are incomplete or invalid.");
  }
  const body = structuredClone(input) as Record<string, unknown>;
  // Deliberately narrow first integration to virtual commercial merchant cards.
  if (
    Object.keys(body).some((k) => !(k in schema.properties)) ||
    body.cardType !== "Virtual" || body.programType !== "commercial" ||
    body.scheme !== "visa"
  ) {
    throw new Error(
      "Only virtual commercial Visa requests are supported by this starter.",
    );
  }
  const kyc = body.kyc as Record<string, unknown>;
  if (
    kyc.entityType !== "Company" || typeof kyc.entityId !== "string" ||
    !kyc.entityId.trim() ||
    !kyc.cardholder || Object.keys(kyc.cardholder as object).length === 0
  ) {
    throw new Error(
      "A merchant entity ID and named cardholder are required. REAP must approve the entity.",
    );
  }
  // First scope is Standard Authorisation, zero initial allocation; funding is separate.
  if (body.spendLimit !== 0 || body.topUpWallet || body.expiryDate) {
    throw new Error(
      "Initial allocation must be zero; funding and custom expiry are not enabled.",
    );
  }
  const holder = kyc.cardholder as Record<string, unknown>;
  const dob = holder.dob;
  const parsed = typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)
    ? new Date(dob + "T00:00:00Z")
    : new Date(NaN);
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dob || parsed > cutoff
  ) {
    throw new Error("A valid adult cardholder date of birth is required.");
  }
  return {
    method: "POST" as const,
    path: "/cards",
    headers: { "Idempotency-Key": operationKey },
    body,
  };
}
