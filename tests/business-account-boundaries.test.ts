import { render } from "../supabase/functions/_shared/email-templates/business/virtual-account-limits.ts";
function assert(ok:unknown,message:string){if(!ok)throw Error(message);}
Deno.test("account guidance preserves supplied rail limits and safely renders merchant data",()=>{
 const result=render({company_name:'Example <script>bad()</script>',virtual_accounts:[{currency:'USD',minimum:'10 USD',maximum:'25,000 USD',accepted_payments:'Approved business payments'}]});
 assert(!result.html.includes('<script>'),'unsafe company name');
 for(const content of ['10 USD','25,000 USD','Approved business payments'])assert(result.html.includes(content)&&result.text.includes(content),'account instructions changed');
 assert(result.text.includes('US$100,000+ monthly only when that is a realistic, supportable forecast'),'missing forecast condition');
 assert(result.text.includes('not evidence of an automatic hold on the next transfer'),'unverified automatic hold rule');
 assert(result.text.includes('Do not split payments to avoid review'),'missing anti-structuring boundary');
 assert(result.text.includes('source of funds')&&result.text.includes('EEA-only trade')&&result.text.includes('secure business-profile update link'),'missing profile update guidance');
});
Deno.test("missing rail data never fabricates an account or a maximum",()=>{
 const result=render({company_name:'Synthetic Ltd'});
 assert(result.text.includes('No active global receive account details were included'),'missing data not disclosed');
 assert(result.text.includes('does not mean unlimited or automatically approved transactions'),'unlimited claim not corrected');
 assert(result.html.length<100000,'email risks clipping');
});

Deno.test("generic consumer rail guidance is not advertised as business usage",()=>{
 const result=render({company_name:'Synthetic Ltd',virtual_accounts:[{currency:'USD',accepted_payments:'Family payments with the same surname and person-to-person payments'}]});
 assert(!result.text.toLowerCase().includes('family payments')&&!result.text.toLowerCase().includes('person-to-person'),'generic consumer payments leaked into B2B guidance');
 assert(result.text.includes('GBP is strictly business-to-business'),'missing GBP sender rule');
});
