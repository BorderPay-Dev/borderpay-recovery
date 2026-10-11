import { businessActivityHtml, BUSINESS_ACTIVITY_TEXT } from "./activity-guidance.ts";
import { paymentDocumentationHtml, PAYMENT_DOCUMENTATION_TEXT } from "./payment-documentation.ts";
import { htmlLayout, textLayout, firstName, BORDERPAY_BRAND, RenderedEmail } from "../layout.ts";

export interface BusinessFounderWelcomeProps {
  full_name?: string;
  company_name?: string;
}

export function render(p: BusinessFounderWelcomeProps): RenderedEmail {
  const fn = firstName(p.full_name) || "there";
  const company = String(p.company_name || "your business").trim();
  const subject = "Welcome to BorderPay Velocity";
  const heading = "Welcome to BorderPay Velocity";
  const introText = `Hi ${fn}, welcome to BorderPay Velocity for ${company}.`;

  const body = `
    <p style="margin:0 0 12px;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;">
      Your verification answers describe the business activity that will be reviewed. Complete them accurately, and read the account-usage guidance below before sending or receiving payments.
    </p>
    <p style="margin:0 0 12px;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;">
      If your business is already verified, check the information you submitted before your first payment. Growth, new markets or a different funding source may require a profile update.
    </p>
    ${businessActivityHtml()}
    ${paymentDocumentationHtml()}
    <p style="margin:0;color:${BORDERPAY_BRAND.textMuted};font-size:14px;line-height:1.65;">
      Warm regards,<br />
      <strong>Mark Ikaba</strong><br />
      Founder &amp; CEO, BorderPay Velocity
    </p>
  `;

  return {
    subject,
    html: htmlLayout({
      preview: "Welcome to BorderPay Velocity",
      heading,
      introText,
      body,
      ctaText: "Open BorderPay Velocity",
      ctaUrl: `${BORDERPAY_BRAND.appUrl}/dashboard`,
      footerNote: "If you have any questions, just reply to this email.",
    }),
    text: textLayout({
      heading,
      body:
        `Welcome to BorderPay Velocity for ${company}.\n\n` +
        "Your verification answers describe the business activity that will be reviewed. Complete them accurately, and read the account-usage guidance below before sending or receiving payments.\n\n" +
        "If your business is already verified, check the information you submitted before your first payment. Growth, new markets or a different funding source may require a profile update.\n\n" + BUSINESS_ACTIVITY_TEXT + "\n\n" + PAYMENT_DOCUMENTATION_TEXT + "\n\n" +
        "Warm regards,\nMark Ikaba\nFounder & CEO, BorderPay Velocity",
      ctaText: "Open BorderPay Velocity",
      ctaUrl: `${BORDERPAY_BRAND.appUrl}/dashboard`,
      footerNote: "If you have any questions, just reply to this email.",
    }),
  };
}
