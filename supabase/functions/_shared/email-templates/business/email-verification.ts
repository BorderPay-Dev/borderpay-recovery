import { businessActivityHtml, BUSINESS_ACTIVITY_TEXT } from "./activity-guidance.ts";
import { PAYMENT_DOCUMENTATION_REQUIREMENT, PAYMENT_DOCUMENTATION_OPTIONS } from "./payment-documentation.ts";
import { htmlLayout, textLayout, escapeHtml, BORDERPAY_BRAND, RenderedEmail } from "../layout.ts";

export interface BusinessEmailVerificationProps {
  company_name:      string;
  contact_full_name?:string;
  verification_url:  string;
  expires_in_hours?: number;
}

export function render(p: BusinessEmailVerificationProps): RenderedEmail {
  const ttl     = p.expires_in_hours ?? 24;
  const company = p.company_name || "your business";
  const subject = `Confirm ${company} on BorderPay Velocity`;
  const heading = "Confirm your business email";
  const introText = `Hi ${p.contact_full_name || company}, thanks for setting up ${company} on BorderPay Velocity. Verify this email to unlock onboarding.`;
  const body = `${businessActivityHtml()}

    <p style="margin:0 0 12px;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;text-align:center;">
      Confirm your email to continue business verification. Financial services become available only after the required verification and eligibility checks.
    </p>
    <p style="margin:14px 0 0;font-size:14px;color:${BORDERPAY_BRAND.textMuted};line-height:1.65;text-align:center;">
      ${escapeHtml(PAYMENT_DOCUMENTATION_REQUIREMENT)} ${escapeHtml(PAYMENT_DOCUMENTATION_OPTIONS)}
    </p>
    <p style="margin:14px 0 0;font-size:14px;line-height:1.65;">
      Link expires in <strong style="color:${BORDERPAY_BRAND.text};">${ttl} hour${ttl === 1 ? "" : "s"}</strong>. One-time use.
    </p>
    <p style="margin:18px 0 0;font-size:12px;color:${BORDERPAY_BRAND.textFaint};text-align:center;line-height:1.5;">
      Trouble with the button? Copy and paste this link:
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:${BORDERPAY_BRAND.accent};text-align:center;word-break:break-all;line-height:1.4;">
      ${escapeHtml(p.verification_url)}
    </p>`;
  const footerNote = `If you didn't sign up ${escapeHtml(company)}, please ignore this email.`;
  return {
    subject,
    html: htmlLayout({ preview: subject, heading, introText, body, ctaText: "Verify business email", ctaUrl: p.verification_url, footerNote }),
    text: textLayout({ heading, body: `${company}\n\n${BUSINESS_ACTIVITY_TEXT}\n\n${PAYMENT_DOCUMENTATION_REQUIREMENT}\n\n${PAYMENT_DOCUMENTATION_OPTIONS}\n\nClick to verify (expires in ${ttl}h):`, ctaText: "Verify business email", ctaUrl: p.verification_url, footerNote }),
  };
}
