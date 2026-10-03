/** Provider-independent transition policy. Not yet connected to live account status or payouts.
 * Provider account ownership/status and residual recovery are separate from the
 * merchant's current banking provider. Never overwrite Bridge with a YC status.
 */
export type BankingProvider = "bridge" | "yellowcard";
export type ProviderStatus = "incomplete" | "under_review" | "active" | "paused" | "rejected" | "closed";
export interface ProviderRelationship {
  merchantId: string;
  provider: BankingProvider;
  customerId: string;
  environment: "production";
  status: ProviderStatus;
  /** Persisted authenticated-provider evidence and internal approval, not request body fields. */
  controlsSatisfied: boolean;
}
export interface MerchantMigration {
  merchantId: string;
  accountType: "business" | "individual";
  selectedProvider: BankingProvider;
  globalProductsApproved: boolean;
  operatorCutoverApproved: boolean;
  merchantBlocked: boolean;
  relationships: ProviderRelationship[];
}
export function bankingAccess(migration: MerchantMigration) {
  if (migration.accountType !== "business" || migration.merchantBlocked) return { status: "restricted", provider: null, moneyMovement: false } as const;
  const relations = migration.relationships.filter((x) => x.merchantId === migration.merchantId && x.environment === "production" && x.provider === migration.selectedProvider);
  if (relations.length !== 1) return { status: "under_review", provider: null, moneyMovement: false } as const;
  const relation = relations[0];
  if (relation.provider === "yellowcard" && (!migration.globalProductsApproved || !migration.operatorCutoverApproved)) return { status: "under_review", provider: "yellowcard", moneyMovement: false } as const;
  return { status: relation.status, provider: relation.provider, moneyMovement: relation.status === "active" && relation.controlsSatisfied };
}
export function sourceProviderForPayment(migration: MerchantMigration, resource: { merchantId: string; provider: BankingProvider; providerResourceId: string; spendable: boolean }) {
  const access = bankingAccess(migration);
  if (!resource.providerResourceId || resource.merchantId !== migration.merchantId || resource.provider !== access.provider || !resource.spendable || !access.moneyMovement) throw new Error("Payment source is not available");
  return resource.provider;
}
export interface ResidualRecovery {
  merchantId: string;
  bridgeCustomerId: string;
  /** Provider balance retained in original currency as decimal strings. */
  balances: { currency: string; amount: string }[];
  recoveryStatus: "awaiting_hold" | "awaiting_approval" | "authorized" | "in_progress" | "reconciled";
  unresolvedTransferCount: number;
  unresolvedRecallCount: number;
  reconciledAt: string | null;
}
/** Zero balance alone is insufficient to remove the legacy integration. */
export function bridgeRetirementReady(input: { remainingBridgeRelationships: number; recoveries: ResidualRecovery[]; completeInventory: boolean; recordsArchived: boolean; operatorApproved: boolean }) {
  return input.completeInventory && input.recordsArchived && input.operatorApproved && input.remainingBridgeRelationships === 0
    && input.recoveries.every((r) => r.recoveryStatus === "reconciled" && !!r.reconciledAt && Number.isFinite(Date.parse(r.reconciledAt))
      && r.unresolvedTransferCount === 0 && r.unresolvedRecallCount === 0
      && r.balances.every((b) => /^[A-Z]{3,10}$/.test(b.currency) && /^0(?:\.0+)?$/.test(b.amount)));
}
