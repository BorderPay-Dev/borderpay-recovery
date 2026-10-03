import { PAYMENT_DOCUMENTATION_REQUIREMENT, PAYMENT_DOCUMENTATION_OPTIONS, PAYMENT_DOCUMENTATION_REVIEW } from "./payment-documentation.ts";
export const INVOICE_HUB_CAMPAIGN = {
 subject: "Built for your business: invoices & contracts in BorderPay Velocity",
 heading: "Less paperwork. Better-prepared payments.",
 intro: "Built for the way your business moves.",
 understanding: "You are building client relationships, fulfilling orders and managing cash flow across borders. Payment paperwork should not pull you away from that work. BorderPay Velocity brings invoices, agreements and supporting records into the account you already use, so you can spend less time assembling documents and more time running your business.",
 why: "Missing invoices, unclear payment purposes or incomplete contracts can lead to bank reviews, account restrictions, rejected payments or refunds. We built the Invoice & Contract Hub to help you document each payment clearly, reduce avoidable delays and respond more quickly when a bank asks for information.",
 convenience: PAYMENT_DOCUMENTATION_REQUIREMENT + " " + PAYMENT_DOCUMENTATION_OPTIONS,
 features: [
  "Create a branded, itemized invoice in USD, EUR or GBP.",
  "Select an active receiving account to include its bank payment details on the invoice.",
  "Generate a standard B2B agreement using your invoice details and merchant signature, or upload an existing signed contract.",
  "Download the invoice and agreement PDF to share with your buyer.",
    "Upload existing invoices and signed contracts for AI mismatch review and suggested corrections.",
  "Keep purchase orders, store or CRM records, and delivery or warehouse evidence together for payment reviews."
 ],
 steps: "To get started, sign in to the BorderPay Velocity web dashboard, open Quick Actions and select Create Invoice & Contract. Complete your buyer and item details, choose your receiving account, then prepare your agreement and download your documents.",
 reminder: "Ask your buyer to pay from the business named on the invoice and use the payment reference provided. GBP payments are strictly corporate-to-corporate.",
 note: PAYMENT_DOCUMENTATION_REVIEW + " Documents support a bank review but cannot guarantee that a payment will avoid a hold, rejection or refund. A standard agreement may need adapting to your business and transaction.",
 cta: "Open Invoice & Contract Hub",
 url: "https://app.borderpayafrica.com"
} as const;
