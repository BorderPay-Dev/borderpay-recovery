import assert from "node:assert/strict";
import {renderTemplate} from "../supabase/functions/_shared/email-templates/index.ts";
Deno.test("business approval explains required documentation and permits uploaded existing documents",()=>{
 for(const key of ["business.kyb_decision","business.account_activated"] as const){
  const r=renderTemplate(key,{company_name:"Example Ltd",decision:"approved"});
  assert.match(r.text,/must agree/);
  assert.match(r.html,/corporate-to-corporate/);
  assert.match(r.text,/upload your own invoices and signed contracts/);
 }
 const rejection=renderTemplate("business.kyb_decision",{company_name:"Example Ltd",decision:"rejected"});
 assert.doesNotMatch(rejection.text,/Invoice & Contract Hub/);
 assert.doesNotMatch(rejection.html,/Invoice & Contract Hub/);
});
Deno.test("invoice campaign communicates documentation policy without promising bank approval",()=>{
 const r=renderTemplate("business.invoice_contract_hub",{});
 assert.match(r.text,/must agree/);
 assert.match(r.text,/cannot guarantee/);
 assert.match(r.text,/strictly corporate-to-corporate/);
 assert.match(r.text,/upload your own invoices and signed contracts/);
 assert.match(r.text,/suggest corrections/);
 assert.doesNotMatch(r.text,/hub is optional|you have accepted/i);
 assert.match(r.html,/https:\/\/app.borderpayafrica.com/);
});
