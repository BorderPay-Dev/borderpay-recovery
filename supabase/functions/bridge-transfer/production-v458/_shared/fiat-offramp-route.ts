/** Route compatibility verified against Bridge's published payment route matrix.
 * USDT -> EUR SEPA / GBP FPS is not listed; USDT -> USD is supported on
 * eligible rails. Do not remove or waive a fee to force an unsupported route.
 * https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes
 */
export function fiatOfframpRouteError(body: any): { code: string; error: string } | null {
  const sourceRail = String(body?.source?.payment_rail ?? "").trim().toLowerCase();
  const source = String(body?.source?.currency ?? "").trim().toUpperCase();
  const destination = String(body?.destination?.currency ?? "").trim().toUpperCase();
  const rail = String(body?.destination?.payment_rail ?? "").trim().toLowerCase();
  if (sourceRail !== "bridge_wallet" || !["USD", "EUR", "GBP"].includes(destination)) return null;
  if (source === "USDT" && ["EUR", "GBP"].includes(destination)) return {
    code: "unsupported_offramp_route",
    error: `Your USDT wallet cannot send directly to a ${destination} bank account. Select a funded USDC wallet for this bank payout, or use External wallet to send USDT on Tron.`,
  };
  const allowed: Record<string, string[]> = { USD: ["ach", "ach_same_day", "wire"], EUR: ["sepa"], GBP: ["faster_payments"] };
  if (body?.destination?.external_account_id && !allowed[destination].includes(rail)) return {
    code: "payout_rail_currency_mismatch",
    error: `The selected payment rail does not match the ${destination} bank account. Please select the bank account again.`,
  };
  return null;
}
