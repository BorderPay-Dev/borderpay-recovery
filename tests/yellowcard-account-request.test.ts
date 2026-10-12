import {ensureBridgeCustomerForUsd,type BridgeCustomerSetupStore,type BridgeCustomerSetupResult} from '../supabase/functions/_shared/providers/yellowcard-bridge-customer-setup.ts';
import {accountRequestRoute,requestNamedAccount,USD_SETUP_MESSAGE} from '../supabase/functions/_shared/providers/yellowcard-account-request.ts';
import type {NamedAccountContext} from '../supabase/functions/_shared/providers/yellowcard-named-account-policy.ts';
function assert(v:unknown):asserts v{if(!v)throw Error('Assertion failed');}
const noSetup=async():Promise<BridgeCustomerSetupResult>=>{throw Error('unexpected customer creation');};
const fixture=():NamedAccountContext=>({
 merchantId:'business-a',accountType:'business',globallyRestricted:false,
 yellowCardProgrammeEnabled:true,yellowCardInternalReviewComplete:true,bridgeUsdStaffAuthorized:true,resources:[],
 relationships:[
 {merchantId:'business-a',provider:'yellowcard',customerId:'yc-a',environment:'production',status:'active',controlsSatisfied:true},
 {merchantId:'business-a',provider:'bridge',customerId:'bridge-a',environment:'production',status:'active',controlsSatisfied:true}
 ]});
Deno.test('EUR dispatches to YC and USD to Bridge with scoped IDs, without requiring a pre-existing VA',async()=>{
 const c=fixture(),calls:string[]=[];
 const adapters={ensureBridgeBusinessCustomer:noSetup,yellowCardEur:async(i:{customerId:string})=>{calls.push('EUR:'+i.customerId);return {status:'pending'};},bridgeUsd:async(i:{customerId:string})=>{calls.push('USD:'+i.customerId);return {status:'pending'};}};
 for(const currency of ['eur',' USD ']){const r=await requestNamedAccount(c,currency,adapters);assert(r.ok&&r.result.status==='pending');}
 assert(calls.join(',')==='EUR:yc-a,USD:bridge-a');
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
  let calls=0;const call=async()=>{calls++;return {};};const r=await requestNamedAccount(c,mode==='GBP'?'GBP':'EUR',{ensureBridgeBusinessCustomer:noSetup,yellowCardEur:call,bridgeUsd:call});assert(!r.ok&&calls===0);
 }
});
Deno.test('provider failures never trigger cross-provider fallback',async()=>{
 let bridgeCalls=0,failed=false;try{await requestNamedAccount(fixture(),'EUR',{ensureBridgeBusinessCustomer:noSetup,yellowCardEur:async()=>{throw Error('provider unavailable');},bridgeUsd:async()=>{bridgeCalls++;return {};}});}catch{failed=true;}assert(failed&&bridgeCalls===0);
});

