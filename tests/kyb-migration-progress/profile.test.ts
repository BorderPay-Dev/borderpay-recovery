import {migrationProfileProjection} from '../../supabase/functions/_shared/kyb-migration-presentation.ts';
import {isBridgeAccountPaused} from '../../utils/bridgeAccountStatus.ts';
Deno.test('eligible migration reaches the existing verification screen while raw provider restriction remains',()=>{
 for(const providerStatus of ['paused','rejected'])for(const status of ['not_started','incomplete','under_review']){
 const p=migrationProfileProjection({eligible:true,providerStatus,status});
 if(isBridgeAccountPaused(p))throw Error('verification_hidden_by_frozen_shell');
 if(p.bridge_kyb_status!==status||p.bridge_account_status!==status||p.bridge_provider_account_status!==providerStatus)throw Error('incorrect_display_or_provider_truth');
 if(p.account_access_restricted!==true||p.financial_actions_enabled!==false||p.account_status!=='pending_kyc')throw Error('financial_access_enabled');
 }
});
Deno.test('unapproved and active profiles keep existing UI and financial restrictions',()=>{
 for(const m of [null,{}, {eligible:false,providerStatus:'paused',status:'not_started'},{eligible:true,providerStatus:'active',status:'not_started'},{eligible:true,providerStatus:'paused',status:'approved'}])if(Object.keys(migrationProfileProjection(m)).length)throw Error('invalid_override');
});
