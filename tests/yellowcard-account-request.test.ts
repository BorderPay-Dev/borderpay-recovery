import {accountRequestRoute,requestNamedAccount,USD_SETUP_MESSAGE} from '../supabase/functions/_shared/providers/yellowcard-account-request.ts';
import type {NamedAccountContext} from '../supabase/functions/_shared/providers/yellowcard-named-account-policy.ts';
function assert(v:unknown):asserts v{if(!v)throw Error('Assertion failed');}
const fixture=():NamedAccountContext=>({
 merchantId:'business-a',accountType:'business',globallyRestricted:false,
 yellowCardProgrammeEnabled:true,yellowCardInternalReviewComplete:true,bridgeUsdStaffAuthorized:true,resources:[],
 relationships:[
 {merchantId:'business-a',provider:'yellowcard',customerId:'yc-a',environment:'production',status:'active',controlsSatisfied:true},
 {merchantId:'business-a',provider:'bridge',customerId:'bridge-a',environment:'production',status:'active',controlsSatisfied:true}
 ]});
Deno.test('EUR dispatches to YC and USD to Bridge with scoped IDs, without requiring a pre-existing VA',async()=>{
 const c=fixture(),calls:string[]=[];
 const adapters={yellowCardEur:async(i:{customerId:string})=>{calls.push('EUR:'+i.customerId);return {status:'pending'};},bridgeUsd:async(i:{customerId:string})=>{calls.push('USD:'+i.customerId);return {status:'pending'};}};
 for(const currency of ['eur',' USD ']){const r=await requestNamedAccount(c,currency,adapters);assert(r.ok&&r.result.status==='pending');}
 assert(calls.join(',')==='EUR:yc-a,USD:bridge-a');
});
Deno.test('missing or blank Bridge ID stops requests with the exact compliance message and zero provider calls',async()=>{
 for(const missing of ['absent','blank','whitespace','other-merchant','sandbox']){
  const c=fixture();if(missing==='absent')c.relationships.pop();
  else if(missing==='other-merchant')c.relationships[1].merchantId='business-b';
  else if(missing==='sandbox')Object.assign(c.relationships[1],{environment:'sandbox'});
  else c.relationships[1].customerId=missing==='blank'?'':'   ';
  let calls=0;const call=async()=>{calls++;return {};};
  const r=await requestNamedAccount(c,'USD',{yellowCardEur:call,bridgeUsd:call});
  assert(!r.ok&&r.error.code==='usd_account_setup_required'&&r.error.message===USD_SETUP_MESSAGE&&calls===0);
 }
});
Deno.test('Bridge pause or rejection does not redirect USD or block separately approved EUR',()=>{
 for(const status of ['paused','rejected','under_review'] as const){const c=fixture();c.relationships[1].status=status;assert(!accountRequestRoute(c,'USD').allowed);const eur=accountRequestRoute(c,'EUR');assert(eur.allowed&&eur.provider==='yellowcard');}
});
Deno.test('Bridge ID alone does not grant USD without staff authorization or provider eligibility',()=>{
 const c=fixture();c.bridgeUsdStaffAuthorized=false;assert(!accountRequestRoute(c,'USD').allowed);c.bridgeUsdStaffAuthorized=true;c.relationships[1].controlsSatisfied=false;assert(!accountRequestRoute(c,'USD').allowed);
});
Deno.test('YC entitlement and internal review gates stay independent of Bridge',()=>{
 const c=fixture();c.yellowCardProgrammeEnabled=false;assert(!accountRequestRoute(c,'EUR').allowed&&accountRequestRoute(c,'USD').allowed);c.yellowCardProgrammeEnabled=true;c.yellowCardInternalReviewComplete=false;assert(!accountRequestRoute(c,'EUR').allowed);c.yellowCardInternalReviewComplete=true;c.relationships[0].status='under_review';assert(!accountRequestRoute(c,'EUR').allowed);
});
Deno.test('unsupported currencies, duplicates and global restrictions cannot trigger adapters',async()=>{
 for(const mode of ['GBP','duplicate','fraud','individual']){
  const c=fixture();if(mode==='duplicate')c.relationships.push({...c.relationships[0]});if(mode==='fraud')c.globallyRestricted=true;if(mode==='individual')c.accountType='individual';
  let calls=0;const call=async()=>{calls++;return {};};const r=await requestNamedAccount(c,mode==='GBP'?'GBP':'EUR',{yellowCardEur:call,bridgeUsd:call});assert(!r.ok&&calls===0);
 }
});
Deno.test('provider failures never trigger cross-provider fallback',async()=>{
 let bridgeCalls=0,failed=false;try{await requestNamedAccount(fixture(),'EUR',{yellowCardEur:async()=>{throw Error('provider unavailable');},bridgeUsd:async()=>{bridgeCalls++;return {};}});}catch{failed=true;}assert(failed&&bridgeCalls===0);
});