Deno.test('USD creation stops after persisting the customer, while EUR never creates a Bridge customer',async()=>{
 const c=fixture();c.relationships.pop();let setupCalls=0,vaCalls=0;
 const r=await requestNamedAccount(c,'USD',{ensureBridgeBusinessCustomer:async(id)=>{setupCalls++;assert(id===c.merchantId);return {state:'linked',merchantId:id,environment:'production',customerId:'new-id',mappingPersisted:true};},yellowCardEur:async()=>{vaCalls++;return {};},bridgeUsd:async()=>{vaCalls++;return {};}});
 assert(!r.ok&&r.error.message===USD_SETUP_MESSAGE&&setupCalls===1&&vaCalls===0);
});
Deno.test('a missing ID cannot bypass a known Bridge rejection or pause',async()=>{
 for(const status of ['paused','rejected','closed'] as const){
 const c=fixture();c.relationships[1].customerId='';c.relationships[1].status=status;
 const r=await requestNamedAccount(c,'USD',{ensureBridgeBusinessCustomer:noSetup,yellowCardEur:async()=>{throw Error('unexpected VA');},bridgeUsd:async()=>{throw Error('unexpected VA');}});
 assert(!r.ok&&r.error.code==='receiving_account_ineligible');}
});
Deno.test('invalid persistence receipts and uncertain setup do not claim completion or leak provider errors',async()=>{
 const c=fixture();c.relationships.pop();
 const cases:Array<()=>Promise<BridgeCustomerSetupResult>>=[
 async()=>({state:'pending'}),async()=>({state:'linked',merchantId:'other',environment:'production',customerId:'secret-id',mappingPersisted:true}),
 async()=>({state:'linked',merchantId:c.merchantId,environment:'production',customerId:'',mappingPersisted:true}),
 async()=>{throw Error('secret provider error');}
 ];
 for(const setup of cases){const r=await requestNamedAccount(c,'USD',{ensureBridgeBusinessCustomer:setup,yellowCardEur:async()=>{throw Error('unexpected');},bridgeUsd:async()=>{throw Error('unexpected');}});
 assert(!r.ok&&r.error.code==='usd_customer_setup_pending'&&!JSON.stringify(r).includes('secret'));}
});
function setupStore(){
 let claimed=false,customerId='',calls=0;const recovery:Array<string|undefined>=[];
 const store:BridgeCustomerSetupStore={
 reserve:async(merchantId)=>{
 if(customerId)return {state:'linked',merchantId,environment:'production',customerId,mappingPersisted:true};
 if(claimed)return {state:'pending'};
 claimed=true;return {state:'claimed',id:'reservation',merchantId,environment:'production',snapshot:{merchantId,email:'owner@example.test',companyName:'Synthetic Business Ltd',countryCode:'GBR'}};},
 link:async(_r,merchantId,id)=>{customerId=id;return {state:'linked',merchantId,environment:'production',customerId:id,mappingPersisted:true};},
 reconcile:async(_r,_m,id)=>{recovery.push(id);}
 };
 const provider={createCustomer:async(input:{account_type:string;borderpay_user_id:string;company_name:string})=>{
 calls++;assert(input.account_type==='business'&&input.borderpay_user_id==='business-a'&&input.company_name==='Synthetic Business Ltd');return {provider_id:'created-id'};}};
 return {store,provider,recovery,calls:()=>calls};
}
Deno.test('setup coordinator reuses a persisted customer and respects a concurrent atomic store claim',async()=>{
 const f=setupStore();const results=await Promise.all([ensureBridgeCustomerForUsd('business-a',f.store,f.provider),ensureBridgeCustomerForUsd('business-a',f.store,f.provider)]);
 assert(f.calls()===1&&results.some(r=>r.state==='linked')&&results.some(r=>r.state==='pending'));
 const again=await ensureBridgeCustomerForUsd('business-a',f.store,f.provider);assert(again.state==='linked'&&f.calls()===1);
});
Deno.test('failed mapping preserves the known customer ID for reconciliation, with no second creation',async()=>{
 const f=setupStore();f.store.link=async()=>{throw Error('database unavailable');};
 const r=await ensureBridgeCustomerForUsd('business-a',f.store,f.provider);
 assert(r.state==='pending'&&f.recovery[0]==='created-id');
 const again=await ensureBridgeCustomerForUsd('business-a',f.store,f.provider);assert(again.state==='pending'&&f.calls()===1);
});
Deno.test('lost provider response stays pending until reconciliation instead of duplicating a business',async()=>{
 const f=setupStore();let calls=0;const provider={createCustomer:async()=>{calls++;throw Error('response lost');}};
 assert((await ensureBridgeCustomerForUsd('business-a',f.store,provider)).state==='pending');
 assert((await ensureBridgeCustomerForUsd('business-a',f.store,provider)).state==='pending');
 assert(calls===1&&f.recovery.length===1);
});
