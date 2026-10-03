import assert from "node:assert/strict";
import { renderTemplate, TEMPLATES, type TemplateName } from "../supabase/functions/_shared/email-templates/index.ts";
import { applyWhiteLabelEmail } from "../supabase/functions/_shared/white-label-email.ts";
export const fixture = {
 company_name: "Aster Trading Ltd",full_name:"Alex Morgan",contact_full_name:"Alex Morgan",customer_name:"Aster Trading Ltd",currency:"USD",amount:29.99,
 billing_period:"2026-09-30",payment_link:"https://checkout.flutterwave.com/v3/hosted/pay/example",transaction_reference:"synthetic-reference",
 outcome:"completed",decision:"approved",notes:"Synthetic review notes",review_id:"synthetic-review",transition_status:"paused",stage:"day_1",
 verification_url:"https://app.borderpayafrica.com/auth/verify?token=synthetic-only&purpose=signup_business",
 reset_url:"https://app.borderpayafrica.com/auth/reset#synthetic-only",invite_url:"https://portal.borderpayafrica.com/auth/callback#synthetic-only",
 team_name:"Aster team",inviter_name:"Alex",date:"2026-09-30",invoice_number:"TEST-001",period_start:"2026-09-01",period_end:"2026-09-30",due_at:"2026-10-01",total:29.99,
 ios_available:true,
};
Deno.test("every registered template renders with Velocity branding and correct legal entity",()=>{
 for(const name of Object.keys(TEMPLATES) as TemplateName[]){
  const r=renderTemplate(name,fixture);
  assert.ok(r.subject&&r.html&&r.text,name);
  for(const content of [r.subject,r.html,r.text]){
   assert.doesNotMatch(content,/BorderPay Africa(?!, Inc\.)|BorderPay Velocity Velocity|<\/span> Africa/,name);
  }
  assert.match(r.html,/BorderPay Velocity/,name);
 }
});
Deno.test("confirmation links and partner links remain unchanged",()=>{
 const c=renderTemplate("business.email_verification",fixture);
 assert.ok(c.html.includes(fixture.verification_url.replaceAll("&","&amp;")));
 assert.ok(c.text.includes(fixture.verification_url));
 const p=renderTemplate("partner.access_invite",fixture);
 assert.ok(p.html.includes(fixture.invite_url));assert.ok(p.text.includes(fixture.invite_url));
});
Deno.test("welcome and onboarding include documentation alternatives without claiming recorded consent",()=>{
 for(const name of ["business.founder_welcome","business.onboarding_lifecycle","business.email_verification"] as const){
  const r=renderTemplate(name,fixture);
  for(const content of [r.html,r.text]){
   assert.match(content,/must agree/);assert.match(content,/upload your own invoices and signed contracts/);
   assert.doesNotMatch(content,/you have accepted|acceptance recorded|type="checkbox"/i);
  }
 }
});
Deno.test("white-label replacement preserves partner branding, legal entity and recovery URLs",()=>{
 const brand={brandName:"Aster Pay",primaryColor:"#112233",logoUrl:"https://aster.example/logo.png",supportEmail:"help@aster.example",appOrigin:"https://app.aster.example",legalName:"Aster Ltd",termsUrl:"https://aster.example/terms",privacyUrl:"https://aster.example/privacy"};
 const r=applyWhiteLabelEmail(renderTemplate("business.email_verification",fixture),brand);
 assert.match(r.subject,/Aster Pay/);assert.doesNotMatch(r.html,/Aster Pay Velocity|BorderPay Velocity/);
 assert.ok(r.html.includes(brand.logoUrl));assert.ok(r.html.includes("BorderPay Africa, Inc."));
 assert.ok(r.text.includes("Aster Ltd"));assert.ok(r.text.includes("https://app.aster.example/auth/verify?token=synthetic-only&purpose=signup_business"));
});
if(import.meta.main){
 await Deno.mkdir("email-previews",{recursive:true});
 for(const name of ["business.founder_welcome","business.email_verification","business.onboarding_lifecycle","business.invoice_contract_hub","individual.password_reset","partner.access_invite"] as const){
  await Deno.writeTextFile(`email-previews/${name}.html`,renderTemplate(name,fixture).html);
 }
}
