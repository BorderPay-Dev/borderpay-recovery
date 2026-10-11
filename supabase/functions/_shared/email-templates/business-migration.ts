import { EUR_TRANSITION_NOTICE } from "./eur-transition-20261005.ts";
import { BUSINESS_MIGRATION_NOTICE as copy } from "./business-migration-copy.ts";
import { htmlLayout, textLayout, escapeHtml, type RenderedEmail } from "./layout.ts";
export function renderMigrationNotice(props: { company_name?: string; notice_version?: string } = {}): RenderedEmail {
  if (props.notice_version === "eur_transition_20261005_v1") return { ...EUR_TRANSITION_NOTICE };
  const greeting = props.company_name ? `Hello ${props.company_name},` : "Hello,";
  const paragraph = (s: string) => `<p style="margin:0 0 16px;">${escapeHtml(s)}</p>`;
  const body = [greeting, copy.intro, copy.continuity].map(paragraph).join("")
    + copy.items.map(item => `<h3 style="font-size:17px;margin:24px 0 8px;">${escapeHtml(item.title)}</h3>${paragraph(item.text)}`).join("")
    + [copy.closing, copy.support, "Thank you,", "The BorderPay Velocity Team"].map(paragraph).join("");
  return { subject: copy.subject,
    html: htmlLayout({preview:copy.preview,heading:copy.heading,body,ctaText:copy.cta,ctaUrl:copy.url}),
    text: textLayout({heading:copy.heading,body:[greeting,copy.intro,copy.continuity,...copy.items.map(i=>`${i.title}: ${i.text}`),copy.closing,copy.support,"Thank you, The BorderPay Velocity Team"].join("\n\n"),ctaText:copy.cta,ctaUrl:copy.url}) };
}
