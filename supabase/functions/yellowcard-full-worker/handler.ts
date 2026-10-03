import type { YellowCardEnvironment } from '../_shared/providers/yellowcard-full-product.ts';
import type { EvidenceCipher, SealedEvidence } from '../_shared/providers/yellowcard-evidence.ts';
import type { YellowCardReconciler } from '../_shared/providers/yellowcard-reconciliation.ts';
export interface ClaimedEvent {id:string;environment:YellowCardEnvironment;fingerprint:string;sealed_payload:SealedEvidence;lease_token:string}
export async function processEvents(config:{environment:YellowCardEnvironment;cipher:EvidenceCipher;reconciler:YellowCardReconciler;claim:()=>Promise<ClaimedEvent[]>;finish:(id:string,lease:string,state:'processed'|'pending'|'quarantined',code:string|null)=>Promise<boolean>}) {
  const rows=await config.claim();let processed=0,quarantined=0,retry=0;
  for(const row of rows) {
    let state:'processed'|'pending'|'quarantined'='processed',code:string|null=null;
    try {
      if(row.environment!==config.environment)throw new Error('environment_mismatch');
      const raw=await config.cipher.open(row.sealed_payload,`yc:webhook:${row.fingerprint}`);
      await config.reconciler.event(config.environment,JSON.parse(new TextDecoder().decode(raw)));
    }catch(e) {
      const reason=e instanceof Error?e.message:'';
      const permanent=['unknown_merchant_binding','unknown_account_binding','unknown_account_status','unmapped_event_family','environment_mismatch','transaction_response_mismatch'];
      state=permanent.includes(reason)?'quarantined':'pending';code=state==='quarantined'?reason:'reconciliation_failed';
    }
    if(!await config.finish(row.id,row.lease_token,state,code))throw new Error('Event lease lost');
    if(state==='processed')processed++;else if(state==='quarantined')quarantined++;else retry++;
  }
  return {processed,quarantined,retry};
}
