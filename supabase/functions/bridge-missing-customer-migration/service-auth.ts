import { exactServiceCredential } from "./policy.ts";

/** Accept a current project service credential when the runtime's legacy key differs.
 * Unverified JWT claims only prefilter requests. Supabase Auth authorizes the key.
 * Never log the credential or the administrative response body.
 */
export async function authorizeRepairService(token: string, runtimeKey: string, supabaseUrl: string, transport: typeof fetch = fetch): Promise<boolean> {
  if (exactServiceCredential(token, runtimeKey)) return true;
  if (!token || !supabaseUrl) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "service_role") return false;
    const response = await transport(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/admin/users?page=1&per_page=1`, {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${token}`, apikey: token },
    });
    // This endpoint requires a cryptographically authenticated service role.
    // Discard user data; its contents never become part of the caller response.
    if (!response.ok) { await response.body?.cancel(); return false; }
    const result = await response.json();
    return Array.isArray(result.users);
  } catch { return false; }
}
