import { escapeHtml } from "../layout.ts";

export const ACCOUNT_PROFILE_GUIDANCE = [
  { title: "Operate within your verified business profile", text: "Your account is reviewed against the business activity, source of funds, expected sending and receiving volumes, transaction sizes, frequency and countries declared during verification. Keep actual payments consistent with that profile and the account-specific rules. A rail with no published standard maximum does not mean unlimited or automatically approved transactions." },
  { title: "Declare realistic sending and receiving volumes", text: "Estimate both incoming and outgoing monthly and annual totals, your typical and largest payments, frequency and seasonal peaks. Select US$100,000+ monthly only when that is a realistic, supportable forecast. If you are unsure, use expected sales, signed contracts and your payment pipeline to prepare an estimate and contact compliance for guidance. Do not select a higher band simply because you do not know your volume." },
  { title: "Update your profile before activity changes materially", text: "For example, if you declared US$15,000 per month but receive or send that amount in one transaction or one week, request a profile update before further activity exceeds the declared pattern. Unexpected activity may lead to a payment hold or a request for further information. Reaching a declared figure is not evidence of an automatic hold on the next transfer. Do not split payments to avoid review." },
  { title: "Explain your source of funds", text: "Declare how your business obtains the money it sends and receives, including customer sales, company funds or financing where applicable. Keep evidence of the buyer, commercial relationship, payment purpose and origin of the funds. Tell compliance when the funding source or payment flow changes." },
  { title: "Declare cross-border trade and payment countries", text: "List where customers and suppliers are based and where payments are expected to come from or go to. Incorporation country alone does not describe your markets. If your website and verification description say EEA-only trade but you expect UK payments, disclose that expansion and its commercial rationale before the payment. Keep your public website, business description, invoices and contracts consistent with your actual activity. Undeclared countries or inconsistent information may require further review." },
  { title: "Prepare evidence and request an update", text: "Keep itemized invoices, signed contracts, buyer details and relevant delivery or service evidence ready. Use the BorderPay Invoice & Contract Hub to prepare documents or upload your own for consistency review. Contact BorderPay support through your account to request a secure business-profile update link. Do not send identity documents or passwords by ordinary email." },
  { title: "If a transfer is already under review", text: "Reply to the existing information request with the requested evidence and obtain guidance before submitting further payments through the affected route. A profile update does not automatically release a held transfer or remove a restriction. Accurate information reduces avoidable mismatches; it cannot guarantee that a bank will never review a payment." },
] as const;

export function accountProfileGuidanceHtml(): string {
  return `<div style="margin:0 0 20px;padding:16px;border:1px solid #D8DED8;border-radius:10px;background:#FFFFFF;text-align:left;">
    <h2 style="margin:0 0 12px;color:#111111;font-size:16px;">Required: keep your business payment profile accurate</h2>
    ${ACCOUNT_PROFILE_GUIDANCE.map(item => `<p style="margin:0 0 14px;color:#111111;font-size:13px;line-height:1.65;"><strong>${escapeHtml(item.title)}</strong><br />${escapeHtml(item.text)}</p>`).join("")}
  </div>`;
}
export function accountProfileGuidanceText(): string {
  return ["Required: keep your business payment profile accurate", ...ACCOUNT_PROFILE_GUIDANCE.map(item => `${item.title}\n${item.text}`)].join("\n\n");
}
