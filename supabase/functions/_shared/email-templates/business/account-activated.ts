import { businessAccountUsageHtml, BUSINESS_ACCOUNT_USAGE_TEXT } from "./activity-guidance.ts";
import {invoiceHubNoteHtml,INVOICE_HUB_NOTE_TEXT} from "./invoice-contract-hub.ts";
import { htmlLayout, textLayout, escapeHtml, BORDERPAY_BRAND, RenderedEmail } from "../layout.ts";

export interface BusinessAccountActivatedProps {
  company_name:    string;
  contact_full_name?: string;
}

export function render(p: BusinessAccountActivatedProps): RenderedEmail {
  const company = p.company_name || "your business";
  const subject = `${company} is live on BorderPay Velocity`;
  const heading = "Your business is live";
  const introText = `${company} is active on BorderPay Velocity. Before your first payment, review how your account may be used.`;
  const body = `
    <p style="margin:0 0 12px;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;">
      Open your dashboard to see the wallets, receiving accounts and payment routes enabled for your business. Availability depends on your account and the applicable payment rules.
    </p>
    ${businessAccountUsageHtml()}
    ${invoiceHubNoteHtml()}`;
  return {
    subject,
    html: htmlLayout({
      preview: subject, heading, introText, body,
      ctaText: "Open BorderPay Velocity", ctaUrl: BORDERPAY_BRAND.appUrl,
    }),
    text: textLayout({
      heading,
      body: `${company} is active on BorderPay Velocity. Open your dashboard to see the products enabled for your business.\n\n${BUSINESS_ACCOUNT_USAGE_TEXT}\n\n${INVOICE_HUB_NOTE_TEXT}`,
      ctaText: "Open BorderPay Velocity", ctaUrl: BORDERPAY_BRAND.appUrl,
    }),
  };
}
