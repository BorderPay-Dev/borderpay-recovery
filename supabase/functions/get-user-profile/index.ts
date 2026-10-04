import {migrationProfileProjection} from '../_shared/kyb-migration-presentation.ts';
import {pausedBusinessReviewProjection} from '../_shared/paused-business-review.ts';
// get-user-profile — provider-neutral; email_confirmed
// derived from auth.users.email_confirmed_at.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate above, then fetch setup/profile data in one database request.
    // No provider or KYB-host network dependency sits on dashboard rendering.
    const { data: context, error: contextError } = await supabase.rpc('profile_setup_context', { p_user: user.id });
    if (contextError || !context) {
      return new Response(JSON.stringify({success:false,error:'Your profile is temporarily unavailable. Please try again.'}),{status:503,headers:{...corsHeaders,'Content-Type':'application/json'}});
    }
    const { profile, userData, securityData, business } = context;
    const accountType = profile?.account_type || userData?.account_type || 'individual';
    const bridgeKybStatus = business?.bridge_kyb_status ?? null;
    const businessIncorporationCountry = business?.country ?? null;
    const portalStatus: string | null = context.portalStatus || null;
    const reviewOnly = context.reviewOnly === true;

    // The single source of truth for email-confirmed state is
    // auth.users.email_confirmed_at. Anything else (cached profile rows,
    // metadata flags) can lag behind the verification webhook.
    const emailConfirmed   = !!user.email_confirmed_at;
    const emailConfirmedAt = user.email_confirmed_at || null;
    const localAccountStatus = String(profile?.account_status || "").trim().toLowerCase();
    const providerAccountStatus = String(profile?.bridge_account_status || "").trim().toLowerCase();
    const blockedStatuses = new Set(["frozen", "paused", "suspended", "offboarded", "deactivated", "closed"]);
    const accountAccessRestricted = blockedStatuses.has(localAccountStatus) || blockedStatuses.has(providerAccountStatus);
    const normalizedBusinessKybStatus = String(bridgeKybStatus || "").trim().toLowerCase();
    const ownershipDetailsRequired = accountType === "business" && (
      ["awaiting_ubo", "needs_ubos"].includes(providerAccountStatus)
      || ["awaiting_ubo", "needs_ubos"].includes(normalizedBusinessKybStatus)
    );
    const restartableBusinessVerification = accountType === "business" && (
      ownershipDetailsRequired
      || providerAccountStatus === "incomplete"
      || normalizedBusinessKybStatus === "incomplete"
    );
    // Existing native clients reliably restart from their ToS screen, but can
    // fail when an incomplete/ownership-required Persona URL is opened directly.
    // Preserve provider truth in the dedicated raw fields while presenting the
    // retryable flow as not_started until Bridge reaches a terminal/review state.
    const clientBusinessKybStatus = restartableBusinessVerification ? "not_started" : bridgeKybStatus;
    const clientBridgeAccountStatus = accountAccessRestricted
      ? "paused"
      : restartableBusinessVerification
        ? "not_started"
        : (profile?.bridge_account_status || null);

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id:                  user.id,
          email:               user.email,
          email_confirmed:     emailConfirmed,
          email_confirmed_at:  emailConfirmedAt,
          full_name:           profile?.full_name || userData?.full_name || null,
          phone:               profile?.phone || userData?.phone || null,
          country:             profile?.country || userData?.country || null,
          account_type:        accountType,
          business_incorporation_country: businessIncorporationCountry,
          company_name: business?.company_name || null,
          registration_number: business?.registration_number || null,
          kyc_status:          profile?.kyc_status || userData?.kyc_status || "unverified",
          kyc_level:           profile?.kyc_level || 0,
          wallet_activated:    userData?.wallet_activated || false,
          bridge_customer_id:  profile?.bridge_customer_id || null,
          bridge_kyc_status:   profile?.bridge_kyc_status || null,
          // Older released clients only recognize `paused` as the shell-level
          // access hold. Preserve the raw provider state separately while
          // projecting every terminal/frozen state into that compatibility flag.
          bridge_account_status: clientBridgeAccountStatus,
          bridge_provider_account_status: profile?.bridge_account_status || null,
          bridge_account_paused_at: profile?.bridge_account_paused_at || null,
          account_status: profile?.account_status || null,
          account_frozen_at: profile?.account_frozen_at || null,
          account_frozen_reason: profile?.account_frozen_reason || null,
          account_access_restricted: accountAccessRestricted,
          bridge_kyb_status:   portalStatus || clientBusinessKybStatus,
          verification_status: portalStatus,
          verification_source: portalStatus ? "borderpay" : null,
          bridge_provider_kyb_status: bridgeKybStatus,
          address:             profile?.address || null,
          city:                profile?.city || null,
          state:               profile?.state || null,
          postal_code:         profile?.postal_code || null,
          date_of_birth:       profile?.date_of_birth || null,
          language:            profile?.language || "en",
          profile_picture_url: profile?.profile_picture_url || null,
          address_verification_status: profile?.address_verification_status || "none",
          pin_set:             securityData?.pin_set || false,
          two_factor_enabled:  securityData?.two_factor_enabled || false,
          last_sign_in_at:     user.last_sign_in_at || null,
          created_at:          profile?.created_at || userData?.created_at,
          updated_at:          profile?.updated_at || userData?.updated_at,
          ...pausedBusinessReviewProjection(reviewOnly),
          ...migrationProfileProjection(context.migration),
        },
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected profile error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
