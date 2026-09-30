import { evaluateBusinessEmail } from '../supabase/functions/_shared/business-email-policy.ts';
function check(value: string, allowed: boolean) {
 const result=evaluateBusinessEmail(value);
 if(result.allowed!==allowed) throw new Error(`${value}: ${JSON.stringify(result)}`);
}
Deno.test('company addresses and exact inbox.eu exception remain available',()=>{
 for(const e of ['sales@borderpayvelocity.xyz','COMPLIANCE@BORDERPAYAFRICA.COM','owner@inbox.eu','first.last@manufacturing-company.co.uk']) check(e,true);
});
Deno.test('free providers, regional variants and nested subdomains are denied',()=>{
 for(const e of ['x@gmail.com','x@outlook.com','x@yahoo.co.uk','x@inbox.lv','x@sub.gmail.com','x@mail.inbox.eu','x@proton.me']) check(e,false);
});
Deno.test('probe domain, disposable providers, forwarding and plus aliases are denied',()=>{
 for(const e of ['bpsec-probe-1790796112460@uberip.com','x@sub.uberip.com','x@yopmail.com','x@sharklasers.com','x@duck.com','x@mozmail.com','x@simplelogin.com','x+sales@inbox.eu','sales+one@borderpayvelocity.xyz']) check(e,false);
});
Deno.test('malformed addresses cannot evade policy',()=>{
 for(const e of ['a@gmail.com.','a@inbox.eu.','a@@inbox.eu','a@-company.com','a@company..com','a b@company.com','a..b@company.com','a@company.test']) check(e,false);
});
Deno.test('source keeps server-only provisioning and removes header bypass',async()=>{
 const s=await Deno.readTextFile(new URL('../supabase/functions/auth-signup/index.ts',import.meta.url));
 if(s.includes('legacyNativeSignupEligible') || s.includes('legacyNativeFallback') || s.includes('captchaIsRequired')) throw new Error('Optional attestation path remains');
 if(!s.includes('supabaseAdmin.auth.admin.createUser') || !s.includes('const captchaCheck = appCheckValid')) throw new Error('Trusted signup path missing');
 if(s.indexOf('if (!captchaCheck.ok)')>s.indexOf('supabaseAdmin.auth.admin.createUser')) throw new Error('Account created before CAPTCHA');
});
