import { TEMPLATES } from "../supabase/functions/_shared/email-templates/index.ts";
import { BUSINESS_ACTIVITY_NOTICE } from "../supabase/functions/_shared/email-templates/business-activity-copy.ts";
import { BUSINESS_ACTIVITY_TEXT } from "../supabase/functions/_shared/email-templates/business/activity-guidance.ts";
function assert(v:unknown,message:string){if(!v)throw new Error(message);}
Deno.test("business notice escapes recipient names and preserves the exact approved copy",()=>{
 const result=TEMPLATES["business.business_activity_update"]({company_name:'Demo <script>bad()</script>'});
 assert(!result.html.includes('<script>'),'unescaped name');
 for(const item of BUSINESS_ACTIVITY_NOTICE.items)assert(result.text.includes(item.text),'missing notice section');
 assert(result.html.includes('mailto:support@borderpayafrica.com'),'missing update contact');
});
Deno.test("onboarding renderers carry realistic forecast guidance without altering verification links",()=>{
 for(const name of ['business.email_verification','business.founder_welcome','business.onboarding_lifecycle','business.verification_reminder'] as const){
  const renderer=TEMPLATES[name];assert(!!renderer,'missing template '+name);
  const result=renderer({company_name:'Demo Ltd',stage:'day_1',verification_url:'https://example.invalid/verify?token=synthetic'});
  assert(result.text.includes(BUSINESS_ACTIVITY_TEXT.replace(/\s+/g,' ')),'missing guidance '+name);
  if(name==='business.email_verification'||name==='business.verification_reminder')assert(result.html.includes('https://example.invalid/verify?token=synthetic'),'verification URL changed');
 }
});
