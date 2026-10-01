import { TEMPLATES } from "../supabase/functions/_shared/email-templates/index.ts";
function assert(value:unknown,message:string){if(!value)throw Error(message);}
Deno.test("welcome and approval emails explain account usage without claiming every product is enabled",()=>{
 for (const template of ['business.founder_welcome','business.account_activated','business.kyb_decision'] as const) {
  const result=TEMPLATES[template]({company_name:'Synthetic <script>bad()</script>',decision:'approved'});
  assert(!result.html.includes('<script>'),'unsafe company interpolation');
  for (const phrase of ['US$15,000 monthly but receiving more than US$20,000 in one week','Source of funds means where the money comes from','EEA-only trade','do not remember your answers','secure update link']) {
   assert(result.text.includes(phrase)&&result.html.includes(phrase),'missing account usage explanation '+template+' '+phrase);
  }
  assert(!result.text.includes('cards unlocked')&&!result.html.includes('issue corporate cards'),'unconfirmed product entitlement');
 }
});
Deno.test("rejected KYB does not receive activation or payment-usage permission",()=>{
 const result=TEMPLATES['business.kyb_decision']({company_name:'Synthetic Ltd',decision:'rejected',reason:'Missing document',next_steps:'Contact support'});
 assert(result.text.includes('Missing document')&&result.text.includes('Contact support'),'review instructions lost');
 assert(!result.text.includes('has passed business verification')&&!result.html.includes('Before you use your business account'),'rejection described as approval');
});
