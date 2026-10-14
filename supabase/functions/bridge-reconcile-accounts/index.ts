import { normalizeBridgeVaStatus as normalizeStatus } from "../_shared/maintenance-access-policy.ts";
// bridge-reconcile-accounts
// Service-only Bridge -> Supabase projection repair for existing customers.
// Reads Bridge wallets / virtual accounts and upserts local read-model rows.
// No money movement, no customer creation, no emails.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { bridgeProvider } from "../_shared/providers/bridge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const RECONCILE_TOKEN = Deno.env.get("BRIDGE_RECONCILE_TOKEN") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Owner = {
  user_id: string;
  account_type: "individual" | "business";
  bridge_customer_id: string;
};

function timingSafeEqualStr(a: string, b: string): boolean {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa[i] ^ bb[i];
  return out === 0;
}

function isAuthorized(authHeader: string | null): boolean {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  return timingSafeEqualStr(token, SERVICE_ROLE) ||
    timingSafeEqualStr(token, ADMIN_SECRET) ||
    timingSafeEqualStr(token, RECONCILE_TOKEN);
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeRail(value: unknown): string | null {
  const rail = clean(value).toLowerCase();
  if (!rail) return null;
  if (rail === "ach") return "ach_push";
  if (["ach_push", "ach_pull", "wire", "sepa", "faster_payments"].includes(rail)) return rail;
  return null;
}



function normalizeFee(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Number(n.toFixed(4));
}

function isKnownNonLiveCustomer(customerId: string): boolean {
  return customerId.startsWith("demo_") || customerId.includes("demo_bridge_customer");
}

function isInaccessibleBridgeCustomerError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\[(401|404)\]/.test(message);
}

function ownerCols(owner: Owner): Record<string, string | null> {
  return owner.account_type === "business"
    ? { user_id: owner.user_id, business_user_id: owner.user_id }
    : { user_id: owner.user_id, business_user_id: null };
}

