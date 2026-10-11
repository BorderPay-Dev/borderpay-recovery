import assert from "node:assert/strict";
import {renderTemplate} from "../supabase/functions/_shared/email-templates/index.ts";
Deno.test("business documentation guidance appears in approval emails and the business broadcast, not rejection notices",()=>{
 for(const key of ["business.kyb_decision","business.account_activated"] as const){
  const r=renderTemplate(key,{company_name:"Example Ltd",decision:"approved"});
  assert.match(r.text,/recommend the Invoice & Contract Hub/);
  assert.match(r.html,/corporate-to-corporate/);
  assert.match(r.text,/upload your own invoices and signed contracts/);
 }
 const rejection=renderTemplate("business.kyb_decision",{company_name:"Example Ltd",decision:"rejected"});
 assert.doesNotMatch(rejection.text,/Invoice & Contract Hub/);
 assert.doesNotMatch(rejection.html,/Invoice & Contract Hub/);
});

Deno.test("invoice campaign explains benefits with accurate document requirements and no approval guarantee",()=>{
 const r=renderTemplate("business.invoice_contract_hub",{});
 assert.match(r.text,/Business account requirement: you must agree to support your business payments with accurate invoices and contracts/);
 assert.match(r.text,/cannot guarantee/);
 assert.match(r.text,/strictly corporate-to-corporate/);
 assert.match(r.text,/AI review does not certify authenticity or guarantee bank approval/);
 assert.match(r.html,/https:\/\/app.borderpayafrica.com/);
});
