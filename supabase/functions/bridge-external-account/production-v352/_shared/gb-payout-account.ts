/** GBP FPS uses six-digit sort codes and eight-digit account numbers.
 * https://apidocs.bridge.xyz/api-reference/external-accounts/create-a-new-external-account
 * Only remove accepted formatting, never silently remove arbitrary characters.
 */
export function normalizeGbBankAccount(account: unknown):
  { ok: true; account: { sort_code: string; account_number: string } } |
  { ok: false; error: string; code: string } {
  const a = account as { sort_code?: unknown; account_number?: unknown } | null;
  const sortCode = typeof a?.sort_code === "string" ? a.sort_code.replace(/[\s-]/g, "") : "";
  const number = typeof a?.account_number === "string" ? a.account_number.replace(/\s/g, "") : "";
  if (!/^\d{6}$/.test(sortCode)) return { ok: false, code: "invalid_sort_code",
    error: "Please enter a valid 6-digit UK sort code, for example 12-34-56." };
  if (!/^\d{8}$/.test(number)) return { ok: false, code: "invalid_account_number",
    error: "Please enter the full 8-digit UK bank account number, including any leading zeros." };
  return { ok: true, account: { sort_code: sortCode, account_number: number } };
}

/** Scope retry identity to the complete normalized request, not just last four digits.
 * Raw bank details never appear in the key. Identical retries remain idempotent.
 */
export async function externalAccountRequestKey(userId: string, body: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return `borderpay:extacct:v2:${userId}:${hash}`;
}
