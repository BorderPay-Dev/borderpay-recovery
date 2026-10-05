import { bankingAccess, sourceProviderForPayment, bridgeRetirementReady, type MerchantMigration } from "../supabase/functions/_shared/providers/yellowcard-migration-policy.ts";
function assert(value: unknown): asserts value { if (!value) throw new Error("Assertion failed"); }
const migrated: MerchantMigration = { merchantId: "merchant-a", accountType: "business", selectedProvider: "yellowcard", globalProductsApproved: true, operatorCutoverApproved: true, merchantBlocked: false, relationships: [
  { merchantId: "merchant-a", provider: "bridge", customerId: "bridge-paused", environment: "production", status: "paused", controlsSatisfied: false },
  { merchantId: "merchant-a", provider: "yellowcard", customerId: "yc-active", environment: "production", status: "active", controlsSatisfied: true },
] };
Deno.test("YC active and Bridge paused remain independent for migrated businesses", () => {
  assert(bankingAccess(migrated).moneyMovement);
  assert(migrated.relationships[0].status === "paused");
  assert(sourceProviderForPayment(migrated, { merchantId: "merchant-a", provider: "yellowcard", providerResourceId: "yc-wallet", spendable: true }) === "yellowcard");
});
Deno.test("legacy balances cannot be spent or silently fail over through YC", () => {
  let denied = false;
  try { sourceProviderForPayment(migrated, { merchantId: "merchant-a", provider: "bridge", providerResourceId: "bridge-wallet", spendable: true }); } catch { denied = true; }
  assert(denied);
});
Deno.test("provider approval alone cannot authorize cutover or override merchant fraud restrictions", () => {
  assert(!bankingAccess({ ...migrated, operatorCutoverApproved: false }).moneyMovement);
  assert(!bankingAccess({ ...migrated, globalProductsApproved: false }).moneyMovement);
  assert(!bankingAccess({ ...migrated, merchantBlocked: true }).moneyMovement);
  assert(!bankingAccess({ ...migrated, accountType: "individual" }).moneyMovement);
});
Deno.test("existing active Bridge customers continue until their explicit cutover", () => {
  const existing = structuredClone(migrated); existing.selectedProvider = "bridge"; existing.globalProductsApproved = false; existing.operatorCutoverApproved = false;
  existing.relationships[0].status = "active"; existing.relationships[0].controlsSatisfied = true;
  assert(bankingAccess(existing).moneyMovement && bankingAccess(existing).provider === "bridge");
});
Deno.test("under-review YC never inherits Bridge approval", () => {
  const pending = structuredClone(migrated); pending.relationships[0].status = "active"; pending.relationships[1].status = "under_review";
  assert(!bankingAccess(pending).moneyMovement);
});
Deno.test("Bridge retirement requires reconciliation and explicit operator approval", () => {
  const input = { remainingBridgeRelationships: 0, recoveries: [], completeInventory: true, recordsArchived: true, operatorApproved: true };
  assert(bridgeRetirementReady(input));
  assert(!bridgeRetirementReady({ ...input, remainingBridgeRelationships: 1 }));
  assert(!bridgeRetirementReady({ ...input, operatorApproved: false }));
  assert(!bridgeRetirementReady({ ...input, completeInventory: false }));
  assert(!bridgeRetirementReady({ ...input, recoveries: [{ merchantId: "merchant-a", bridgeCustomerId: "old", balances: [{ currency: "USDC", amount: "0.000001" }], recoveryStatus: "reconciled", unresolvedTransferCount: 0, unresolvedRecallCount: 0, reconciledAt: "2026-10-03T12:00:00Z" }] }));
});
