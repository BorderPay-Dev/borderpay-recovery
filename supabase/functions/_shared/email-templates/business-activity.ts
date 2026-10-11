import { BUSINESS_ACCOUNT_USAGE_TEXT, businessAccountUsageHtml } from "./business/activity-guidance.ts";
import { BUSINESS_ACTIVITY_NOTICE as copy } from "./business-activity-copy.ts";
import { htmlLayout, textLayout, escapeHtml, type RenderedEmail } from "./layout.ts";
export function renderBusinessActivityNotice(props: { company_name?: string; usage_notice?: boolean; account_paused?: boolean } = {}): RenderedEmail {
  if (props.usage_notice === true) {
    const greeting = props.company_name ? `Hello ${props.company_name},` : "Hello,";
    const heading = "Keep your business payment profile accurate";
    const intro = props.account_paused === true
      ? "Your account is currently paused. If your case is under compliance review, continue responding through the existing case with requested evidence and any corrections to your declared activity. This notice is guidance only: it does not approve your case or permit payments. Wait for confirmation before resuming affected payments."
      : "Please check that the information submitted during verification still reflects how your business operates. If your payment volumes, source of funds or markets have changed, contact compliance to review your profile before further unusual activity.";
    const rails = "Where your account permits USD receipts from individual commercial buyers or senders, each payment must be strictly below US$4,000. Do not split payments to bypass this rule. GBP payments are strictly business-to-business: the sending business must match the buyer named on the invoice. Account-specific restrictions still apply.";
    const closing = "This guidance does not change your account permissions or any existing restriction. Accurate information and supporting evidence help the review; they do not guarantee approval or prevent every payment hold.";
    const paragraph = (value: string) => `<p style="margin:0 0 16px;">${escapeHtml(value)}</p>`;
    const cta = { ctaText: "Contact BorderPay Compliance", ctaUrl: "mailto:support@borderpayafrica.com?subject=Business%20account%20profile%20review" };
    return {
      subject: props.account_paused === true ? "Your compliance review: check your business payment profile" : "Action required: review your business account usage",
      html: htmlLayout({heading, preview: "Review declared volumes, source of funds and cross-border markets.", body: paragraph(greeting)+paragraph(intro)+businessAccountUsageHtml()+paragraph(rails)+paragraph(closing)+paragraph("BorderPay Velocity Compliance Desk"), ...cta}),
      text: textLayout({heading, body:[greeting,intro,BUSINESS_ACCOUNT_USAGE_TEXT,rails,closing,"BorderPay Velocity Compliance Desk"].join("\n\n"), ...cta}),
    };
  }
  const greeting = props.company_name ? `Hello ${props.company_name},` : "Hello,";
  const paragraph = (s: string) => `<p style="margin:0 0 16px;">${escapeHtml(s)}</p>`;
  const body = [greeting, copy.intro, copy.continuity].map(paragraph).join("")
    + copy.items.map(item => `<h3 style="font-size:17px;margin:24px 0 8px;">${escapeHtml(item.title)}</h3>${paragraph(item.text)}`).join("")
    + [copy.closing, copy.support, "Thank you,", "The BorderPay Velocity Team"].map(paragraph).join("");
  return { subject: copy.subject,
    html: htmlLayout({preview:copy.preview,heading:copy.heading,body,ctaText:copy.cta,ctaUrl:copy.url}),
    text: textLayout({heading:copy.heading,body:[greeting,copy.intro,copy.continuity,...copy.items.map(i=>`${i.title}: ${i.text}`),copy.closing,copy.support,"Thank you, The BorderPay Velocity Team"].join("\n\n"),ctaText:copy.cta,ctaUrl:copy.url}) };
}
