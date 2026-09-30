import { paymentDocumentationHtml } from "../_shared/email-templates/business/payment-documentation.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOGO_URL = 'https://www.borderpayafrica.com/assets/brand/borderpay-velocity-white.png';
const APP_URL = 'https://app.borderpayafrica.com';
const YEAR = new Date().getFullYear();

function baseTemplate(content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head><body style="margin:0;padding:0;background-color:#0B0E11;font-family:'Inter','Helvetica Neue',Arial,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0E11;min-height:100vh;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#13171C;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;"><tr><td style="height:3px;background:linear-gradient(90deg,#C7FF00,#9ECC00);"></td></tr><tr><td align="center" style="padding:36px 32px 24px;"><img src="${LOGO_URL}" alt="BorderPay Velocity" width="160" style="display:block;width:160px;max-width:100%;height:auto;"/><p style="margin:12px 0 0;font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">BorderPay Velocity</p></td></tr>${content}<tr><td style="padding:0 32px;"><div style="height:1px;background-color:rgba(255,255,255,0.06);"></div></td></tr><tr><td style="padding:24px 32px 32px;"><p style="margin:0;font-size:11px;color:#4B5563;text-align:center;">&copy; ${YEAR} BorderPay Africa, Inc. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    let { email, first_name, type, userId } = body;
    // type: 'submitted' | 'verified' | 'failed' | 'onboarding'

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Missing RESEND_API_KEY' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If userId provided but no email, look up from DB
    if (userId && !email) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      if (profile) {
        email = profile.email;
        if (!first_name) first_name = profile.full_name?.split(' ')[0] || 'there';
      }
    }

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: 'No email found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const name = first_name || 'there';
    let subject = '';
    let content = '';

    if (type === 'submitted') {
      subject = 'Document received \u2014 verification in progress';
      content = `<tr><td style="padding:0 32px 32px;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;text-align:center;">Document Received</h1><p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;text-align:center;line-height:1.6;">Hey ${name}, we've received your identity document and it's now being reviewed by our verification team.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:20px;background-color:rgba(199,255,0,0.06);border-radius:12px;border:1px solid rgba(199,255,0,0.12);"><p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#C7FF00;">What happens next?</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#128269;&nbsp;&nbsp;Our team reviews your document for authenticity</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#9202;&nbsp;&nbsp;This typically takes <strong style="color:#FFFFFF;">1-2 business days</strong></td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#128232;&nbsp;&nbsp;You'll receive an email when verification is complete</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#9989;&nbsp;&nbsp;You can continue using BorderPay Velocity in the meantime</td></tr></table></td></tr></table><p style="margin:0;font-size:12px;color:#6B7280;text-align:center;">No action is required from you at this time. We'll notify you as soon as the review is complete.</p></td></tr>`;
    }

    else if (type === 'verified') {
      subject = 'Identity verified \u2014 all features unlocked!';
      content = `<tr><td style="padding:0 32px 32px;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;text-align:center;">Identity Verified!</h1><p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;text-align:center;line-height:1.6;">Congratulations ${name}! Your identity has been successfully verified. All premium features are now unlocked.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:20px;background-color:rgba(199,255,0,0.06);border-radius:12px;border:1px solid rgba(199,255,0,0.12);"><p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#C7FF00;">You now have access to</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#x2713;&nbsp;&nbsp;Virtual &amp; Physical Cards</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#x2713;&nbsp;&nbsp;International Transfers</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#x2713;&nbsp;&nbsp;Instant Settlements</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#x2713;&nbsp;&nbsp;Higher Transaction Limits</td></tr></table></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${APP_URL}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#C7FF00;color:#0B0E11;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Open BorderPay Velocity</a></td></tr></table></td></tr>`;
    }

    else if (type === 'failed') {
      subject = 'Verification unsuccessful \u2014 please try again';
      content = `<tr><td style="padding:0 32px 32px;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;text-align:center;">Verification Unsuccessful</h1><p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;text-align:center;line-height:1.6;">Hey ${name}, unfortunately we were unable to verify your identity document. This can happen for several reasons.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:20px;background-color:rgba(239,68,68,0.06);border-radius:12px;border:1px solid rgba(239,68,68,0.12);"><p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#EF4444;">Common reasons</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#8226;&nbsp;&nbsp;Document image was blurry or partially covered</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#8226;&nbsp;&nbsp;Selfie didn't clearly show your face</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#8226;&nbsp;&nbsp;Document type didn't match the selection</td></tr><tr><td style="padding:6px 0;font-size:13px;color:#D1D5DB;line-height:1.5;">&#8226;&nbsp;&nbsp;Document is expired</td></tr></table></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${APP_URL}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#C7FF00;color:#0B0E11;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Try Again</a></td></tr></table><p style="margin:20px 0 0;font-size:12px;color:#6B7280;text-align:center;">If you continue experiencing issues, please contact support at infos@borderpayafrica.com</p></td></tr>`;
    }

    else if (type === 'onboarding') {
      subject = 'Welcome to BorderPay Velocity \u2014 get started in 3 steps';
      content = `<tr><td style="padding:0 32px 32px;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#FFFFFF;text-align:center;">Welcome to BorderPay Velocity!</h1><p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;text-align:center;line-height:1.6;">Hey ${name}, your account has been created! Here's how to get the most out of BorderPay Velocity.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="padding:20px;background-color:rgba(199,255,0,0.06);border-radius:12px;border:1px solid rgba(199,255,0,0.12);"><p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#C7FF00;">Get started in 3 steps</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="32" valign="top"><div style="width:24px;height:24px;border-radius:50%;background-color:rgba(199,255,0,0.2);color:#C7FF00;font-size:12px;font-weight:700;text-align:center;line-height:24px;">1</div></td><td style="padding-left:12px;"><p style="margin:0;font-size:13px;color:#FFFFFF;font-weight:600;">Verify Your Identity</p><p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;line-height:1.4;">Complete KYC to unlock all features. Just your ID and a selfie.</p></td></tr></table></td></tr><tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="32" valign="top"><div style="width:24px;height:24px;border-radius:50%;background-color:rgba(199,255,0,0.2);color:#C7FF00;font-size:12px;font-weight:700;text-align:center;line-height:24px;">2</div></td><td style="padding-left:12px;"><p style="margin:0;font-size:13px;color:#FFFFFF;font-weight:600;">Set Up Security</p><p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;line-height:1.4;">Create a PIN and enable 2FA to protect your account.</p></td></tr></table></td></tr><tr><td style="padding:10px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="32" valign="top"><div style="width:24px;height:24px;border-radius:50%;background-color:rgba(199,255,0,0.2);color:#C7FF00;font-size:12px;font-weight:700;text-align:center;line-height:24px;">3</div></td><td style="padding-left:12px;"><p style="margin:0;font-size:13px;color:#FFFFFF;font-weight:600;">Add Funds &amp; Start Transacting</p><p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;line-height:1.4;">Fund your wallet and enjoy borderless payments across Africa.</p></td></tr></table></td></tr></table></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${APP_URL}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#C7FF00;color:#0B0E11;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Open BorderPay Velocity</a></td></tr></table><p style="margin:20px 0 0;font-size:12px;color:#6B7280;text-align:center;">Questions? Reach us at infos@borderpayafrica.com</p></td></tr>`;
    }

    else {
      return new Response(JSON.stringify({ success: false, error: 'Invalid type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = baseTemplate(content);

    if (type === 'onboarding') content += `<tr><td style="padding:0 32px;">${paymentDocumentationHtml()}</td></tr>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'BorderPay Velocity <noreply@borderpayafrica.com>',
        to: [email],
        subject: `${subject} \u2014 BorderPay Velocity`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ success: false, error: data.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Email sent: type=${type} to=${email} id=${data.id}`);
    return new Response(JSON.stringify({ success: true, id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-kyc-status-email error:', e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Email request failed" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
