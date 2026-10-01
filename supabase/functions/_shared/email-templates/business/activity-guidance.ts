import { BORDERPAY_BRAND, escapeHtml } from "../layout.ts";

export const BUSINESS_ACTIVITY_GUIDANCE = [
  "BorderPay Velocity's business onboarding standard is expected payment volume of US$100,000 or more per month and at least US$1 million per year (or currency equivalent). If your genuine forecast is below these levels, contact our compliance team before proceeding. These are BorderPay's onboarding criteria, not a universal bank rule or a definition of whether a company is a business.",
  "Declare your actual expected monthly and annual payment volumes, typical and largest transaction sizes, payment frequency and source of funds. Your estimates must be realistic, consistent and supported by your business activity. Never choose a higher range simply to qualify, avoid a review or obtain account approval.",
  "Disclose every country where you operate, sell, expect buyers or receive payments, including cross-border activity. Explain your products or services and keep your application, website and commercial documents consistent with your actual operations. For example, a business declaring EEA-only customers should tell us before accepting payments from UK buyers and provide the commercial explanation and supporting documents.",
  "If actual payments materially exceed your declared activity or involve undeclared markets, a payment or account may be reviewed and further information requested. For example, declaring US$15,000 monthly but reaching that amount in one payment or one week may require an updated forecast, invoices, contracts and evidence of the underlying business activity. No specific threshold guarantees a hold or exemption from review.",
  "Contact BorderPay Velocity Compliance through support@borderpayafrica.com to request a secure business-profile update link before your activity changes materially. Keep invoices, signed contracts, buyer details and delivery or service evidence ready. An update does not automatically approve a payment or remove an existing restriction."
] as const;
export const BUSINESS_ACTIVITY_TEXT = BUSINESS_ACTIVITY_GUIDANCE.join("\n\n");
export function businessActivityHtml(): string {
  return `<section style="margin:24px 0;padding:20px;background:#F4F6F5;border:1px solid ${BORDERPAY_BRAND.border};border-radius:8px;">`
    + `<h2 style="margin:0 0 12px;font-size:17px;">Before you complete business verification</h2>`
    + BUSINESS_ACTIVITY_GUIDANCE.map(text => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.textMuted};">${escapeHtml(text)}</p>`).join("") + "</section>";
}
