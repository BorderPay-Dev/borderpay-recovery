/** New receiving-account policy. Not a policy for legacy balances or returns. */
export type ReceivingCurrency = "USD" | "EUR";
export type ReceivingProvider = "rain" | "yellowcard";
export type ProviderEligibility =
  | "approved"
  | "pending"
  | "rejected"
  | "restricted"
  | "unavailable";
export interface ReceivingContext {
  // Supplied by authenticated backend lookups, never by a request body.
  userId: string;
  business: boolean;
  localAccountStatus: string;
  fraudHold: boolean;
  subscriptionRestricted: boolean;
  securityEnrolled: boolean;
  eligibility: Record<ReceivingProvider, ProviderEligibility>;
}
export class ReceivingError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}
export function receivingProvider(currency: unknown): ReceivingProvider {
  const normalized = typeof currency === "string"
    ? currency.trim().toUpperCase()
    : "";
  if (normalized === "USD") return "rain";
  if (normalized === "EUR") return "yellowcard";
  if (normalized === "GBP") {
    throw new ReceivingError(
      "receiving_currency_unavailable",
      409,
      "GBP receiving accounts are currently unavailable.",
    );
  }
  throw new ReceivingError(
    "invalid_currency",
    400,
    "Select a supported receiving currency.",
  );
}
export function assertReceivingAccess(context: ReceivingContext): void {
  if (!context.userId) {
    throw new ReceivingError("unauthorized", 401, "Please sign in again.");
  }
  if (!context.business) {
    throw new ReceivingError(
      "business_required",
      403,
      "Receiving accounts are available to businesses.",
    );
  }
  if (context.fraudHold || context.localAccountStatus !== "active") {
    throw new ReceivingError(
      "account_restricted",
      423,
      "Receiving account access is restricted. Contact compliance.",
    );
  }
  if (context.subscriptionRestricted) {
    throw new ReceivingError(
      "subscription_restricted",
      403,
      "Please complete your account maintenance payment.",
    );
  }
  if (!context.securityEnrolled) {
    throw new ReceivingError(
      "security_setup_required",
      409,
      "Please complete your account security setup.",
    );
  }
}
export function receivingCapabilities(context: ReceivingContext) {
  assertReceivingAccess(context);
  const supported_currencies: ReceivingCurrency[] = ["USD", "EUR"];
  const configured_currencies = supported_currencies.filter((currency) =>
    context.eligibility[receivingProvider(currency)] === "approved"
  );
  return {
    supported_currencies,
    configured_currencies,
    operational_currencies: configured_currencies,
    setup_pending_currencies: supported_currencies.filter((currency) =>
      context.eligibility[receivingProvider(currency)] === "unavailable"
    ),
    provider_pending_currencies: supported_currencies.filter((currency) =>
      context.eligibility[receivingProvider(currency)] === "pending"
    ),
  };
}
export interface ReceivingAdapters<T> {
  rain: (userId: string, currency: "USD") => Promise<T>;
  yellowcard: (userId: string, currency: "EUR") => Promise<T>;
}
/** No Bridge dependency or fallback, including after a provider timeout. */
export async function createReceivingAccount<T>(
  context: ReceivingContext,
  currency: unknown,
  adapters: ReceivingAdapters<T>,
): Promise<T> {
  assertReceivingAccess(context);
  const provider = receivingProvider(currency);
  if (context.eligibility[provider] !== "approved") {
    throw new ReceivingError(
      "receiving_setup_required",
      409,
      "Please contact compliance@borderpayvelocity.xyz to enable this receiving account.",
    );
  }
  return provider === "rain"
    ? await adapters.rain(context.userId, "USD")
    : await adapters.yellowcard(context.userId, "EUR");
}
