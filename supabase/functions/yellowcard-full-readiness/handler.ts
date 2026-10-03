import { YellowCardFullProductClient, YellowCardRequestError } from "../_shared/providers/yellowcard-full-product.ts";

/** Internal production READ audit only. No provider writes, database writes or merchant response data. */
export function readinessHandler(serviceKey: string, config: { apiKeyId: string; secret: string }, transport: typeof fetch = fetch) {
  return async (req: Request): Promise<Response> => {
    const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
    if (req.method !== "POST") return json({ error: "POST required" }, 405);
    const supplied = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!serviceKey || supplied.length > 8192 || supplied.length !== serviceKey.length) return json({ error: "Unauthorized" }, 401);
    const enc = new TextEncoder();
    const expected = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(serviceKey)));
    const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(supplied)));
    let mismatch = 0; for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ actual[i];
    if (mismatch) return json({ error: "Unauthorized" }, 401);
    if (!config.apiKeyId || !config.secret) return json({ configured: false, environment: "production", writes_enabled: false }, 503);
    // No caller-specified host, path, method, customer or key. Fixed GET inventory only.
    const client = new YellowCardFullProductClient({ ...config, environment: "production" }, transport);
    const probes: [string, () => Promise<unknown>][] = [
      ["custody_configuration", () => client.cryptoConfiguration()],
      ["bank_onboarding", () => client.bankOnboardings()],
      ["virtual_accounts", () => client.virtualAccounts()],
      ["fiat_wallets", () => client.subWallets()],
      ["vaults", () => client.vaults()],
      ["travel_rule", () => client.travelRuleConfiguration()],
    ];
    const results = [];
    // Bounded concurrency. A successful read is NOT approval to provision or transfer.
    for (let offset = 0; offset < probes.length; offset += 3) {
      results.push(...await Promise.all(probes.slice(offset, offset + 3).map(async ([product, run]) => {
        try { await run(); return { product, read_available: true, http_status: 200 }; }
        catch (e) { return { product, read_available: false, http_status: e instanceof YellowCardRequestError ? e.status : null }; }
      })));
    }
    return json({ environment: "production", configured: true, writes_enabled: false, ready_for_migration: false, checked_at: new Date().toISOString(), results });
  };
}
