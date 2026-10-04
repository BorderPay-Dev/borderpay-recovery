import {migrationProfileProjection} from '../../supabase/functions/_shared/kyb-migration-presentation.ts';
import {isBridgeAccountPaused} from '../../utils/bridgeAccountStatus.ts';
Deno.test('eligible migration shows only BorderPay KYB and keeps financial actions unavailable',()=>{
 for(const providerStatus of ['paused','rejected'])for(const status of ['not_started','incomplete','under_review']){
 const p=migrationProfileProjection({eligible:true,providerStatus,status});
 if(isBridgeAccountPaused(p))throw Error('verification_hidden_by_frozen_shell');
 if(p.bridge_kyb_status!==status||p.bridge_account_status!==status||p.bridge_provider_account_status!==null||p.bridge_provider_kyb_status!==null||p.bridge_kyc_status!==null||p.bridge_account_paused_at!==null)throw Error('provider_status_exposed_to_customer');
 if(p.account_access_restricted!==true||p.financial_actions_enabled!==false||p.account_status!=='pending_kyc'||p.financial_account_status!=='unavailable')throw Error('financial_access_enabled');
 }
});
Deno.test('unapproved and active profiles keep existing UI and financial restrictions',()=>{
 for(const m of [null,{}, {eligible:false,providerStatus:'paused',status:'not_started'},{eligible:true,providerStatus:'active',status:'not_started'},{eligible:true,providerStatus:'paused',status:'approved'}])if(Object.keys(migrationProfileProjection(m)).length)throw Error('invalid_override');
});
