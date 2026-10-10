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
  const termsUrl = "https://www.borderpayafrica.com/terms-of-service";
  const requirements = [
    "BorderPay Velocity is for legitimate business activity only. Do not create or continue an account for fraud, money laundering, fabricated transactions or any other unlawful purpose.",
    "You must be ready and able to provide genuine, accurate invoices, signed contracts, bank statements and other supporting evidence when BorderPay Velocity or its banking partners request them during onboarding, due diligence or a transaction review. If you cannot or are unwilling to provide the requested evidence, do not confirm this email or continue opening an account.",
    "Payments are subject to ongoing transaction monitoring, anti-money-laundering and sanctions screening. Checks may take place before settlement and continue afterwards. Additional due diligence, including enhanced due diligence (EDD), is mandatory when required; it cannot be bypassed. Payments may be held, rejected or returned, and account access may be restricted while a review is unresolved.",
    "Keep evidence of the payment purpose, buyer relationship and source of funds, and respond within the deadline in any request for information. Upload sensitive documents only through the secure channel provided by BorderPay Velocity.",
  ];
  const acceptance = 'By clicking "Confirm business email", you confirm that you are authorised to act for your business and agree to BorderPay Velocity’s Terms of Service and the documentation and compliance requirements above.';
  const complianceHtml = `<div style="margin:24px 0;padding:20px;background-color:#F4F6F5;border:1px solid ${BORDERPAY_BRAND.border};border-radius:8px;">
    <h2 style="margin:0 0 12px;font-size:17px;line-height:1.4;color:${BORDERPAY_BRAND.text};">Before you confirm: business account requirements</h2>
    ${requirements.map(message => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.textMuted};">${escapeHtml(message)}</p>`).join("")}
  </div>`;
  const body = `${complianceHtml}${businessActivityHtml()}

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
    </p>
    <p style="margin:20px 0 8px;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.text};">
      Read our <a href="${termsUrl}" style="color:${BORDERPAY_BRAND.success};text-decoration:underline;">Terms of Service</a> before continuing.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.text};">${escapeHtml(acceptance)}</p>`;
  const footerNote = `If you didn't sign up ${escapeHtml(company)}, please ignore this email.`;
  return {
    subject,
    html: htmlLayout({ preview: subject, heading, introText, body, ctaText: "Confirm business email", ctaUrl: p.verification_url, footerNote }),
    text: textLayout({ heading, body: `${company}\n\nBefore you confirm: business account requirements\n\n${requirements.join("\n\n")}\n\n${BUSINESS_ACTIVITY_TEXT}\n\n${PAYMENT_DOCUMENTATION_REQUIREMENT}\n\n${PAYMENT_DOCUMENTATION_OPTIONS}\n\nRead our Terms of Service: ${termsUrl}\n\n${acceptance}\n\nConfirm your email (expires in ${ttl}h):`, ctaText: "Confirm business email", ctaUrl: p.verification_url, footerNote }),
  };
}
