import {pausedBusinessReviewProjection} from '../../supabase/functions/_shared/paused-business-review.ts';
Deno.test('only authorized read-only access changes legacy presentation',()=>{
 if(Object.keys(pausedBusinessReviewProjection(false)).length)throw Error('restriction_override');
 const p=pausedBusinessReviewProjection(true);
 if(p.account_status!=='pending_kyc'||p.bridge_account_status!=='paused'||p.bridge_provider_account_status!=='paused'||p.account_frozen_at!==null)throw Error('legacy_workspace_not_selected');
 if(p.kyc_status!=='under_review'||p.bridge_kyb_status!=='under_review'||p.verification_status!=='under_review')throw Error('incorrect_review_status');
 if(p.financial_actions_enabled!==false||p.account_access_restricted!==true||p.financial_account_status!=='frozen')throw Error('financial_guard_lost');
});
