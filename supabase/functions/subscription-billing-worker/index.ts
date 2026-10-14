import { maintenanceReactivationDisposition } from "../_shared/maintenance-access-policy.ts";
import { runBusinessMaintenanceCycle, queueConfirmedMaintenanceNotices } from "./business-maintenance.ts";
import { requestMaintenancePdf } from "../_shared/maintenance-invoice-client.ts";
import { hasActiveMaintenanceVa, requiresActiveMaintenanceVa } from "../_shared/maintenance-va-email-policy.ts";
import { resolveUsageNoticeRecipient } from "../_shared/business-usage-recipient.ts";
import { maintenanceEmailCapacity } from "../_shared/maintenance-email-capacity.ts";
import { partnerMemberships } from "../_shared/partner-customer-policy.ts";
import { prepareInvoiceEmail, confirmedEmailDelivery } from "../_shared/subscription-email-policy.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { bridgeProvider } from "../_shared/providers/bridge.ts";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WORKER_TOKEN = Deno.env.get("WORKER_AUTH_TOKEN") ?? "";
const EMAIL_TOKEN = Deno.env.get("SEND_EMAIL_INTERNAL_TOKEN") ?? SERVICE_ROLE;
const db = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Billing routing is intentionally independent from SCA. It uses the
// verified server-side customer country only to choose invoice collection
// versus wallet collection; it does not gate login or financial screens.
const EEA_BILLING_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IS", "IE", "IT", "LV", "LI", "LT", "LU", "MT", "NL",
  "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

