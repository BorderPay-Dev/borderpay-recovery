import { ReceivingError } from "./receiving-routing.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface RainUsdInput {
  // Resolve company and wallet ownership from the authenticated merchant.
  companyId: string;
  destinationAddress: string;
  feePercent: string;
}
export function rainUsdPayload(input: RainUsdInput) {
  if (!uuid.test(input.companyId)) {
    throw new ReceivingError(
      "company_mapping_required",
      409,
      "Business verification is required.",
    );
  }
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(input.destinationAddress) ||
    /^0x0{40}$/i.test(input.destinationAddress)
  ) {
    throw new ReceivingError(
      "wallet_destination_required",
      409,
      "An eligible receiving wallet is required.",
    );
  }
  // Explicit policy required: no accidental zero-fee subsidization.
  if (
    !/^\d+(\.\d{1,4})?$/.test(input.feePercent) ||
    Number(input.feePercent) > 100
  ) {
    throw new ReceivingError(
      "fee_configuration_invalid",
      503,
      "Account pricing is temporarily unavailable.",
    );
  }
  return {
    companyId: input.companyId,
    source: { currency: "usd", rail: "ach" },
    destination: {
      currency: "usdc",
      rail: "base",
      address: { type: "onchain", address: input.destinationAddress },
    },
    senderFees: [{ type: "variable", amount: input.feePercent }],
  };
}
export interface RainClientConfig {
  environment: "sandbox" | "production";
  apiKey: string;
  enabled: boolean;
}
/** Caller must persist the operation UUID and exact payload before this call.
 * On timeout, reconcile that operation; never issue a new key automatically.
 */
export async function postRainUsdRoute(
  config: RainClientConfig,
  input: RainUsdInput,
  operationId: string,
  transport: typeof fetch = fetch,
): Promise<unknown> {
  if (!config.enabled || !config.apiKey.trim()) {
    throw new ReceivingError(
      "receiving_unavailable",
      503,
      "Account setup is temporarily unavailable.",
    );
  }
  if (!["sandbox", "production"].includes(config.environment)) {
    throw new ReceivingError(
      "configuration_invalid",
      503,
      "Account setup is temporarily unavailable.",
    );
  }
  if (!uuid.test(operationId)) {
    throw new ReceivingError(
      "operation_required",
      500,
      "Account setup could not be started.",
    );
  }
  const payload = rainUsdPayload(input);
  const origin = config.environment === "production"
    ? "https://api.rain.xyz"
    : "https://api-dev.rain.xyz";
  let response: Response;
  try {
    response = await transport(`${origin}/v1/payment-routes`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: {
        "Api-Key": config.apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": operationId,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ReceivingError(
      "receiving_reconciliation_required",
      503,
      "Account setup is being checked. Please do not submit another request.",
    );
  }
  // Never relay raw upstream errors, account data or credentials to public logs.
  if (!response.ok) {
    throw new ReceivingError(
      response.status >= 500
        ? "receiving_reconciliation_required"
        : "receiving_provider_rejected",
      503,
      "Account setup could not be confirmed. Contact support.",
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ReceivingError(
      "receiving_reconciliation_required",
      503,
      "Account setup is being checked. Please do not submit another request.",
    );
  }
}
