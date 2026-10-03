import { BORDERPAY_BRAND, escapeHtml } from "../layout.ts";

export const PAYMENT_DOCUMENTATION_REQUIREMENT = "Business account requirement: you must agree to support your business payments with accurate invoices and contracts. If you do not agree to this requirement, BorderPay Velocity cannot offer you a business account.";
export const PAYMENT_DOCUMENTATION_OPTIONS = "We recommend the Invoice & Contract Hub: create your invoices and agreements inside BorderPay Velocity, or upload your own invoices and signed contracts. You do not need to replace documents you already use.";
export const PAYMENT_DOCUMENTATION_REVIEW = "Our AI can review uploaded documents for mismatches in buyer and seller names, amounts, currencies and commercial scope, and suggest corrections. Review the findings and correct your documents before asking your customer to pay. AI review does not certify authenticity or guarantee bank approval.";
export const PAYMENT_DOCUMENTATION_REASON = "Clear payment paperwork helps reduce avoidable bank reviews, account restrictions, rejected payments and refunds. Banks may still request additional information or place a payment under review.";
export const PAYMENT_DOCUMENTATION_TEXT = [PAYMENT_DOCUMENTATION_REQUIREMENT, PAYMENT_DOCUMENTATION_OPTIONS, PAYMENT_DOCUMENTATION_REVIEW, PAYMENT_DOCUMENTATION_REASON].join("\n\n");
export function paymentDocumentationHtml(): string {
  return `<div style="margin:24px 0;padding:20px;background-color:#F4F6F5;border:1px solid ${BORDERPAY_BRAND.border};border-radius:8px;">` +
    `<h2 style="margin:0 0 12px;font-size:17px;line-height:1.4;color:${BORDERPAY_BRAND.text};">Invoices and contracts for your business payments</h2>` +
    [PAYMENT_DOCUMENTATION_REQUIREMENT, PAYMENT_DOCUMENTATION_OPTIONS, PAYMENT_DOCUMENTATION_REVIEW, PAYMENT_DOCUMENTATION_REASON]
      .map(text => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${BORDERPAY_BRAND.textMuted};">${escapeHtml(text)}</p>`).join("") + "</div>";
}
