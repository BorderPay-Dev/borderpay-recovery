import { partnerMemberships } from "../_shared/partner-customer-policy.ts";
import { migrationNoticeEligible, migrationPriority } from "./migration-audience.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEND_EMAIL_TOKEN = Deno.env.get("SEND_EMAIL_INTERNAL_TOKEN") ?? "";
const BREVO_KEY = Deno.env.get("BREVO_API_KEY") ?? Deno.env.get("BREVO_API_KEYS") ?? "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_BROADCAST_INTERNAL_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type BroadcastCampaign =
  | "business_activity_update"
  | "business_migration_notice"
  | "banking_transition_active"
  | "banking_transition_restricted"
  | "invoice_contract_hub"
  | "mobile_app_update"
  | "founder_welcome"
  | "request_account_reminder"
  | "virtual_account_limits"
  | "affiliate_program"
  | "stablecoin_free_announcement"
  | "african_rails_live"
  | "eea_sca_activation_reminder"
  | "account_suspended"
  | "scheduled_maintenance"
  | "verification_reminder"
  | "pin_reset_link";

const TEMPLATE_ALLOWLIST = new Set<string>([
  "business.invoice_contract_hub",
  "account.eea_sca_activation_reminder",
  "individual.email_verification",
  "individual.password_reset",
  "individual.transaction_notification",
  "individual.kyc_decision",
  "individual.account_ready",
  "individual.verification_authorized",
  "individual.verification_reminder",
  "individual.payment_received",
  "individual.founder_welcome",
  "individual.request_account_reminder",
  "individual.account_suspended",
  "individual.scheduled_maintenance",
  "individual.pin_reset_link",
  "individual.virtual_account_limits",
  "individual.affiliate_program",
  "individual.stablecoin_free_announcement",
  "individual.usd_account_operational",
  "individual.app_store_announcement",
  "individual.mobile_app_update",
  "individual.african_rails_live",
  "business.email_verification",
  "business.kyb_submitted",
  "business.kyb_decision",
  "business.transaction_notification",
  "business.account_activated",
  "business.account_ready",
  "business.verification_authorized",
  "business.verification_reminder",
  "business.payment_received",
  "business.founder_welcome",
  "business.request_account_reminder",
  "business.account_suspended",
  "business.scheduled_maintenance",
  "business.pin_reset_link",
  "business.virtual_account_limits",
  "business.affiliate_program",
  "business.stablecoin_free_announcement",
  "business.usd_account_operational",
  "business.app_store_announcement",
  "business.mobile_app_update",
  "business.african_rails_live",
]);

const EEA_30_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU",
  "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

function resolveCampaignTemplate(campaign: BroadcastCampaign, accountType: string): string {
  if (campaign === "eea_sca_activation_reminder") return "account.eea_sca_activation_reminder";
  if (campaign === "invoice_contract_hub") return "business.invoice_contract_hub";
  const at = String(accountType || "individual").toLowerCase() === "business" ? "business" : "individual";
  if (isTransitionCampaign(campaign)) return `business.${campaign}`;
  if (campaign === "mobile_app_update") return `${at}.mobile_app_update`;
  if (campaign === "founder_welcome") return `${at}.founder_welcome`;
  if (campaign === "request_account_reminder") return `${at}.request_account_reminder`;
  if (campaign === "virtual_account_limits") return `${at}.virtual_account_limits`;
  if (campaign === "affiliate_program") return `${at}.affiliate_program`;
  if (campaign === "stablecoin_free_announcement") return `${at}.stablecoin_free_announcement`;
  if (campaign === "african_rails_live") return `${at}.african_rails_live`;
  if (campaign === "account_suspended") return `${at}.account_suspended`;
  if (campaign === "scheduled_maintenance") return `${at}.scheduled_maintenance`;
  if (campaign === "pin_reset_link") return `${at}.pin_reset_link`;
  return `${at}.verification_reminder`;
}

function clampInt(input: unknown, min: number, max: number, fallback: number): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

type AdminVerificationStatus =
  | "not_started"
  | "active"
  | "awaiting_rfi"
  | "needs_edd"
  | "needs_ubos"
  | "incomplete"
  | "offboarded"
  | "paused"
  | "rejected"
  | "under_review";

function normalizeVerificationStatus(raw: unknown): AdminVerificationStatus {
  const s = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["approved", "active", "authorized", "verified", "completed", "complete", "accepted", "full_enrollment", "passed"].includes(s)) return "active";
  if (["awaiting_rfi", "rfi", "request_for_information", "needs_rfi"].includes(s)) return "awaiting_rfi";
  if (["needs_edd", "edd", "enhanced_due_diligence"].includes(s)) return "needs_edd";
  if (["needs_ubos", "needs_ubo", "awaiting_ubo", "awaiting_ubos", "ubo_required", "ubo_followup"].includes(s)) return "needs_ubos";
  if (["incomplete", "pending", "submitted", "in_progress", "tier_1", "awaiting_questionnaire"].includes(s)) return "incomplete";
  if (["offboarded", "offboard", "terminated", "closed"].includes(s)) return "offboarded";
  if (["paused", "suspended", "blocked", "frozen", "deactivated", "inactive"].includes(s)) return "paused";
  if (["rejected", "failed", "declined", "denied", "not_approved"].includes(s)) return "rejected";
  if (["under_review", "review_pending", "manual_review", "in_review", "review"].includes(s)) return "under_review";
  if (s === "not_started") return "not_started";
  return "under_review";
}

