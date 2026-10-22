import { assertEquals, assertRejects } from "jsr:@std/assert";
import { allowedAccountTypes, resolveTenantOnboardingPolicy, signOnboardingToken, verifyOnboardingToken } from "../supabase/functions/_shared/public-api-v258/onboarding-policy.ts";
import * as signup from "../supabase/functions/_shared/onboarding-policy.ts";
import { validateOnboardingAuthorization, validateCustomerCreate } from "../supabase/functions/_shared/public-api-v258/api-gateway-validators.ts";
import { prepareWhiteLabelSignup } from "../supabase/functions/_shared/white-label-onboarding.ts";
import { isBusinessAccount } from "../supabase/functions/_shared/business-only.ts";

Deno.test("legacy tenant flags never enable personal signup in either channel", () => {
  for (const policy of [{individual_signup_enabled:true,business_signup_enabled:true,white_label_signup_enabled:true},{individual_signup_enabled:true,business_signup_enabled:false,white_label_signup_enabled:true}]) {
    for(const channel of ["api","white_label"] as const) {
      assertEquals(allowedAccountTypes(policy,channel),policy.business_signup_enabled?["business"]:[]);
      assertEquals(signup.allowedAccountTypes(policy,channel),policy.business_signup_enabled?["business"]:[]);
    }
  }
  assertEquals(resolveTenantOnboardingPolicy({onboarding:{individual_signup_enabled:true}}).individual_signup_enabled,false);
  assertEquals(isBusinessAccount("individual"),false);
});
Deno.test("authorization input rejects personal, mixed and malformed account types",()=>{
  for(const requested of [["individual"],["individual","business"],[],["consumer"],["business","business"]]) {
    for(const channel of ["api","white_label"]) assertEquals(validateOnboardingAuthorization({external_user_id:"merchant",onboarding_channel:channel,requested_account_types:requested}).ok,false);
  }
  assertEquals(validateOnboardingAuthorization({external_user_id:"merchant",onboarding_channel:"api",requested_account_types:["business"]}).ok,true);
  assertEquals(validateCustomerCreate({account_type:"individual"}).ok,false);
});
Deno.test("signed legacy personal onboarding tokens cannot be redeemed",async()=>{
  const now=Math.floor(Date.now()/1000),secret="synthetic-test-secret-for-business-policy-only";
  for(const types of [["individual"],["individual","business"],["business"]]) {
    const claims:any={iss:"borderpay",aud:"partner_onboarding",jti:"one",tenant_id:"tenant",api_key_id:"key",external_user_id:"customer",allowed_account_types:types,onboarding_channel:"api",iat:now,exp:now+60};
    const token=await signOnboardingToken(claims,secret);
    if(types.length===1&&types[0]==="business") assertEquals((await verifyOnboardingToken(token,secret)).allowed_account_types,["business"]);
    else for(const verify of [verifyOnboardingToken,signup.verifyOnboardingToken]) await assertRejects(()=>verify(token,secret),Error,"Invalid authorized account type");
  }
});
Deno.test("white label rejects personal onboarding before any database side effect",async()=>{
  const db=new Proxy({}, {get(){throw new Error("Database must not be called");}});
  await assertRejects(()=>prepareWhiteLabelSignup(db,"https://synthetic.example",{account_type:"individual"},"unused"),Error,"business accounts only");
});