async function resolveBillingCountry(userId: string): Promise<{ country: string | null; eea: boolean }> {
  const [{ data, error }, { data: business, error: businessError }] = await Promise.all([
    db.from("user_profiles")
    .select("country,account_type,kyc_status,bridge_kyc_status,account_status,bridge_account_status")
    .eq("id", userId)
    .maybeSingle(),
    db.from("business_profiles")
      .select("bridge_kyb_status")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const blocked = new Set(["paused", "frozen", "offboarded", "rejected", "closed", "deleted", "suspended"]);
  const accountType = String(data?.account_type ?? "").toLowerCase();
  const identityApproved = accountType === "business"
    ? ["approved", "verified"].includes(String(business?.bridge_kyb_status ?? "").toLowerCase())
    : ["approved", "verified"].includes(String(data?.bridge_kyc_status ?? data?.kyc_status ?? "").toLowerCase());
  if (error || businessError
    || String(data?.kyc_status ?? "").toLowerCase() !== "verified"
    || !["business", "individual"].includes(accountType)
    || !identityApproved
    || blocked.has(String(data?.account_status ?? "").toLowerCase())
    || blocked.has(String(data?.bridge_account_status ?? "").toLowerCase())) {
    return { country: null, eea: false };
  }
  const country = String(data?.country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return { country: null, eea: false };
  return { country, eea: EEA_BILLING_COUNTRIES.has(country) };
}

function currentMonthEnd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

async function prepareApprovedBusinessBilling(dryRun = false, _queueBeforeDue = false) {
  const {data,error}=await db.rpc("prepare_verified_business_maintenance",{p_dry_run:dryRun});
  if(error)throw error;
  return data;
}

async function runBusinessOnboardingLifecycle(dryRun = false) {
  const { data, error } = await db.rpc("run_business_onboarding_lifecycle", {
    p_dry_run: dryRun,
  });
  if (error) throw error;
  return data;
}

function equal(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return output;
}

async function billDue() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db.from("subscriptions")
    .select("id,user_id")
    .neq("account_type", "business")
    .eq("status", "active")
    .is("restricted_at", null)
    .lte("next_billing_date", today)
    .limit(500);
  if (error) throw error;
  const results = [];
  const scopedRows = await mapWithConcurrency(data ?? [], 3, async (row) => ({
    row,
    scope: await resolveBillingCountry(row.user_id),
  }));
  for (const { row, scope } of scopedRows) {
    if (scope.eea) {
      const { data: result, error: invoiceError } = await db.rpc("queue_external_subscription_invoice", {
        p_subscription_id: row.id,
        p_billing_date: today,
        p_scope_country: scope.country,
        p_provider: "flutterwave",
      });
      results.push({ id: row.id, route: "flutterwave_invoice", result, error: invoiceError?.message ?? null });
      continue;
    }
    if (!scope.country) {
      results.push({ id: row.id, route: "blocked", result: null, error: "maintenance_region_unresolved" });
      continue;
    }
    try {
      const response = await fetch(`${URL}/functions/v1/subscription-bridge-collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${WORKER_TOKEN || SERVICE_ROLE}` },
        body: JSON.stringify({ subscription_id: row.id, billing_date: today }),
      });
      const body = await response.json().catch(() => ({}));
      results.push({ id: row.id, route: "bridge_non_eea", result: response.ok ? body?.data ?? body : null, error: response.ok ? null : body?.error || `HTTP ${response.status}` });
    } catch (cause) {
      results.push({ id: row.id, route: "bridge_non_eea", result: null, error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return { processed: results.length, results };
}

async function drainExternalInvoices() {
  try {
    const response = await fetch(`${URL}/functions/v1/flutterwave-subscription-collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${WORKER_TOKEN || SERVICE_ROLE}` },
      body: JSON.stringify({ mode: "drain" }),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body?.data ?? body : { configured: false, error: body?.error || `HTTP ${response.status}` };
  } catch (cause) {
    return { configured: false, error: cause instanceof Error ? cause.message : String(cause) };
  }
}

async function queueUnpaidInvoices() {
  const { data, error } = await db.from("subscriptions")
    .select("id,user_id,next_billing_date")
    .eq("status", "active")
    .in("payment_status", ["failed", "pending"])
    .not("grace_started_at", "is", null)
    .limit(500);
  if (error) throw error;
  const results = await mapWithConcurrency(data ?? [], 3, async (row) => {
    const scope = await resolveBillingCountry(row.user_id);
    if (!scope.country) return { id: row.id, queued: false, error: "maintenance_region_unresolved" };
    const { data: result, error: invoiceError } = await db.rpc("queue_external_subscription_invoice", {
      p_subscription_id: row.id,
      p_billing_date: row.next_billing_date,
      p_scope_country: scope.country,
      p_provider: "flutterwave",
    });
    return { id: row.id, queued: !invoiceError, result, error: invoiceError?.message ?? null };
  });
  return { processed: results.length, results };
}

type AccessAction = {
  id: string;
  subscription_id: string;
  user_id: string;
  bridge_virtual_account_id: string;
  bridge_customer_id: string;
  action: "deactivate" | "reactivate";
  idempotency_key: string;
  attempt_count: number;
};

async function accessEnforcementEnabled(): Promise<boolean> {
  const { data, error } = await db.rpc("app_config_get", { p_key: "subscription_access_enforcement_enabled" });
  if (error) return false;
  return String(data ?? "").trim().toLowerCase() === "true";
}

async function reconcileSubscriptionAccess(dryRun = false, limit = 20) {
  const { data: reconciliation, error: reconciliationError } = await db.rpc("reconcile_subscription_access_actions", {
    p_dry_run: dryRun,
    p_limit: Math.max(1, Math.min(limit, 500)),
  });
  if (reconciliationError) throw reconciliationError;
  if (dryRun) return { reconciliation, processed: 0, completed: 0, failed: 0 };
  if (!(await accessEnforcementEnabled())) {
    return { reconciliation, enabled: false, processed: 0, completed: 0, failed: 0 };
  }

  const { data, error } = await db.from("subscription_provider_access_actions")
    .select("id,subscription_id,user_id,bridge_virtual_account_id,bridge_customer_id,action,idempotency_key,attempt_count")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;

  let completed = 0;
  let failed = 0;
  const partnerActions = await partnerMemberships(db, (data ?? []).map((a: any) => String(a.user_id)));
  for (const action of (data ?? []) as AccessAction[]) {
    if (partnerActions.has(action.user_id)) continue; // Never retail-restrict or reactivate a partner account.

    const claimedAt = new Date().toISOString();
    const { data: claimed } = await db.from("subscription_provider_access_actions")
      .update({ status: "processing", last_attempt_at: claimedAt, attempt_count: action.attempt_count + 1, updated_at: claimedAt })
      .eq("id", action.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();
    if (!claimed?.id) continue;
    try {
      let alreadyActiveVa: {virtual_account_id:string;currency:string;rail?:string;status?:string}|undefined;
      const {data:sub,error:subError}=await db.from("subscriptions").select("account_type,status").eq("id",action.subscription_id).single();if(subError)throw subError;
      const {data:exemption,error:exemptionError}=await db.from("maintenance_billing_exemptions").select("user_id").eq("user_id",action.user_id).maybeSingle();if(exemptionError)throw exemptionError;
      if(exemption || sub.status!=="active")throw Error("maintenance_action_no_longer_eligible");
      if(sub.account_type==="business") {
        const {data:allowed,error:guardError}=await db.rpc("business_maintenance_action_allowed",{p_action_id:action.id});if(guardError)throw guardError;if(!allowed)throw Error("maintenance_action_no_longer_eligible");
        const live=await bridgeProvider.getCustomerProfile(action.bridge_customer_id);
        if(String((live.raw as any)?.status)!=="active")throw Error("provider_customer_not_active");
        if(action.action==="reactivate") {
          const vas=await bridgeProvider.listVirtualAccounts(action.bridge_customer_id);
          const va=vas.find(v=>v.virtual_account_id===action.bridge_virtual_account_id);
          if(!va)throw Error("provider_account_not_found");
          if(maintenanceReactivationDisposition(va.status)==="already_active")alreadyActiveVa=va;
        }
        if(action.action==="deactivate") {
          const vas=await bridgeProvider.listVirtualAccounts(action.bridge_customer_id);
          const va=vas.find(v=>v.virtual_account_id===action.bridge_virtual_account_id);
          const {data:local}=await db.from("bridge_virtual_accounts").select("deactivation_reason").eq("bridge_virtual_account_id",action.bridge_virtual_account_id).single();
          // Never relabel a pre-existing provider restriction as maintenance nonpayment.
          if(!va || (!['active','activated'].includes(String(va.status)) && local?.deactivation_reason!=="subscription_nonpayment"))throw Error("provider_account_already_restricted");
        }
      }
      const providerResult = action.action === "deactivate"
        ? await bridgeProvider.deactivateVirtualAccount(action.bridge_customer_id, action.bridge_virtual_account_id, action.idempotency_key)
        : alreadyActiveVa ?? await bridgeProvider.reactivateVirtualAccount(action.bridge_customer_id, action.bridge_virtual_account_id, action.idempotency_key);
      const providerStatus = String(providerResult.status || "").toLowerCase();
      if (action.action === "deactivate" && providerStatus !== "deactivated") throw new Error(`unexpected_provider_status:${providerStatus || "missing"}`);
      if (action.action === "reactivate" && !["active", "activated"].includes(providerStatus)) throw new Error(`unexpected_provider_status:${providerStatus || "missing"}`);
      const now = new Date().toISOString();
      const { data: va } = await db.from("bridge_virtual_accounts")
        .select("account_details")
        .eq("bridge_virtual_account_id", action.bridge_virtual_account_id)
        .maybeSingle();
      const details = va?.account_details && typeof va.account_details === "object" ? va.account_details as Record<string, unknown> : {};
      const accessMetadata = { action_id: action.id, subscription_id: action.subscription_id, action: action.action, completed_at: now };
      const update = action.action === "deactivate"
        ? { status: "deactivated", deactivated_at: now, deactivation_reason: "subscription_nonpayment", account_details: { ...details, status: "deactivated", subscription_access_control: accessMetadata } }
        : { status: "active", deactivated_at: null, deactivation_reason: null, account_details: { ...details, status: "active", subscription_access_control: accessMetadata } };
      const { error: updateError } = await db.from("bridge_virtual_accounts").update(update).eq("bridge_virtual_account_id", action.bridge_virtual_account_id);
      if (updateError) throw updateError;
      await db.from("subscription_provider_access_actions").update({
        status: "completed",
        completed_at: now,
        last_error: null,
        provider_response: {
          virtual_account_id: providerResult.virtual_account_id,
          currency: providerResult.currency,
          rail: providerResult.rail ?? null,
          status: providerResult.status ?? null,
        },
        updated_at: now,
      }).eq("id", action.id);
      completed++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const attempts = action.attempt_count + 1;
      const nextAttempt = new Date(Date.now() + Math.min(86400, 30 * 2 ** attempts) * 1000).toISOString();
      await db.from("subscription_provider_access_actions").update({ status: "failed", last_error: message.slice(0, 500), next_attempt_at: nextAttempt, updated_at: new Date().toISOString() }).eq("id", action.id);
      failed++;
    }
  }
  return { reconciliation, processed: data?.length ?? 0, completed, failed };
}

async function sendEmails(remindersOnly = false, maintenanceOnly = false) {
  const capacity=await maintenanceEmailCapacity(db);
  if(capacity<=0)return {sent:0,deferred:true,reason:"daily_email_allowance_reserved"};
  let pending = db.from("subscription_email_jobs").select("*")
    .eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(Math.min(30,capacity));
  if (maintenanceOnly) pending = pending.eq("template", "business.subscription_external_invoice");
  if (remindersOnly) pending = pending.eq("template", "business.subscription_external_invoice").contains("props", { notice: "balance_reminder" });
  const { data, error } = await pending;
  if (error) throw error;
  let sent = 0; let failed = 0;
  const partnerJobs = await partnerMemberships(db, (data ?? []).map((j: any) => String(j.user_id)));
  for (const job of data ?? []) {
    if (partnerJobs.has(String(job.user_id))) {
      await db.from("subscription_email_jobs").update({status:"failed",last_error:"suppressed:partner_managed"}).eq("id",job.id);
      continue;
    }

    const maintenancePeriod = job.props?.billing_period || job.props?.billing_start_date;
    const maintenanceDue = typeof maintenancePeriod === "string" && /^\d{4}-\d{2}-\d{2}$/.test(maintenancePeriod)
      ? Date.parse(maintenancePeriod + "T00:00:00Z") : NaN;
    if (requiresActiveMaintenanceVa(job.template) && maintenanceDue > Date.now()) {
      const { error: deferError } = await db.from("subscription_email_jobs")
        .update({ next_attempt_at: new Date(maintenanceDue).toISOString(), last_error: null }).eq("id", job.id);
      if (deferError) throw deferError;
      continue;
    }
    // Recheck at delivery time; old queued reminders must not bypass VA status.
    if (requiresActiveMaintenanceVa(job.template) && !await hasActiveMaintenanceVa(db, job.user_id, job.recipient, job.props?.billing_period || job.props?.billing_start_date)) {
      const { error: suppressError } = await db.from("subscription_email_jobs")
        .update({ status: "failed", last_error: "suppressed:no_active_virtual_account" }).eq("id", job.id);
      if (suppressError) throw suppressError;
      continue;
    }

    let props = job.props;
    let attachments: Array<{name:string;content:string}> = [];
    if (job.template === "business.business_activity_update" && job.props?.usage_notice === true) {
      props = await resolveUsageNoticeRecipient(db, job);
      if (!props) {
        const { error: suppressError } = await db.from("subscription_email_jobs").update({status:"failed",last_error:"suppressed:usage_notice_recipient_ineligible"}).eq("id",job.id);
        if (suppressError) throw suppressError;
        continue;
      }
    }
    if (job.template.endsWith(".subscription_external_invoice")) {
      const { data: invoice, error: invoiceError } = await db.from("subscription_external_invoices")
        .select("id,user_id,subscription_id,amount,currency,billing_period,status,paid_at,payment_link,provider_reference,created_at,expires_at")
        .eq("user_id", job.user_id).eq("provider_reference", String(job.props?.transaction_reference || "")).maybeSingle();
      if (invoiceError) throw invoiceError;
      const { data: subscription, error: subscriptionError } = invoice
        ? await db.from("subscriptions").select("user_id,status,grace_started_at,account_type").eq("id", invoice.subscription_id).maybeSingle()
        : { data: null, error: null };
      if (subscriptionError) throw subscriptionError;
      if(job.props?.notice==='deactivated') {
        const {data:held,error:heldError}=await db.from('bridge_virtual_accounts').select('currency,status,deactivation_reason').or(`user_id.eq.${job.user_id},business_user_id.eq.${job.user_id}`);if(heldError)throw heldError;
        const confirmed=[...new Set<string>((held||[]).filter((v:any)=>v.status==='deactivated'&&v.deactivation_reason==='subscription_nonpayment').map((v:any)=>v.currency))];
        if(!confirmed.length){await db.from('subscription_email_jobs').update({status:'failed',last_error:'suppressed:no_maintenance_deactivated_accounts'}).eq('id',job.id);continue;}
        job.props={...job.props,deactivated_currencies:confirmed};
      }
      const plan = prepareInvoiceEmail(job, invoice, subscription);
      if (plan.action === "suppress") {
        await db.from("subscription_email_jobs").update({ status: "failed", last_error: `suppressed:${plan.reason}` }).eq("id", job.id);
        continue;
      }
      if (plan.action === "defer") {
        await db.from("subscription_email_jobs").update({ next_attempt_at: plan.nextAttemptAt, last_error: null }).eq("id", job.id);
        continue;
      }
      if(!subscription || !invoice)continue;
      const { data: billable, error: billableError } = subscription.account_type === "business"
        ? await db.rpc("business_maintenance_invoice_eligible", { p_invoice_id: invoice.id })
        : await db.rpc("maintenance_account_is_billable", { p_user_id: job.user_id });
      if (billableError) throw billableError;
      if (billable !== true) {
        await db.from("subscription_email_jobs").update({ status: "failed", last_error: "suppressed:account_not_billable" }).eq("id", job.id);
        continue;
      }
      props = plan.props;
      if(subscription.account_type==='business') {
        try {
          const pdf=await requestMaintenancePdf(URL,SERVICE_ROLE,invoice.id);
          attachments=[{name:pdf.name,content:pdf.content}];props={...props,customer_name:pdf.buyerName,invoice_number:pdf.invoiceNumber,pdf_attached:true};
        } catch(error) {
          await db.from('subscription_email_jobs').update({next_attempt_at:new Date(Date.now()+300000).toISOString(),last_error:'invoice_pdf_unavailable',attempt_count:job.attempt_count+1}).eq('id',job.id);
          failed++;continue;
        }
      }
    }
    let response: Response;
    try {
      response = await fetch(`${URL}/functions/v1/send-email`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMAIL_TOKEN}` },
      body: JSON.stringify({ template: job.template, to: job.recipient, user_id: job.user_id, props, attachments, idempotency_key: job.idempotency_key }),
      signal: AbortSignal.timeout(20000),
      });
    } catch {
      await db.from("subscription_email_jobs").update({attempt_count:job.attempt_count+1,next_attempt_at:new Date(Date.now()+60000).toISOString(),last_error:"email_delivery_connection_interrupted"}).eq("id",job.id);
      failed++;continue;
    }
    const delivery = await response.json().catch(() => ({}));
    if (confirmedEmailDelivery(response.ok, delivery)) {
      await db.from("subscription_email_jobs").update({ status: "sent", sent_at: new Date().toISOString(), attempt_count: job.attempt_count + 1, last_error: null }).eq("id", job.id);
      sent++;
    } else {
      const message = String(delivery?.error || `Email delivery not confirmed (${response.status}, ${delivery?.data?.status || "unknown"})`).slice(0, 500);
      const attempts = job.attempt_count + 1;
      const next = new Date(Date.now() + Math.min(86400, 30 * 2 ** attempts) * 1000).toISOString();
      await db.from("subscription_email_jobs").update({ status: attempts >= 8 ? "failed" : "pending", attempt_count: attempts, next_attempt_at: next, last_error: message }).eq("id", job.id);
      failed++;
    }
  }
  return { selected: data?.length ?? 0, sent, failed };
}

async function finalizeRestrictionsAfterEmailDelivery() {
  const { data, error } = await db.rpc("finalize_subscription_restrictions");
  if (error) throw error;
  return data;
}

async function sign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(raw)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deliverEvents() {
  const { data, error } = await db.from("subscription_event_deliveries")
    .select("id,status,attempt_count,event_id,subscription_events(*),subscription_webhook_endpoints(*)")
    .eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).limit(100);
  if (error) throw error;
  let delivered = 0; let failed = 0;
  for (const item of data ?? []) {
    const event = item.subscription_events as unknown as Record<string, unknown>;
    const endpoint = item.subscription_webhook_endpoints as unknown as Record<string, unknown>;
    if (!endpoint?.url || endpoint.enabled === false) continue;
    const body = JSON.stringify(event);
    const signature = await sign(String(endpoint.secret), body);
    try {
      const response = await fetch(String(endpoint.url), { method: "POST", headers: { "Content-Type": "application/json", "X-BorderPay-Event-Id": String(item.event_id), "X-BorderPay-Signature": signature }, body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await db.from("subscription_event_deliveries").update({ status: "delivered", delivered_at: new Date().toISOString(), attempt_count: item.attempt_count + 1, last_error: null }).eq("id", item.id);
      delivered++;
    } catch (e) {
      const attempts = item.attempt_count + 1;
      await db.from("subscription_event_deliveries").update({ status: attempts >= 10 ? "failed" : "pending", attempt_count: attempts, next_attempt_at: new Date(Date.now() + Math.min(86400, 30 * 2 ** attempts) * 1000).toISOString(), last_error: String(e).slice(0, 500) }).eq("id", item.id);
      failed++;
    }
  }
  return { selected: data?.length ?? 0, delivered, failed };
}

async function queueAnnouncement() {
  const { data: subs, error } = await db.from("subscriptions")
    .select("user_id,account_type,next_billing_date")
    .eq("status", "active")
    .eq("account_type", "business");
  if (error) throw error;
  const ids = (subs ?? []).map((s) => s.user_id);
  const [{ data: profiles, error: profileError }, { data: businesses, error: businessError }] = await Promise.all([
    db.from("user_profiles").select("id,email,full_name,account_type,kyc_status").in("id", ids),
    db.from("business_profiles").select("user_id,company_name,bridge_kyb_status").in("user_id", ids),
  ]);
  if (profileError) throw profileError;
  if (businessError) throw businessError;
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const businessById = new Map((businesses ?? []).map((b) => [b.user_id, b]));
  let queued = 0;
  let eligible = 0;
  for (const sub of subs ?? []) {
    const profile = profileById.get(sub.user_id);
    const business = businessById.get(sub.user_id);
    const isVerifiedBusiness = profile?.account_type === "business"
      && String(profile?.kyc_status ?? "").toLowerCase() === "verified"
      && ["approved", "verified"].includes(String(business?.bridge_kyb_status ?? "").toLowerCase());
    if (!isVerifiedBusiness || !profile?.email) continue;
    eligible++;
    const { error: insertError } = await db.from("subscription_email_jobs").insert({
      user_id: sub.user_id,
      template: `${sub.account_type}.subscription_maintenance_announcement`,
      recipient: profile.email.trim().toLowerCase(),
      props: { customer_name: business?.company_name ?? profile.full_name, billing_start_date: sub.next_billing_date },
      idempotency_key: `subscription:maintenance_announcement:2026-08-31:${sub.user_id}`,
    });
    if (!insertError) queued++;
    else if (insertError.code !== "23505") throw insertError;
  }
  return { eligible, queued };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, error: "POST only" }, 405);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Production cron stores its independently rotatable bearer in app_config.
  // Read it with the service client and compare timing-safely; never return or log it.
  const { data: configuredWorkerToken } = await db.rpc("app_config_get", { p_key: "worker_auth_token" });
  if (!(equal(token, WORKER_TOKEN) || equal(token, SERVICE_ROLE) || equal(token, String(configuredWorkerToken ?? "")))) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "drain" } = body;
    const out: Record<string, unknown> = {};
    if(mode==='maintenance_invoice_preview') {
      const {data:invoice,error}=await db.from('subscription_external_invoices').select('*').eq('id',String(body.invoice_id||'')).single();if(error)throw error;
      const pdf=await requestMaintenancePdf(URL,SERVICE_ROLE,invoice.id);return json({success:true,name:pdf.name,content:pdf.content});
    }
    if(mode==='maintenance_cycle') {
      out.business_calendar=await runBusinessMaintenanceCycle(db,URL,SERVICE_ROLE);
      out.access=await reconcileSubscriptionAccess(false);
      out.notices=await queueConfirmedMaintenanceNotices(db);
      out.emails=await sendEmails(false,true);
      return json({success:true,data:out});
    }
    // Explicit email-only operation: never bill, provision, collect funds or change access.
    if (mode === "reminders_only") return json({ success: true, data: { emails: await sendEmails(true) } });
    if (["prepare", "references", "emails"].includes(mode)) {
      out.business_maintenance = await prepareApprovedBusinessBilling(false, true);
    }
    if (["bill_due", "drain"].includes(mode)) {
      out.business_maintenance = await prepareApprovedBusinessBilling(false, false);
    }
    if (mode === "prepare_dry_run") {
      out.business_maintenance = await prepareApprovedBusinessBilling(true, false);
    }
    if (mode === "onboarding_dry_run") {
      out.onboarding = await runBusinessOnboardingLifecycle(true);
    }
    if (["bill_due", "drain", "onboarding"].includes(mode)) {
      out.onboarding = await runBusinessOnboardingLifecycle(false);
    }
    if (["references", "emails"].includes(mode)) out.external_invoices = await drainExternalInvoices();
    if (["bill_due", "drain"].includes(mode)) {
      out.billing = await billDue();
      out.external_invoices = await drainExternalInvoices();
    }
    if (["grace", "drain", "bill_due"].includes(mode)) out.business_calendar=await runBusinessMaintenanceCycle(db,URL,SERVICE_ROLE);
    if (["grace", "drain"].includes(mode)) {
      const { data, error } = await db.rpc("apply_subscription_grace_controls"); if (error) throw error; out.grace = data;
      out.unpaid_invoices = await queueUnpaidInvoices();
      out.external_invoices = await drainExternalInvoices();
      out.access = await reconcileSubscriptionAccess(false);
    }
    if (mode === "access_dry_run") out.access = await reconcileSubscriptionAccess(true);
    if (mode === "access") out.access = await reconcileSubscriptionAccess(false);
    if (["grace","drain","access","emails"].includes(mode)) out.maintenance_notices=await queueConfirmedMaintenanceNotices(db);
    if (mode === "announcement") out.announcement = await queueAnnouncement();
    if (["emails", "drain", "announcement", "onboarding"].includes(mode)) {
      out.emails = await sendEmails();
      out.restrictions = await finalizeRestrictionsAfterEmailDelivery();
      out.access = await reconcileSubscriptionAccess(false);
    }
    if (["events", "drain"].includes(mode)) out.events = await deliverEvents();
    return json({ success: true, data: out });
  } catch (e) {
    const message = e instanceof Error ? e.message : typeof e === "object" ? JSON.stringify(e) : String(e);
    return json({ success: false, error: message }, 500);
  }
});
