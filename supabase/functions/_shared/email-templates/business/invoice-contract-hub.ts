import { PAYMENT_DOCUMENTATION_TEXT } from "./payment-documentation.ts";
import {INVOICE_HUB_CAMPAIGN} from "./invoice-contract-hub-copy.ts";
import {htmlLayout,textLayout,BORDERPAY_BRAND,type RenderedEmail} from "../layout.ts";

export const INVOICE_HUB_NOTE_TEXT = PAYMENT_DOCUMENTATION_TEXT + " GBP payments must be corporate-to-corporate.";
export function invoiceHubNoteHtml():string{
 return '<p style="margin:18px 0 0;color:'+BORDERPAY_BRAND.textMuted+';font-size:14px;line-height:1.65;">'+INVOICE_HUB_NOTE_TEXT+'</p>';
}
export function render():RenderedEmail{
 const {subject,heading,intro:introText,understanding,why,convenience,features,steps,reminder,note}=INVOICE_HUB_CAMPAIGN;
 const paragraph=(text:string)=>'<p style="margin:0 0 16px;">'+text+'</p>';
 const body=paragraph("Hello,")+paragraph(understanding)+paragraph(why)+paragraph(convenience)
  +'<ul style="margin:0 0 20px;padding-left:20px;">'+features.map(x=>'<li style="margin-bottom:8px;">'+x+'</li>').join('')+'</ul>'
  +paragraph(steps)+paragraph(reminder)
  +'<p style="font-size:12px;line-height:1.6;color:'+BORDERPAY_BRAND.textFaint+';">'+note+'</p>';
 return {subject,html:htmlLayout({preview:"Prepare payment paperwork in BorderPay Velocity and help reduce avoidable delays.",heading,introText,body,ctaText:"Open Invoice & Contract Hub",ctaUrl:BORDERPAY_BRAND.appUrl}),
 text:textLayout({heading,body:[introText,understanding,why,convenience,...features,steps,reminder,note].join("\n\n"),ctaText:"Open BorderPay Velocity",ctaUrl:BORDERPAY_BRAND.appUrl})};
}