function isBlockedVerificationStatus(status: unknown): boolean {
  return ["paused", "offboarded", "rejected"].includes(normalizeVerificationStatus(status));
}

function deriveVerificationStatus(input: {
  account_type?: unknown;
  bridge_customer_id?: unknown;
  bridge_kyc_status?: unknown;
  bridge_kyb_status?: unknown;
  bridge_account_status?: unknown;
}): AdminVerificationStatus {
  if (!String(input.bridge_customer_id || "").trim()) return "not_started";
  const account = normalizeVerificationStatus(input.bridge_account_status);
  if (account === "paused" || account === "offboarded") return account;
  const isBusiness = String(input.account_type || "").toLowerCase() === "business";
  const primary = normalizeVerificationStatus(isBusiness ? input.bridge_kyb_status : input.bridge_kyc_status);
  if (primary !== "not_started") return primary;
  return account !== "not_started" ? account : "incomplete";
}


type TransitionStatus = "active" | "frozen" | "paused" | "suspended" | "rejected" | "offboarded";
function isTransitionCampaign(campaign: unknown): boolean {
  return campaign === "business_activity_update" || campaign === "business_migration_notice" || campaign === "banking_transition_active" || campaign === "banking_transition_restricted";
}
function transitionStatus(profile: Record<string, unknown>, business?: Record<string, unknown>): TransitionStatus | null {
  if (String(profile.account_type || "").toLowerCase() !== "business") return null;
  // Account restrictions take precedence over an earlier KYB approval.
  for (const raw of [profile.account_status, profile.bridge_account_status, business?.bridge_kyb_status]) {
    const normalized = normalizeVerificationStatus(raw);
    if (normalized === "paused") {
      const value = String(raw || "").toLowerCase();
      return value === "frozen" ? "frozen" : value === "suspended" ? "suspended" : "paused";
    }
    if (normalized === "rejected" || normalized === "offboarded") return normalized;
  }
  const verified = deriveVerificationStatus({
    ...profile, bridge_customer_id: business?.bridge_customer_id || profile.bridge_customer_id,
    bridge_kyb_status: business?.bridge_kyb_status,
  });
  return verified === "active" && normalizeVerificationStatus(profile.bridge_account_status) === "active" ? "active" : null;
}
function transitionEligible(campaign: unknown, profile: Record<string, unknown>, business?: Record<string, unknown>): boolean {
  if (campaign === "business_migration_notice" || campaign === "business_activity_update") return migrationNoticeEligible(profile);
  const status = transitionStatus(profile, business);
  return campaign === "banking_transition_active" ? status === "active"
    : campaign === "banking_transition_restricted" && status !== null && status !== "active";
}

function isUnlockedVerificationStatus(status: unknown): boolean {
  return normalizeVerificationStatus(status) === "active";
}

async function loadConfirmedAuthUserIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Auth recipient check failed: ${error.message}`);
    const users = data?.users || [];
    for (const user of users) {
      if (user.email_confirmed_at) ids.add(user.id);
    }
    if (users.length < 1000) break;
  }
  return ids;
}

type VaLimitRow = {
  currency: string;
  rail: string;
  account_label: string;
  minimum: string;
  maximum: string;
  accepted_payments: string;
  important_note: string;
};

function normalizeVaRail(currency: string, raw: unknown): string {
  const rail = String(raw || "").trim().toLowerCase();
  if (rail) {
    if (rail === "ach") return "ACH";
    if (rail === "ach_push") return "ACH / Wire / FedNow";
    if (rail === "sepa") return "SEPA";
    if (rail === "faster_payments") return "Faster Payments";
    return rail.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (currency === "USD") return "ACH / Wire / FedNow";
  if (currency === "EUR") return "SEPA";
  if (currency === "GBP") return "Faster Payments";
  return "Bank transfer";
}

function vaLimitDetails(currency: string, rail: string): Omit<VaLimitRow, "currency" | "rail" | "account_label"> {
  if (currency === "USD") {
    return {
      minimum: "No published minimum",
      maximum: "No published standard maximum",
      accepted_payments: "Own-account payments, business payments, payroll, family payments with the same surname, and eligible person-to-person payments under $4,000.",
      important_note: "USD person-to-person payments must stay under $4,000 and are not supported from New York or Texas.",
    };
  }
  if (currency === "EUR") {
    return {
      minimum: "No published minimum",
      maximum: "No published standard maximum. Payments over EUR 1,000,000 use SEPA Credit and may take 1 business day.",
      accepted_payments: "Own-account payments and business payments are supported. Contact BorderPay before receiving EUR SEPA from an individual.",
      important_note: "Individual third-party EUR SEPA payments need support review before use. Contact us first to avoid a preventable refund.",
    };
  }
  if (currency === "GBP") {
    return {
      minimum: "No published minimum",
      maximum: "No published standard maximum. Payments over GBP 1,000,000 use BACS and may take 3 business days.",
      accepted_payments: "Own-account payments and business payments are supported.",
      important_note: "GBP does not support incoming payments from individuals. Use GBP for company, employer, platform, or client business payments only.",
    };
  }
  return {
    minimum: "Shown in your account",
    maximum: "Shown in your account",
    accepted_payments: "Supported payments depend on the account currency and rail.",
    important_note: "Contact support before receiving a large payment.",
  };
}

async function loadActiveVirtualAccountLimits(userIds: string[]) {
  const ids = Array.from(new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (ids.length === 0) return new Map<string, VaLimitRow[]>();
  const { data, error } = await supabase
    .from("bridge_virtual_accounts")
    .select("user_id,business_user_id,currency,rail,status,account_details")
    .in("user_id", ids)
    .eq("status", "active")
    .order("currency", { ascending: true });
  if (error) throw new Error(`active virtual account query failed: ${error.message}`);

  const byUser = new Map<string, VaLimitRow[]>();
  for (const row of data || []) {
    const userId = String((row as Record<string, unknown>).user_id || (row as Record<string, unknown>).business_user_id || "");
    const currency = String((row as Record<string, unknown>).currency || "").toUpperCase();
    if (!userId || !["USD", "EUR", "GBP"].includes(currency)) continue;
    const accountDetails = ((row as Record<string, unknown>).account_details && typeof (row as Record<string, unknown>).account_details === "object")
      ? (row as Record<string, unknown>).account_details as Record<string, unknown>
      : {};
    const source = accountDetails.source_deposit_instructions && typeof accountDetails.source_deposit_instructions === "object"
      ? accountDetails.source_deposit_instructions as Record<string, unknown>
      : {};
    const rail = normalizeVaRail(currency, (row as Record<string, unknown>).rail || source.payment_rail || (Array.isArray(source.payment_rails) ? source.payment_rails[0] : ""));
    const labelParts = [currency, rail].filter(Boolean);
    const limits = vaLimitDetails(currency, rail);
    const next = byUser.get(userId) || [];
    next.push({
      currency,
      rail,
      account_label: labelParts.join(" - "),
      ...limits,
    });
    byUser.set(userId, next);
  }
  return byUser;
}

async function loadBusinessRowsByUser(userIds: string[]) {
  const ids = Array.from(new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (ids.length === 0) return new Map<string, Record<string, unknown>>();
  const { data } = await supabase
    .from("business_profiles")
    .select("user_id,company_name,bridge_customer_id,bridge_kyb_status,country,metadata")
    .in("user_id", ids);
  return new Map((data || []).map((row: Record<string, unknown>) => [String(row.user_id || ""), row]));
}

async function sendEmailWithRetry(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  let lastError = "send-email failed";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SEND_EMAIL_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    const sendJson = await res.json().catch(() => ({}));
    if (res.ok && sendJson?.success && sendJson?.data?.status === "sent") return { ok: true };
    if (sendJson?.data?.status === "suppressed") return {ok:false,error:"partner_managed: delivery suppressed"};
    lastError = String((sendJson as Record<string, unknown>)?.error || `send-email HTTP ${res.status}`);
    if (res.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
  }
  // Template enforcement: broadcast must only send through the shared
  // send-email renderer so all campaigns use the same branded templates.
  return { ok: false, error: lastError };
}

async function migrationCapacity() {
  if (!BREVO_KEY) throw new Error("Brevo quota cannot be verified; campaign remains pending.");
  const headers = { "api-key": BREVO_KEY, accept: "application/json" };
  const day = new Date().toISOString().slice(0, 10);
  const [accountResponse, statsResponse] = await Promise.all([
    fetch("https://api.brevo.com/v3/account", { headers, signal: AbortSignal.timeout(10000) }),
    fetch(`https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${day}&endDate=${day}`, { headers, signal: AbortSignal.timeout(10000) }),
  ]);
  if (!accountResponse.ok || !statsResponse.ok) throw new Error("Brevo quota check unavailable; campaign remains pending.");
  const account = await accountResponse.json(); const stats = await statsResponse.json();
  const providerReported = Number(stats.requests);
  if (!Number.isFinite(providerReported) || providerReported < 0) throw new Error("Brevo usage is unavailable; campaign remains pending.");
  // Provider statistics are eventually consistent. Also count our durable
  // attempts/sends so a stale provider report cannot replenish campaign quota.
  const dayStart = `${day}T00:00:00.000Z`;
  const {count: localCount, error: localError} = await supabase.from("email_log")
    .select("id", {count:"exact", head:true})
    .or(`created_at.gte.${dayStart},sent_at.gte.${dayStart}`);
  if (localError || typeof localCount !== "number" || !Number.isFinite(localCount) || localCount < 0)
    throw new Error("Local email usage cannot be verified; campaign remains pending.");
  const used = Math.max(providerReported, localCount);
  const plans = (account.plan || []).filter((p: Record<string, unknown>) => ["free", "subscription", "payAsYouGo"].includes(String(p.type)));
  const credits = plans.map((p: Record<string, unknown>) => Number(p.credits)).filter((n: number) => Number.isFinite(n) && n >= 0);
  // Conservative 300/day ceiling and 20-message headroom for security/payment emails.
  const remaining = Math.max(0, Math.min(300 - used, ...(credits.length ? credits : [300])) - 20);
  return { day, daily_ceiling: 300, used, provider_reported_used: providerReported, local_recorded: localCount, reserved_for_transactional: 20, remaining: Math.floor(remaining), max_batch: 30 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  let runnerBody: Record<string, unknown> = {};
  const serviceCaller = !!SUPABASE_SERVICE_ROLE && token === SUPABASE_SERVICE_ROLE;
  if (serviceCaller) {
    try { runnerBody = await req.clone().json(); } catch { return json({error:"invalid json"},400); }
  }
  const migrationRunner = serviceCaller && (
    runnerBody.action === "migration_capacity" ||
    (["list_recipients", "send_campaign"].includes(String(runnerBody.action)) && ["business_migration_notice", "business_activity_update"].includes(String(runnerBody.campaign)))
  );
  let authorized = migrationRunner;

  if (ADMIN_TOKEN && token === ADMIN_TOKEN) {
    authorized = true;
  }

  if (!authorized && token) {
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    const callerUserId = authData?.user?.id || "";
    const callerEmail = String(authData?.user?.email || "").trim().toLowerCase();
    if (!authErr && callerUserId) {
      const byUserId = await supabase
        .from("admin_users")
        .select("user_id, is_active, role")
        .eq("user_id", callerUserId)
        .maybeSingle();
      if (byUserId.data?.user_id) {
        const role = String(byUserId.data.role || "").toLowerCase();
        const active = byUserId.data.is_active !== false;
        if (active && (!role || ["admin", "super_admin", "support_admin", "support", "operations", "operations_admin"].includes(role))) {
          authorized = true;
        }
      }

      if (!authorized) {
        const byLegacyId = await supabase
          .from("admin_users")
          .select("id")
          .eq("id", callerUserId)
          .maybeSingle();
        if (byLegacyId.data?.id) authorized = true;
      }

      // Fallback for legacy admins keyed in user_profiles.
      if (!authorized) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id,is_admin")
          .eq("id", callerUserId)
          .maybeSingle();
        if (profile?.is_admin === true) authorized = true;
      }

      // Internal support/operator email fallback for safe admin tooling.
      if (!authorized && callerEmail) {
        if (
          callerEmail.endsWith("@borderpayafrica.com") ||
          callerEmail.endsWith("@borderpay.africa")
        ) {
          authorized = true;
        }
      }
    }
  }

  if (!authorized) {
    return json({ success: false, error: "Unauthorized — admin access required" }, 401);
  }
  if (!SEND_EMAIL_TOKEN) {
    return json({ success: false, error: "SEND_EMAIL_INTERNAL_TOKEN missing" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid json" }, 400);
  }

  const action = String(body.action || "");
  if (action === "migration_capacity") {
    try { return json({success:true,data:await migrationCapacity()}); }
    catch (e) { return json({success:false,error:(e as Error).message},503); }
  }
  if (action === "list_recipients") {
    const limit = clampInt(body.limit, 1, 500, 100);
    const rawSearch = String(body.search || "");
    const search = rawSearch.trim().toLowerCase();
    const searchTerms = Array.from(
      new Set(
        rawSearch
          .split(/[,\n;]+/)
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    const isBankingTransitionNotice = isTransitionCampaign(body.campaign);
    const accountType = isBankingTransitionNotice ? "business" : String(body.account_type || "all").trim().toLowerCase();
    const eeaScaEligibleOnly = body.eea_sca_eligible_only === true;

    let q = supabase
      .from("user_profiles")
      .select("id,email,full_name,account_type,bridge_customer_id,bridge_kyc_status,bridge_account_status,account_status,country,created_at,is_admin,is_demo")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (accountType === "individual" || accountType === "business") {
      q = q.eq("account_type", accountType);
    }

    const { data: rows, error } = await q;
    if (error) return json({ success: false, error: error.message }, 500);
    const bizByUser = await loadBusinessRowsByUser(
      (rows || [])
        .filter((r: Record<string, unknown>) => String(r.account_type || "").toLowerCase() === "business")
        .map((r: Record<string, unknown>) => String(r.id || "")),
    );

    const confirmedAuthUserIds = eeaScaEligibleOnly ? await loadConfirmedAuthUserIds() : null;
    const membership = await partnerMemberships(supabase, (rows || []).map((r: any) => String(r.id)));
    const filtered = (rows || [])
      .filter((r: Record<string, unknown>) => r.is_admin !== true && !membership.has(String(r.id)))
      .filter((r: Record<string, unknown>) => {
        const email = String(r.email || "").toLowerCase();
        const fullName = String(r.full_name || "").toLowerCase();
        if (searchTerms.length > 0) {
          return searchTerms.some((term) => email.includes(term) || fullName.includes(term));
        }
        if (!search) return true;
        return email.includes(search) || fullName.includes(search);
      })
      .map((r: Record<string, unknown>) => {
        const id = String(r.id || "");
        const account_type = String(r.account_type || "individual").toLowerCase() === "business" ? "business" : "individual";
        const biz = bizByUser.get(id);
        const bridge_customer_id = String((account_type === "business" ? biz?.bridge_customer_id || r.bridge_customer_id : r.bridge_customer_id) || "");
        const verification_status = deriveVerificationStatus({
          ...r,
          account_type,
          bridge_customer_id,
          bridge_kyb_status: biz?.bridge_kyb_status,
        });
        return {
          id,
          email: String(r.email || "").toLowerCase(),
          full_name: String((account_type === "business" ? biz?.company_name || r.full_name : r.full_name) || ""),
          account_type,
          bridge_kyc_status: String(r.bridge_kyc_status || "not_started").toLowerCase(),
          bridge_kyb_status: account_type === "business" ? String(biz?.bridge_kyb_status || "not_started").toLowerCase() : null,
          verification_status,
          is_unlocked: isUnlockedVerificationStatus(verification_status),
          is_rejected: isBlockedVerificationStatus(verification_status),
          migration_priority: migrationPriority(biz),
          transition_status: isBankingTransitionNotice ? transitionStatus(r, biz) : null,
          can_receive_broadcast: isBankingTransitionNotice
            ? transitionEligible(body.campaign, r, biz)
            : !isBlockedVerificationStatus(verification_status),
          country: String((account_type === "business" ? biz?.country || r.country : r.country) || "").toUpperCase(),
          created_at: String(r.created_at || ""),
        };
      })
      .filter((r: Record<string, unknown>) => !isBankingTransitionNotice || r.can_receive_broadcast === true)
      .filter((r: Record<string, unknown>) => !eeaScaEligibleOnly || (
        EEA_30_COUNTRIES.has(String(r.country || "").toUpperCase())
        && r.is_unlocked === true
        && confirmedAuthUserIds?.has(String(r.id || ""))
      ));

    return json({ success: true, data: { recipients: filtered, total: filtered.length, excluded_partner_customers: membership.size } });
  }

  if (action === "send_campaign") {
    const campaign = String(body.campaign || "").trim() as BroadcastCampaign;
    const supportedCampaigns = new Set<BroadcastCampaign>([
      "business_activity_update",
      "business_migration_notice",
      "banking_transition_active",
      "banking_transition_restricted",
      "invoice_contract_hub",
      "mobile_app_update",
      "founder_welcome",
      "request_account_reminder",
      "virtual_account_limits",
      "affiliate_program",
      "stablecoin_free_announcement",
      "african_rails_live",
      "eea_sca_activation_reminder",
      "account_suspended",
      "scheduled_maintenance",
      "verification_reminder",
      "pin_reset_link",
    ]);
    if (!supportedCampaigns.has(campaign)) {
      return json({ success: false, error: "unsupported campaign" }, 400);
    }

    const dryRun = body.dry_run !== false;
    const inputUserIds = Array.isArray(body.user_ids) ? body.user_ids : [];
    const userIds = Array.from(new Set(inputUserIds.map((v) => String(v || "").trim()).filter(Boolean)));
    if (userIds.length === 0) {
      return json({ success: false, error: "user_ids required" }, 400);
    }
    if (userIds.length > 500) {
      return json({ success: false, error: "too many recipients (max 500 per request)" }, 400);
    }

    const requestedAccountType = String(body.account_type || "all").trim().toLowerCase();
    const { data: profiles, error: profilesErr } = await supabase
      .from("user_profiles")
      .select("id,email,full_name,account_type,is_admin,bridge_customer_id,bridge_kyc_status,bridge_account_status,account_status,country,is_demo")
      .in("id", userIds);
    if (profilesErr) return json({ success: false, error: profilesErr.message }, 500);

    const selectedMemberships = await partnerMemberships(supabase, userIds);
    if (selectedMemberships.size) return json({success:false, code:"partner_customers_excluded", error:"Partner customers cannot receive direct BorderPay campaigns. Refresh the recipient list.", excluded_partner_customers:selectedMemberships.size},409);

    // Explicit founder review copy for the approved October EUR service notice.
    // This changes only the in-memory recipient projection, never the user record.
    const noticeProfiles = (profiles || []).map((p: Record<string, unknown>) =>
      campaign === "business_migration_notice" && body.props?.notice_version === "eur_transition_20261005_v1"
      && p.id === "b000f84b-5488-4a8a-b934-f669978c7e20"
      && String(p.email || "").toLowerCase() === "founder@borderpayafrica.com"
      && p.account_type === "business" && p.is_demo !== true
        ? { ...p, is_admin: false } : p);
    const candidateProfiles = noticeProfiles.filter((p: Record<string, unknown>) =>
      p.is_admin !== true
      && String(p.email || "").includes("@")
      && (requestedAccountType === "all" || String(p.account_type || "individual").toLowerCase() === requestedAccountType),
    );
    const bizByUser = await loadBusinessRowsByUser(
      candidateProfiles
        .filter((p: Record<string, unknown>) => String(p.account_type || "").toLowerCase() === "business")
        .map((p: Record<string, unknown>) => String(p.id || "")),
    );
    if (isTransitionCampaign(campaign) && (
      candidateProfiles.length !== userIds.length ||
      candidateProfiles.some((p: Record<string, unknown>) => !transitionEligible(campaign, p, bizByUser.get(String(p.id || ""))))
    )) {
      return json({ success: false, error: "Selected businesses no longer match this campaign audience. Refresh recipients and select the correct business campaign." }, 409);
    }
    if (campaign === "invoice_contract_hub") {
      const ineligible = candidateProfiles.some((p: Record<string, unknown>) => {
        const biz = bizByUser.get(String(p.id || ""));
        return String(p.account_type || "").toLowerCase() !== "business" || deriveVerificationStatus({
          ...p, account_type: "business", bridge_customer_id: biz?.bridge_customer_id || p.bridge_customer_id,
          bridge_kyb_status: biz?.bridge_kyb_status,
        }) !== "active";
      });
      if (ineligible || candidateProfiles.length !== userIds.length) {
        return json({ success: false, error: "Invoice & Contract Hub emails are limited to selected verified business accounts." }, 409);
      }
    }
    const rejectedProfiles = candidateProfiles.filter((p: Record<string, unknown>) => {
      const userId = String(p.id || "");
      const accountType = String(p.account_type || "individual").toLowerCase() === "business" ? "business" : "individual";
      const biz = bizByUser.get(userId);
      const bridgeCustomerId = accountType === "business" ? biz?.bridge_customer_id || p.bridge_customer_id : p.bridge_customer_id;
      const status = deriveVerificationStatus({
        ...p,
        account_type: accountType,
        bridge_customer_id: bridgeCustomerId,
        bridge_kyb_status: biz?.bridge_kyb_status,
      });
      return isBlockedVerificationStatus(status) && !transitionEligible(campaign, p, biz);
    });
    if (rejectedProfiles.length > 0) {
      return json({
        success: false,
        error: "Blocked KYC/KYB users cannot receive broadcast templates.",
        rejected_recipients: rejectedProfiles.map((p: Record<string, unknown>) => ({
          user_id: String(p.id || ""),
          email: String(p.email || "").toLowerCase(),
          account_type: String(p.account_type || "individual").toLowerCase(),
        })),
      }, 409);
    }
    const isEeaScaCampaign = campaign === "eea_sca_activation_reminder";
    if (isEeaScaCampaign) {
      const confirmedAuthUserIds = await loadConfirmedAuthUserIds();
      const ineligibleProfiles = candidateProfiles.filter((p: Record<string, unknown>) => {
        const userId = String(p.id || "");
        const accountType = String(p.account_type || "individual").toLowerCase() === "business" ? "business" : "individual";
        const biz = bizByUser.get(userId);
        const bridgeCustomerId = accountType === "business" ? biz?.bridge_customer_id || p.bridge_customer_id : p.bridge_customer_id;
        const status = deriveVerificationStatus({
          ...p,
          account_type: accountType,
          bridge_customer_id: bridgeCustomerId,
          bridge_kyb_status: biz?.bridge_kyb_status,
        });
        const country = String((accountType === "business" ? biz?.country || p.country : p.country) || "").toUpperCase();
        return !EEA_30_COUNTRIES.has(country) || status !== "active" || !confirmedAuthUserIds.has(userId);
      });
      const missingProfileIds = userIds.filter((userId) => !candidateProfiles.some((p: Record<string, unknown>) => String(p.id || "") === userId));
      if (ineligibleProfiles.length > 0 || missingProfileIds.length > 0) {
        return json({
          success: false,
          error: "EEA SCA reminders are limited to active, Bridge-approved EEA-30 accounts.",
          ineligible_recipients: ineligibleProfiles.map((p: Record<string, unknown>) => ({
            user_id: String(p.id || ""),
            email: String(p.email || "").toLowerCase(),
          })),
          missing_or_deleted_user_ids: missingProfileIds,
        }, 409);
      }
      if (!dryRun && String(body.confirmation || "") !== "SEND_EEA_SCA_REMINDER") {
        return json({ success: false, error: "SEND_EEA_SCA_REMINDER confirmation required" }, 400);
      }
    }
    const activeProfiles = candidateProfiles;
    let activeVaLimitsByUser = new Map<string, VaLimitRow[]>();
    if (campaign === "virtual_account_limits") {
      activeVaLimitsByUser = await loadActiveVirtualAccountLimits(candidateProfiles.map((p: Record<string, unknown>) => String(p.id || "")));
    }

    const bizIds = activeProfiles
      .filter((p: Record<string, unknown>) => String(p.account_type || "").toLowerCase() === "business")
      .map((p: Record<string, unknown>) => String(p.id || ""));
    const bizNameByUser = new Map<string, string>();
    for (const userId of bizIds) {
      bizNameByUser.set(userId, String(bizByUser.get(userId)?.company_name || ""));
    }

    const preview = activeProfiles.map((p: Record<string, unknown>) => ({
      user_id: String(p.id || ""),
      email: String(p.email || "").toLowerCase(),
      account_type: String(p.account_type || "individual").toLowerCase(),
      template: resolveCampaignTemplate(campaign, String(p.account_type || "individual")),
    }));
    if (dryRun) {
      return json({
        success: true,
        data: { dry_run: true, campaign, selected_recipients: activeProfiles.length, preview: preview.slice(0, 100) },
      });
    }

    if (campaign === "business_migration_notice" || campaign === "business_activity_update") {
      if (activeProfiles.length > 30) return json({success:false,error:"Business service notices must be sent in batches of at most 30."},400);
      try {
        const capacity = await migrationCapacity();
        if (activeProfiles.length > capacity.remaining) return json({success:false,error:"Brevo daily allowance reserved. Leave remaining recipients pending.",data:capacity},429);
      } catch (e) { return json({success:false,error:(e as Error).message},503); }
    }
    const campaignProps = (body.props && typeof body.props === "object") ? (body.props as Record<string, unknown>) : {};
    const sent: Array<Record<string, unknown>> = [];
    const failed: Array<Record<string, unknown>> = [];

    for (const p of activeProfiles) {
      const userId = String((p as Record<string, unknown>).id || "");
      const email = String((p as Record<string, unknown>).email || "").toLowerCase();
      const fullName = String((p as Record<string, unknown>).full_name || "");
      const accountType = String((p as Record<string, unknown>).account_type || "individual").toLowerCase();
      const template = resolveCampaignTemplate(campaign, accountType);
      const isBusiness = accountType === "business";
      const props: Record<string, unknown> = {
        ...campaignProps,
        full_name: fullName,
        display_name: campaignProps.display_name || (isBusiness ? bizNameByUser.get(userId) || fullName || "there" : fullName || "there"),
        action_url: String(campaignProps.action_url || `${Deno.env.get("APP_URL") || "https://app.borderpayafrica.com"}/dashboard`),
      };
      if (isTransitionCampaign(campaign)) {
        props.transition_status = transitionStatus(p as Record<string, unknown>, bizByUser.get(userId));
      }
      if (campaign === "pin_reset_link") {
        props.reset_url = String(
          campaignProps.reset_url ||
          `${Deno.env.get("APP_URL") || "https://app.borderpayafrica.com"}/forgot-pin`,
        );
      }
      if (isBusiness) {
        props.company_name = String(campaignProps.company_name || bizNameByUser.get(userId) || "Your business");
      }
      if (campaign === "virtual_account_limits") {
        props.virtual_accounts = activeVaLimitsByUser.get(userId) || [];
      }

      try {
        const sendResult = await sendEmailWithRetry({
          template,
          to: email,
          user_id: userId,
          idempotency_key: campaign === "business_activity_update"
            ? `admin_email_ops:business_activity_update:20261001:v1:${userId}`
            : campaign === "business_migration_notice"
            ? (campaignProps.notice_version === "eur_transition_20261005_v1"
                ? `admin_email_ops:business_migration_notice:20261005:eur_v1:${userId}`
                : `admin_email_ops:business_migration_notice:20260928:v1:${userId}`)
            : isEeaScaCampaign
            ? `admin_email_ops:${campaign}:v1:${userId}`
            : `admin_email_ops:${campaign}:${userId}:${Date.now()}`,
          props,
        });
        if (!sendResult.ok) {
          failed.push({ user_id: userId, email, error: sendResult.error || "send-email failed" });
          continue;
        }
        sent.push({ user_id: userId, email, template });
      } catch (error) {
        failed.push({ user_id: userId, email, error: (error as Error).message });
      }
    }

    return json({
      success: failed.length === 0,
      data: {
        dry_run: false,
        campaign,
        selected_recipients: activeProfiles.length,
        sent_count: sent.length,
        failed_count: failed.length,
        failed,
      },
    }, failed.length === 0 ? 200 : 207);
  }

  if (action === "send_template") {
    const dryRun = body.dry_run !== false;
    const template = String(body.template || "").trim();
    if (!TEMPLATE_ALLOWLIST.has(template)) {
      return json({ success: false, error: "unsupported template" }, 400);
    }
    const inputUserIds = Array.isArray(body.user_ids) ? body.user_ids : [];
    const userIds = Array.from(new Set(inputUserIds.map((v) => String(v || "").trim()).filter(Boolean)));
    if (userIds.length === 0) {
      return json({ success: false, error: "user_ids required" }, 400);
    }
    if (userIds.length > 500) {
      return json({ success: false, error: "too many recipients (max 500 per request)" }, 400);
    }
    const isEeaScaTemplate = template === "account.eea_sca_activation_reminder";
    const prefix = isEeaScaTemplate
      ? "account"
      : template.startsWith("business.") ? "business" : template.startsWith("individual.") ? "individual" : null;
    if (!prefix) return json({ success: false, error: "template namespace invalid" }, 400);

    const { data: profiles, error: profilesErr } = await supabase
      .from("user_profiles")
      .select("id,email,full_name,account_type,is_admin,bridge_customer_id,bridge_kyc_status,bridge_account_status,account_status,country,is_demo")
      .in("id", userIds);
    if (profilesErr) return json({ success: false, error: profilesErr.message }, 500);

    const selectedMemberships = await partnerMemberships(supabase, userIds);
    if (selectedMemberships.size) return json({success:false,code:"partner_customers_excluded",error:"Partner customers cannot receive direct BorderPay campaigns.",excluded_partner_customers:selectedMemberships.size},409);

    const candidateProfiles = (profiles || []).filter((p: Record<string, unknown>) =>
      p.is_admin !== true
      && String(p.email || "").includes("@")
      && (prefix === "account" || String(p.account_type || "").toLowerCase() === prefix),
    );
    const bizByUser = await loadBusinessRowsByUser(
      candidateProfiles
        .filter((p: Record<string, unknown>) => String(p.account_type || "").toLowerCase() === "business")
        .map((p: Record<string, unknown>) => String(p.id || "")),
    );
    if (template === "business.invoice_contract_hub") {
      const ineligible = candidateProfiles.some((p: Record<string, unknown>) => {
        const biz = bizByUser.get(String(p.id || ""));
        return String(p.account_type || "").toLowerCase() !== "business" || deriveVerificationStatus({
          ...p, account_type: "business", bridge_customer_id: biz?.bridge_customer_id || p.bridge_customer_id,
          bridge_kyb_status: biz?.bridge_kyb_status,
        }) !== "active";
      });
      if (ineligible || candidateProfiles.length !== userIds.length) {
        return json({ success: false, error: "Invoice & Contract Hub emails are limited to selected verified business accounts." }, 409);
      }
    }
    const rejectedProfiles = candidateProfiles.filter((p: Record<string, unknown>) => {
      const userId = String(p.id || "");
      const accountType = String(p.account_type || "individual").toLowerCase() === "business" ? "business" : "individual";
      const biz = bizByUser.get(userId);
      const bridgeCustomerId = accountType === "business" ? biz?.bridge_customer_id || p.bridge_customer_id : p.bridge_customer_id;
      return isBlockedVerificationStatus(deriveVerificationStatus({
        ...p,
        account_type: accountType,
        bridge_customer_id: bridgeCustomerId,
        bridge_kyb_status: biz?.bridge_kyb_status,
      }));
    });
    if (rejectedProfiles.length > 0) {
      return json({
        success: false,
        error: "Blocked KYC/KYB users cannot receive broadcast templates.",
        rejected_recipients: rejectedProfiles.map((p: Record<string, unknown>) => ({
          user_id: String(p.id || ""),
          email: String(p.email || "").toLowerCase(),
          account_type: String(p.account_type || "individual").toLowerCase(),
        })),
      }, 409);
    }
    if (isEeaScaTemplate) {
      const confirmedAuthUserIds = await loadConfirmedAuthUserIds();
      const ineligibleProfiles = candidateProfiles.filter((p: Record<string, unknown>) => {
        const userId = String(p.id || "");
        const accountType = String(p.account_type || "individual").toLowerCase() === "business" ? "business" : "individual";
        const biz = bizByUser.get(userId);
        const bridgeCustomerId = accountType === "business" ? biz?.bridge_customer_id || p.bridge_customer_id : p.bridge_customer_id;
        const status = deriveVerificationStatus({
          ...p,
          account_type: accountType,
          bridge_customer_id: bridgeCustomerId,
          bridge_kyb_status: biz?.bridge_kyb_status,
        });
        const country = String((accountType === "business" ? biz?.country || p.country : p.country) || "").toUpperCase();
        return !EEA_30_COUNTRIES.has(country) || status !== "active" || !confirmedAuthUserIds.has(userId);
      });
      const missingProfileIds = userIds.filter((userId) => !candidateProfiles.some((p: Record<string, unknown>) => String(p.id || "") === userId));
      if (ineligibleProfiles.length > 0 || missingProfileIds.length > 0) {
        return json({
          success: false,
          error: "EEA SCA reminders are limited to active, Bridge-approved EEA-30 accounts.",
          ineligible_recipients: ineligibleProfiles.map((p: Record<string, unknown>) => ({
            user_id: String(p.id || ""),
            email: String(p.email || "").toLowerCase(),
          })),
          missing_or_deleted_user_ids: missingProfileIds,
        }, 409);
      }
      if (!dryRun && String(body.confirmation || "") !== "SEND_EEA_SCA_REMINDER") {
        return json({ success: false, error: "SEND_EEA_SCA_REMINDER confirmation required" }, 400);
      }
    }
    let namespaceProfiles = candidateProfiles;
    let activeVaLimitsByUser = new Map<string, VaLimitRow[]>();
    if (template === "individual.virtual_account_limits" || template === "business.virtual_account_limits") {
      activeVaLimitsByUser = await loadActiveVirtualAccountLimits(candidateProfiles.map((p: Record<string, unknown>) => String(p.id || "")));
      namespaceProfiles = candidateProfiles.filter((p: Record<string, unknown>) =>
        (activeVaLimitsByUser.get(String(p.id || "")) || []).length > 0
      );
    }

    const bizIds = namespaceProfiles
      .filter((p: Record<string, unknown>) => String(p.account_type || "").toLowerCase() === "business")
      .map((p: Record<string, unknown>) => String(p.id || ""));
    const bizNameByUser = new Map<string, string>();
    for (const userId of bizIds) {
      bizNameByUser.set(userId, String(bizByUser.get(userId)?.company_name || ""));
    }

    const preview = namespaceProfiles.map((p: Record<string, unknown>) => ({
      user_id: String(p.id || ""),
      email: String(p.email || "").toLowerCase(),
      account_type: String(p.account_type || "individual").toLowerCase(),
      template,
    }));
    if (dryRun) {
      return json({
        success: true,
        data: { dry_run: true, template, selected_recipients: namespaceProfiles.length, preview: preview.slice(0, 100) },
      });
    }

    const inputProps = (body.props && typeof body.props === "object") ? (body.props as Record<string, unknown>) : {};
    const sent: Array<Record<string, unknown>> = [];
    const failed: Array<Record<string, unknown>> = [];
    for (const p of namespaceProfiles) {
      const userId = String((p as Record<string, unknown>).id || "");
      const email = String((p as Record<string, unknown>).email || "").toLowerCase();
      const fullName = String((p as Record<string, unknown>).full_name || "");
      const props: Record<string, unknown> = {
        ...inputProps,
        full_name: inputProps.full_name || fullName,
        display_name: inputProps.display_name || (prefix === "business" || String(p.account_type || "").toLowerCase() === "business"
          ? bizNameByUser.get(userId) || fullName || "there"
          : fullName || "there"),
        action_url: String(inputProps.action_url || `${Deno.env.get("APP_URL") || "https://app.borderpayafrica.com"}/dashboard`),
      };
      if (template === "individual.virtual_account_limits" || template === "business.virtual_account_limits") {
        props.virtual_accounts = activeVaLimitsByUser.get(userId) || [];
      }
      if (prefix === "business") {
        props.company_name = String(inputProps.company_name || bizNameByUser.get(userId) || "Your business");
      }

      try {
        const idempotencyKey = isEeaScaTemplate
          ? `admin_email_ops:template:${template}:v1:${userId}`
          : `admin_email_ops:template:${template}:${userId}:${Date.now()}`;
        const sendResult = await sendEmailWithRetry({
          template,
          to: email,
          user_id: userId,
          idempotency_key: idempotencyKey,
          props,
        });
        if (!sendResult.ok) {
          failed.push({ user_id: userId, email, error: sendResult.error || "send-email failed" });
          continue;
        }
        sent.push({ user_id: userId, email, template });
      } catch (error) {
        failed.push({ user_id: userId, email, error: (error as Error).message });
      }
    }

    return json({
      success: failed.length === 0,
      data: {
        dry_run: false,
        template,
        selected_recipients: namespaceProfiles.length,
        sent_count: sent.length,
        failed_count: failed.length,
        failed,
      },
    }, failed.length === 0 ? 200 : 207);
  }

  return json({ success: false, error: "unsupported action" }, 400);
});
