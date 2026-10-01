import { businessAccountUsageHtml, BUSINESS_ACCOUNT_USAGE_TEXT } from "./activity-guidance.ts";
import {invoiceHubNoteHtml,INVOICE_HUB_NOTE_TEXT} from "./invoice-contract-hub.ts";
import { htmlLayout, textLayout, escapeHtml, BORDERPAY_BRAND, RenderedEmail } from "../layout.ts";

export interface BusinessKybDecisionProps {
  company_name:  string;
  decision:      "approved" | "rejected";
  reason?:       string;
  next_steps?:   string;
}

export function render(p: BusinessKybDecisionProps): RenderedEmail {
  const company  = p.company_name || "your business";
  const approved = p.decision === "approved";

  const subject = approved
    ? `${company} has been verified on BorderPay Velocity`
    : `Action required — ${company} needs more KYB info`;

  const heading = approved ? "KYB approved" : "We need a bit more information";
  const introText = approved
    ? `${company} has passed business verification. Open your dashboard to see the products available for your account.`
    : `Compliance reviewed your KYB submission for ${company} and couldn't fully verify it. Our team needs to review the account before any next step is opened.`;

  const reasonBlock = !approved && p.reason
    ? `<div style="background:${BORDERPAY_BRAND.bg};border-left:3px solid ${BORDERPAY_BRAND.warning};padding:14px 16px;border-radius:6px;margin:12px 0;color:${BORDERPAY_BRAND.text};font-size:14px;line-height:1.55;">${escapeHtml(p.reason)}</div>`
    : "";

  const nextSteps = !approved
    ? (p.next_steps || `Please contact ${BORDERPAY_BRAND.supportEmail}. If additional information is required, our compliance team will send the next secure verification step.`)
    : "";

  const body = approved
    ? `<p style="margin:0;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;text-align:center;">
         Before making or receiving payments, review the business profile submitted for ${escapeHtml(company)} and the account rules shown in your dashboard.
       </p>${businessAccountUsageHtml()}${invoiceHubNoteHtml()}`
    : `${reasonBlock}
       ${nextSteps ? `<p style="margin:14px 0 0;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;">${escapeHtml(nextSteps)}</p>` : ""}`;

  const ctaText = approved ? "Open BorderPay Velocity" : "Contact support";
  const ctaUrl  = approved ? BORDERPAY_BRAND.appUrl : `mailto:${BORDERPAY_BRAND.supportEmail}`;

  return {
    subject,
    html: htmlLayout({
      preview: subject, heading, introText, body, ctaText, ctaUrl,
      brandTone: approved ? "default" : "warning",
    }),
    text: textLayout({
      heading,
      body: approved
        ? `${company} has passed business verification. Open your dashboard to see the products available for your account.\n\n${BUSINESS_ACCOUNT_USAGE_TEXT}\n\n${INVOICE_HUB_NOTE_TEXT}`
        : `${company} needs more KYB info.\nReviewer notes: ${p.reason || "—"}\nNext steps: ${nextSteps}`,
      ctaText, ctaUrl,
    }),
  };
}
