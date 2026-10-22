import { createHash } from "node:crypto";
import {
  type Operation,
  prepareRequest,
  type RequestInput,
} from "./contracts.ts";
import { ProviderError, SandboxTransport } from "./transport.ts";
export interface Scope {
  programId: string;
  tenantId: string;
}
export interface Receipt {
  state: "SUCCEEDED" | "REJECTED" | "UNKNOWN";
  providerId?: string;
  error?: string;
}
export interface CommandStore {
  authorize(
    scope: Scope,
    operation: Operation,
    input: RequestInput,
  ): Promise<void>;
  reserve(
    scope: Scope,
    key: string,
    operation: Operation,
    hash: string,
  ): Promise<{ fresh: true } | { fresh: false; receipt: Receipt }>;
  finish(scope: Scope, key: string, receipt: Receipt): Promise<void>;
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.entries(v).sort(([a], [b]) =>
      a.localeCompare(b)
    ).map(([k, v]) => JSON.stringify(k) + ":" + canonical(v)).join(",") + "}";
  }
  return JSON.stringify(v) ?? "null";
}
export const requestHash = (v: unknown) =>
  createHash("sha256").update(canonical(v)).digest("hex");
const allowed = new Set<Operation>([
  "createCard",
  "freezeCard",
  "adjustCredit",
  "spendControls",
  "terminateCard",
  "createKyb",
  "amendKyb",
  "submitKyb",
]);
/** The caller must derive Scope from verified authentication, never request JSON.
 * The bound store repeats resource ownership checks before every request/replay.
 * No automatic retries: PUT credit adjustment is additive and documented POST
 * idempotency guarantees cannot safely be assumed for it or the compliance API. */
export async function runCommand(
  store: CommandStore,
  transport: SandboxTransport,
  scope: Scope,
  operation: Operation,
  input: RequestInput,
  key: string,
): Promise<Receipt> {
  if (!allowed.has(operation)) {
    throw new Error(
      "Operation requires the separate programme setup or ephemeral route.",
    );
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(key)
  ) throw new Error("Persisted UUIDv4 operation required.");
  const prepared = prepareRequest(operation, input);
  await store.authorize(scope, operation, input);
  const reserved = await store.reserve(
    scope,
    key,
    operation,
    requestHash(prepared),
  );
  if (!reserved.fresh) return reserved.receipt;
  let receipt: Receipt;
  try {
    const result = await transport.execute(operation, input, key);
    const id = result && typeof result === "object" && "id" in result &&
        typeof result.id === "string"
      ? result.id
      : undefined;
    if (operation === "createCard" && (!id || !(/^[0-9a-f-]{36}$/i.test(id)))) {
      throw new ProviderError("invalid_creation_response", 0, true);
    }
    // Keep only a receipt, never identity data, card PAN, CVV, or reveal URLs.
    receipt = { state: "SUCCEEDED", ...(id ? { providerId: id } : {}) };
  } catch (error) {
    receipt = error instanceof ProviderError && !error.uncertain
      ? { state: "REJECTED", error: error.code }
      : { state: "UNKNOWN", error: "reconciliation_required" };
  }
  // A crash or DB failure leaves IN_FLIGHT; retries cannot execute it a second time.
  await store.finish(scope, key, receipt);
  return receipt;
}
