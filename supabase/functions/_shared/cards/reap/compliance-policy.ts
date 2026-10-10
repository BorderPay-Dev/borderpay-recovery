/** Selected by BorderPay: Universal KYB through our own business onboarding UI.
 * REAP must enable UKYB for the programme; no fallback to a different product.
 */
export const compliancePolicy = Object.freeze({
  merchantType: "BUSINESS" as const,
  verificationMode: "UKYB" as const,
  sandboxCredential: "REAP_SANDBOX_COMPLIANCE_API_KEY" as const,
});
/** tenantId must come from the authenticated merchant binding, not form input.
 * Reuse this externalId across save/resume and reconciliation; never create a new
 * entity identifier merely because a provider response timed out.
 */
export function prepareBusinessEntity(tenantId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tenantId,
    )
  ) {
    throw new Error("A valid BorderPay merchant tenant ID is required.");
  }
  return {
    externalId: `borderpay:business:${tenantId.toLowerCase()}`,
    type: compliancePolicy.merchantType,
    verificationMode: compliancePolicy.verificationMode,
  };
}