async function loadOwners(params: {
  limit: number;
  offset: number;
  userIds: string[];
  emails: string[];
}): Promise<Owner[]> {
  const end = params.offset + params.limit - 1;
  let profileQuery = supabase
    .from("user_profiles")
    .select("id,email,account_type,bridge_customer_id,is_admin")
    .not("bridge_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .range(params.offset, end);

  if (params.userIds.length > 0) profileQuery = profileQuery.in("id", params.userIds);
  if (params.emails.length > 0) profileQuery = profileQuery.in("email", params.emails);

  const { data: profiles, error: profileErr } = await profileQuery;
  if (profileErr) throw new Error(`owner profile query failed: ${profileErr.message}`);

  const owners = new Map<string, Owner>();
  const profileUserIds = new Set<string>();
  for (const p of profiles || []) {
    const userId = clean((p as any).id);
    const customerId = clean((p as any).bridge_customer_id);
    if (userId) profileUserIds.add(userId);
    if (!userId || !customerId || (p as any).is_admin === true) continue;
    const accountType = (p as any).account_type === "business" ? "business" : "individual";
    owners.set(`${userId}:${customerId}`, {
      user_id: userId,
      account_type: accountType,
      bridge_customer_id: customerId,
    });
  }

  let bizQuery = supabase
    .from("business_profiles")
    .select("user_id,bridge_customer_id")
    .not("bridge_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .range(params.offset, end);
  if (params.userIds.length > 0) bizQuery = bizQuery.in("user_id", params.userIds);
  if (params.userIds.length === 0 && params.emails.length > 0) {
    const ids = Array.from(profileUserIds);
    if (ids.length === 0) return Array.from(owners.values()).slice(0, params.limit);
    bizQuery = bizQuery.in("user_id", ids);
  }

  const { data: businesses, error: bizErr } = await bizQuery;
  if (bizErr) throw new Error(`business owner query failed: ${bizErr.message}`);

  for (const b of businesses || []) {
    const userId = clean((b as any).user_id);
    const customerId = clean((b as any).bridge_customer_id);
    if (!userId || !customerId) continue;
    owners.set(`${userId}:${customerId}`, {
      user_id: userId,
      account_type: "business",
      bridge_customer_id: customerId,
    });
  }

  return Array.from(owners.values()).slice(0, params.limit);
}

async function reconcileOwner(owner: Owner, dryRun: boolean, closeMissing: boolean, includeWallets: boolean) {
  const result = {
    user_id: owner.user_id,
    account_type: owner.account_type,
    bridge_customer_id: owner.bridge_customer_id,
    wallets_seen: 0,
    wallets_upserted: 0,
    virtual_accounts_seen: 0,
    virtual_accounts_upserted: 0,
    virtual_accounts_closed_missing: 0,
    virtual_accounts: [] as Array<{
      bridge_virtual_account_id: string;
      currency: string;
      rail: string | null;
      status: "active" | "suspended" | "closed" | "deactivated";
      developer_fee_percent: number | null;
    }>,
    warnings: [] as string[],
    errors: [] as string[],
  };

  if (isKnownNonLiveCustomer(owner.bridge_customer_id)) {
    result.warnings.push("known_non_live_bridge_customer_skipped");
    return result;
  }

  if (includeWallets) {
    try {
      const wallets = await bridgeProvider.listWallets(owner.bridge_customer_id);
      result.wallets_seen = wallets.length;
      for (const w of wallets) {
        if (!w.wallet_id) continue;
        if (!dryRun) {
          const { error } = await supabase.from("bridge_wallets").upsert({
            ...ownerCols(owner),
            bridge_customer_id: owner.bridge_customer_id,
            bridge_wallet_id: clean(w.wallet_id),
            currency: clean(w.currency).toUpperCase() || (clean(w.chain).toLowerCase() === "tron" ? "USDT" : "USDC"),
            chain: clean(w.chain).toLowerCase(),
            address: clean(w.address),
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "bridge_wallet_id", ignoreDuplicates: false });
          if (error) throw new Error(`wallet ${w.wallet_id}: ${error.message}`);
        }
        result.wallets_upserted += 1;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (isInaccessibleBridgeCustomerError(e)) {
        result.warnings.push(`wallets_inaccessible: ${message}`);
      } else {
        result.errors.push(`wallets: ${message}`);
      }
    }
  }

  try {
    const virtualAccounts = await bridgeProvider.listVirtualAccounts(owner.bridge_customer_id);
    const remoteVaIds = new Set<string>();
    result.virtual_accounts_seen = virtualAccounts.length;
    for (const v of virtualAccounts) {
      if (!v.virtual_account_id) continue;
      remoteVaIds.add(clean(v.virtual_account_id));
      const details = (v.account_details && typeof v.account_details === "object")
        ? v.account_details as Record<string, unknown>
        : {};
      const sourceInstructions =
        details.source_deposit_instructions && typeof details.source_deposit_instructions === "object"
          ? details.source_deposit_instructions as Record<string, unknown>
          : details;
      const currency = clean((sourceInstructions as any).currency || v.currency).toUpperCase();
      if (!["USD", "EUR", "GBP"].includes(currency)) {
        result.errors.push(`virtual_account ${v.virtual_account_id}: unsupported currency ${currency || "unknown"}`);
        continue;
      }
      const fee = normalizeFee(v.developer_fee_percent ?? (details as any).developer_fee_percent);
      const rail = normalizeRail((sourceInstructions as any).payment_rail ?? v.rail);
      const status = normalizeStatus(v.status);
      result.virtual_accounts.push({
        bridge_virtual_account_id: clean(v.virtual_account_id),
        currency,
        rail,
        status,
        developer_fee_percent: fee,
      });
      if (!dryRun) {
        const { error } = await supabase.from("bridge_virtual_accounts").upsert({
          ...ownerCols(owner),
          bridge_customer_id: owner.bridge_customer_id,
          bridge_virtual_account_id: clean(v.virtual_account_id),
          currency,
          rail,
          account_details: {
            ...details,
            source_deposit_instructions: sourceInstructions,
            reconciled_from_bridge_at: new Date().toISOString(),
          },
          status,
          ...(fee !== null ? { developer_fee_percent: fee } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: "bridge_virtual_account_id", ignoreDuplicates: false });
        if (error) throw new Error(`virtual_account ${v.virtual_account_id}: ${error.message}`);
      }
      result.virtual_accounts_upserted += 1;
    }

    if (closeMissing) {
      const { data: localRows, error: localErr } = await supabase
        .from("bridge_virtual_accounts")
        .select("bridge_virtual_account_id,status,account_details")
        .eq("bridge_customer_id", owner.bridge_customer_id);
      if (localErr) throw new Error(`local virtual account query: ${localErr.message}`);

      for (const row of localRows || []) {
        const localId = clean((row as any).bridge_virtual_account_id);
        const localStatus = normalizeStatus((row as any).status);
        if (!localId || remoteVaIds.has(localId) || localStatus === "closed") continue;
        result.virtual_accounts_closed_missing += 1;
        if (dryRun) continue;
        const existingDetails = ((row as any).account_details && typeof (row as any).account_details === "object")
          ? (row as any).account_details as Record<string, unknown>
          : {};
        const { error } = await supabase
          .from("bridge_virtual_accounts")
          .update({
            status: "closed",
            account_details: {
              ...existingDetails,
              bridge_reconcile_missing_from_provider: true,
              reconciled_from_bridge_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("bridge_virtual_account_id", localId);
        if (error) throw new Error(`close_missing virtual_account ${localId}: ${error.message}`);
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isInaccessibleBridgeCustomerError(e)) {
      result.warnings.push(`virtual_accounts_inaccessible: ${message}`);
    } else {
      result.errors.push(`virtual_accounts: ${message}`);
    }
  }

  return result;
}

async function loadLocalProjectionCounts(customerIds: string[]) {
  const ids = Array.from(new Set(customerIds.map(clean).filter(Boolean))).slice(0, 500);
  if (ids.length === 0) return { bridge_wallet_rows: 0, bridge_virtual_account_rows: 0 };
  const [{ count: walletCount }, { count: vaCount }] = await Promise.all([
    supabase
      .from("bridge_wallets")
      .select("id", { count: "exact", head: true })
      .in("bridge_customer_id", ids),
    supabase
      .from("bridge_virtual_accounts")
      .select("id", { count: "exact", head: true })
      .in("bridge_customer_id", ids),
  ]);
  return {
    bridge_wallet_rows: walletCount ?? 0,
    bridge_virtual_account_rows: vaCount ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ success: false, error: "POST only" }, 405);
  if (!isAuthorized(req.headers.get("Authorization"))) {
    return json({ success: false, code: "unauthorized", error: "Unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }

  const limit = Math.max(1, Math.min(50, Number(body.limit ?? 20)));
  const offset = Math.max(0, Number(body.offset ?? 0));
  const dryRun = body.dry_run !== false;
  const closeMissing = body.close_missing === true;
  const includeWallets = body.include_wallets === true;
  const userIds = Array.isArray(body.user_ids) ? body.user_ids.map(clean).filter(Boolean) : [];
  const emails = Array.isArray(body.emails) ? body.emails.map((v: unknown) => clean(v).toLowerCase()).filter(Boolean) : [];

  const owners = await loadOwners({ limit, offset, userIds, emails });
  const results = [];
  for (const owner of owners) {
    results.push(await reconcileOwner(owner, dryRun, closeMissing, includeWallets));
  }

  const summary = results.reduce((acc, r) => {
    acc.wallets_seen += r.wallets_seen;
    acc.wallets_upserted += r.wallets_upserted;
    acc.virtual_accounts_seen += r.virtual_accounts_seen;
    acc.virtual_accounts_upserted += r.virtual_accounts_upserted;
    acc.virtual_accounts_closed_missing += r.virtual_accounts_closed_missing;
    acc.warning_count += r.warnings.length;
    acc.error_count += r.errors.length;
    return acc;
  }, {
    owners: owners.length,
    wallets_seen: 0,
    wallets_upserted: 0,
    virtual_accounts_seen: 0,
    virtual_accounts_upserted: 0,
    virtual_accounts_closed_missing: 0,
    warning_count: 0,
    error_count: 0,
    dry_run: dryRun,
    close_missing: closeMissing,
    include_wallets: includeWallets,
    offset,
    limit,
  });
  const local_projection = await loadLocalProjectionCounts(owners.map((owner) => owner.bridge_customer_id));

  return json({ success: summary.error_count === 0, code: "bridge_reconcile_completed", summary: { ...summary, local_projection }, results });
});
