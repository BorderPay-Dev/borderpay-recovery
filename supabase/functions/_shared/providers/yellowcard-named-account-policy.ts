import type { ProviderRelationship } from "./yellowcard-migration-policy.ts";

/** Draft product policy. Inputs must come from authenticated provider records and
 * staff grants, never merchant request fields. No provisioning or network writes. */
export interface NamedAccountContext {
  merchantId: string;
  accountType: "business" | "individual";
  globallyRestricted: boolean;
  yellowCardProgrammeEnabled: boolean;
  yellowCardInternalReviewComplete: boolean;
  bridgeUsdStaffAuthorized: boolean;
  relationships: ProviderRelationship[];
  resources: NamedResource[];
}
export interface NamedResource {
  merchantId: string;
  provider: "bridge" | "yellowcard";
  customerId: string;
  environment: "production" | "sandbox";
  id: string;
  kind: "virtual_account" | "wallet";
  asset: "EUR" | "USD" | "USDC";
  status: "active" | "pending" | "deactivated";
  beneficiaryVerified?: boolean;
  network?: string;
  destinationWalletId?: string;
}
export function namedAccountAccess(c: NamedAccountContext) {
  const allowed = c.accountType === "business" && !c.globallyRestricted;
  const relation = (provider: "bridge" | "yellowcard") => {
    const rows = c.relationships.filter(r => r.merchantId === c.merchantId && r.provider === provider && r.environment === "production");
    return rows.length === 1 && rows[0].customerId ? rows[0] : undefined;
  };
  const yc = relation("yellowcard"), bridge = relation("bridge");
  const active = (r: ProviderRelationship | undefined) => !!r && r.status === "active" && r.controlsSatisfied;
  const bound = (provider: "bridge" | "yellowcard", customerId: string | undefined) => c.resources.filter(r =>
    !!r.id && r.merchantId === c.merchantId && r.provider === provider && r.customerId === customerId &&
    !!customerId && r.environment === "production" && r.status === "active");
  const euro = bound("yellowcard", yc?.customerId).filter(r => r.kind === "virtual_account" && r.asset === "EUR" && r.beneficiaryVerified === true);
  const bridgeResources = bound("bridge", bridge?.customerId);
  const usd = bridgeResources.filter(r => r.kind === "virtual_account" && r.asset === "USD" && r.beneficiaryVerified === true);
  const wallets = bridgeResources.filter(r => r.kind === "wallet" && r.asset === "USDC" && r.network === "base");
  const wallet = usd.length === 1 ? wallets.filter(r => r.id === usd[0].destinationWalletId) : [];
  const eurAvailable = allowed && c.yellowCardProgrammeEnabled && c.yellowCardInternalReviewComplete && active(yc) && euro.length === 1;
  const usdAvailable = allowed && c.bridgeUsdStaffAuthorized && active(bridge) && usd.length === 1 && wallet.length === 1;
  return {
    primaryProvider: "yellowcard" as const,
    eur: { available: eurAvailable, resourceId: eurAvailable ? euro[0].id : null, canHoldFiat: eurAvailable },
    usd: { available: usdAvailable, resourceId: usdAvailable ? usd[0].id : null, canHoldFiat: false as const,
      status: usdAvailable ? "active" : bridge?.status === "paused" || bridge?.status === "rejected" || bridge?.status === "closed" ? "deactivated" : "unavailable" },
    usdc: { visible: usdAvailable, resourceId: usdAvailable ? wallet[0].id : null },
    yellowCardUsdEnabled: false as const,
    yellowCardGbpEnabled: false as const,
    yellowCardCryptoCustodyEnabled: false as const,
  };
}
/** Authorization still requires balance reservation, exact quote/fee approval,
 * sanctions/beneficiary controls and enabled partner operation contracts. */
export function namedPaymentSource(c: NamedAccountContext, input: {
  merchantId: string; resourceId: string; asset: string; provider: "bridge" | "yellowcard";
}) {
  const a = namedAccountAccess(c);
  if (input.merchantId !== c.merchantId || !input.resourceId) throw Error("Payment source unavailable");
  if (input.provider === "yellowcard" && input.asset === "EUR" && a.eur.available && input.resourceId === a.eur.resourceId) return "yellowcard" as const;
  if (input.provider === "bridge" && input.asset === "USDC" && a.usdc.visible && input.resourceId === a.usdc.resourceId) return "bridge" as const;
  throw Error("Payment source unavailable");
}
