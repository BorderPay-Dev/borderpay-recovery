/** Server-only full-product foundation. Deliberately not wired to live routes.
 * Official contracts and rollout dependencies: docs/integrations/yellowcard/.
 * Production mutation is prohibited in this version, regardless of credentials.
 */
export type YellowCardEnvironment = "sandbox" | "production";
const hosts = { sandbox: "https://sandbox.api.yellowcard.io", production: "https://api.yellowcard.io" };
const encoder = new TextEncoder();
const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
async function key(secret: string) {
  return await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function yellowCardSignature(secret: string, timestamp: string, path: string, method: string, body?: string) {
  let message = timestamp + path + method;
  if ((method === "POST" || method === "PUT") && body !== undefined) {
    message += base64(await crypto.subtle.digest("SHA-256", encoder.encode(body)));
  }
  return base64(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(message)));
}
/** Verify original bytes before parsing. Key lookup must use a configured key-ID allowlist. */
export async function verifyYellowCardSignature(raw: Uint8Array, signature: string, secret: string): Promise<boolean> {
  if (raw.byteLength > 1_048_576 || !/^[A-Za-z0-9+/]{43}=$/.test(signature) || !secret) return false;
  try {
    const bytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", await key(secret), bytes, new Uint8Array(raw));
  } catch { return false; }
}
export class YellowCardRequestError extends Error {
  constructor(public readonly status: number | null, public readonly outcomeUnknown: boolean) {
    super(outcomeUnknown ? "Provider outcome unknown; reconcile before retrying" : "Provider request rejected");
  }
}
function segment(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error("Invalid provider resource identifier");
  return value;
}
export interface FullProductConfig {
  environment: YellowCardEnvironment;
  apiKeyId: string;
  secret: string;
  /** Explicit sandbox fixture harness only; never enable with customer identity data. */
  sandboxWrites?: boolean;
  /** Existing server-configured production egress relay. Never accepted from an HTTP caller. */
  relay?: { url: string; token: string };
}
export class YellowCardFullProductClient {
  constructor(private readonly config: FullProductConfig, private readonly fetcher: typeof fetch = fetch) {
    if (!hosts[config.environment] || !config.apiKeyId || !config.secret) throw new Error("Provider configuration missing");
    if (config.relay) {
      const u = new URL(config.relay.url);
      if (config.environment !== "production" || u.protocol !== "https:" || u.username || u.password || u.hash || !config.relay.token) throw new Error("Invalid provider relay configuration");
    }
  }
  private async request(method: "GET" | "POST", path: string, payload?: unknown, query?: Record<string, string>) {
    if (!path.startsWith("/business/") || /[?#\\]/.test(path) || path.includes("..")) throw new Error("Invalid provider path");
    const mutation = method !== "GET";
    if (mutation && (this.config.environment !== "sandbox" || !this.config.sandboxWrites)) throw new Error("Full-product writes are disabled");
    const url = new URL(path, hosts[this.config.environment]);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const signature = await yellowCardSignature(this.config.secret, timestamp, url.pathname, method, body);
    let response: Response;
    try {
      const auth = `YcHmacV1 ${this.config.apiKeyId}:${signature}`;
      const relay = this.config.relay;
      response = await this.fetcher(relay ? relay.url : url, { method: relay ? "POST" : method,
        body: relay ? JSON.stringify({ method, path: path.slice("/business".length), query: query ?? {}, ...(payload === undefined ? {} : { body: payload }), timeout_ms: 8000 }) : body,
        redirect: "error", signal: AbortSignal.timeout(10000), headers: relay ? {
          Authorization: `Bearer ${relay.token}`, "Content-Type": "application/json", "Accept": "application/json",
          "X-BorderPay-YC-Authorization": auth, "X-BorderPay-YC-Timestamp": timestamp,
        } : { "X-YC-Timestamp": timestamp, Authorization: auth, "Content-Type": "application/json" },
      });
    } catch { throw new YellowCardRequestError(null, mutation); }
    // Do not leak provider bodies, request payloads, signatures or credentials to logs/UI.
    if (!response.ok) {
      await response.body?.cancel();
      throw new YellowCardRequestError(response.status, mutation && (response.status >= 500 || response.status === 408));
    }
    try { return await response.json() as unknown; }
    catch { throw new YellowCardRequestError(response.status, mutation); }
  }
  cryptoConfiguration() { return this.request("GET", "/business/vaults/config"); }
  bankOnboardings() { return this.request("GET", "/business/virtual-bank/onboarding"); }
  travelRuleConfiguration() { return this.request("GET", "/business/travel-rule/config"); }
  vaults(query?: Record<string, string>) { return this.request("GET", "/business/vaults", undefined, query); }
  vault(id: string) { return this.request("GET", `/business/vaults/${segment(id)}`); }
  subWallets(query?: Record<string, string>) { return this.request("GET", "/business/sub-wallets", undefined, query); }
  virtualAccounts(query?: Record<string, string>) { return this.request("GET", "/business/virtual-accounts", undefined, query); }
  virtualAccount(id: string) { return this.request("GET", `/business/virtual-accounts/lookup/${segment(id)}`); }
  reconciliation(query?: Record<string, string>) { return this.request("GET", "/business/recon", undefined, query); }
  createSandboxVault(name: string) {
    if (name.length < 2 || name.length > 255) throw new Error("Invalid vault name");
    // Vault creation has no documented sequenceId. An ambiguous outcome MUST be reconciled; no retry here.
    return this.request("POST", "/business/vaults", { name });
  }
  createSandboxSubWallet(input: { name: string; sequenceId: string; currency: string; createVirtualAccount: boolean }) {
    if (input.name.length < 2 || input.name.length > 255 || !input.sequenceId || !/^[A-Z]{3}$/.test(input.currency)) throw new Error("Invalid sub-wallet request");
    // Do not reject EUR/GBP based on stale enum lists. Provider entitlement remains authoritative.
    return this.request("POST", "/business/sub-wallets", input);
  }
  generateSandboxAddress(vaultId: string, token: string) {
    if (!/^[A-Z0-9_]{2,64}$/.test(token)) throw new Error("Invalid custody token");
    return this.request("POST", "/business/addresses", { vaultId: segment(vaultId), token });
  }
}

/** Server-side binding retrieved from trusted storage, never inferred from webhook userId/metadata. */
export interface YellowCardResourceBinding {
  environment: YellowCardEnvironment;
  merchantId: string;
  resourceId: string;
  kind: "vault" | "sub_wallet" | "virtual_account";
}
export function requireYellowCardBinding(binding: YellowCardResourceBinding | null, expected: YellowCardResourceBinding) {
  if (!binding || Object.keys(expected).some((k) => binding[k as keyof YellowCardResourceBinding] !== expected[k as keyof YellowCardResourceBinding])) throw new Error("Provider resource access denied");
  return binding;
}

/** Raw webhook IDs can be account IDs reused across transitions. Keep all distinct signed events.
 * Persistence must provide a unique key and processing lease; this function alone is not replay protection.
 * Webhooks are reconcile triggers, NEVER balance-credit instructions.
 */
export async function yellowCardEventFingerprint(environment: YellowCardEnvironment, raw: Uint8Array) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(raw)));
  return `${environment}:${Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export function normalizeYellowCardVirtualAccountStatus(status: unknown): "pending" | "active" | "frozen" | "closed" | "unknown" {
  switch (status) {
    case "PENDING": return "pending";
    case "ACTIVE": return "active";
    case "FROZEN": return "frozen";
    case "CLOSED": return "closed";
    default: return "unknown";
  }
}
