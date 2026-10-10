import { BORDERPAY_BRAND, escapeHtml } from "../layout.ts";

export const BUSINESS_ACCOUNT_USAGE_GUIDANCE = [
  "Before sending or receiving money, review the business activity, expected payment volumes, source of funds and countries submitted during verification. Your account must be used consistently with that reviewed profile and its account-specific rules. If you do not remember your answers, contact compliance to confirm what is recorded and request a secure update link; do not guess.",
  "Transaction volume means how much you expect to send and receive, over a stated period. Source of funds means where the money comes from, such as customer sales, company funds or financing. The verification questionnaire may ask for both. Declare them separately and keep invoices, contracts or other evidence supporting the funding source.",
  "Give realistic monthly and annual incoming and outgoing totals, typical and largest payments, frequency and seasonal peaks. For example, declaring US$15,000 monthly but receiving more than US$20,000 in one week is a material mismatch. It may trigger further information requests or a payment review. Request an update before expected growth changes your payment pattern; if the mismatch has already happened, contact compliance before further unusual payments. Do not inflate a forecast or split payments to avoid review.",
  "Declare cross-border activity and the countries of your customers, suppliers, senders and beneficiaries. If your verification answers state that you do not trade cross-border, do not assume approval covers a new international payment flow. For example, a business describing EEA-only trade should disclose expected UK payments and their commercial rationale before receiving them. Your public website, business description and documents must describe your real activities consistently. Ask compliance to confirm the appropriate account use while the profile update is reviewed.",
  "Keep itemized invoices, signed contracts, buyer details, source-of-funds evidence and relevant delivery or service records ready. Use the BorderPay Invoice & Contract Hub to prepare documents or upload your own for consistency review. If a payment is already under review, respond to the existing information request and obtain guidance before initiating further payments through the affected route.",
  "Contact BorderPay Velocity Compliance through support@borderpayafrica.com to confirm your recorded profile or request a secure update link. Never email passwords or identity documents. A profile update does not automatically approve a transfer, release held funds or remove a restriction. Accurate declarations reduce avoidable mismatches; they cannot guarantee that a bank will never request further information."
] as const;
export const BUSINESS_ACTIVITY_GUIDANCE = [
  "BorderPay Velocity's business onboarding standard is expected payment volume of US$100,000 or more per month and US$1 million–US$9.99 million per year (or currency equivalent). If your genuine forecast is outside these levels, contact our compliance team before proceeding. These are BorderPay's onboarding criteria, not a universal bank rule or a definition of whether a company is a business. Select a US$100,000+ band only when your forecast supports it; uncertainty is not a reason to choose a higher band.",
  ...BUSINESS_ACCOUNT_USAGE_GUIDANCE
] as const;
export const BUSINESS_ACTIVITY_TEXT = BUSINESS_ACTIVITY_GUIDANCE.join("\n\n");
export const BUSINESS_ACCOUNT_USAGE_TEXT = BUSINESS_ACCOUNT_USAGE_GUIDANCE.join("\n\n");
function guidanceHtml(heading: string, paragraphs: readonly string[]): string {
  return `<section style="margin:24px 0;padding:20px;background:#F4F6F5;border:1px solid ${BORDERPAY_BRAND.border};border-radius:8px;">`
    + `<h2 style="margin:0 0 12px;font-size:17px;">${escapeHtml(heading)}</h2>`
    + paragraphs.map(text => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.textMuted};">${escapeHtml(text)}</p>`).join("") + "</section>";
}
export function businessActivityHtml(): string { return guidanceHtml("Before you complete business verification", BUSINESS_ACTIVITY_GUIDANCE); }
export function businessAccountUsageHtml(): string { return guidanceHtml("Before you use your business account", BUSINESS_ACCOUNT_USAGE_GUIDANCE); }
