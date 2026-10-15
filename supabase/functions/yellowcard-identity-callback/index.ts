import { runtime, configuredEnvironment } from '../_shared/providers/yellowcard-runtime.ts';
import type { SealedEvidence } from '../_shared/providers/yellowcard-evidence.ts';
import { identityCallback, type VaultIdentity } from './handler.ts';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(async(req:Request)=>{
  try {
    const environment=configuredEnvironment(env),r=await runtime(environment,env);
    return await identityCallback({keys:r.webhookKeys,corporateMappingApproved:r.settings.corporate_mapping_approved,
      lookup:async(vaultId)=>{
        const rows=await r.store.request(`yc_resources?environment=eq.${environment}&resource_kind=eq.vault&provider_resource_id=eq.${encodeURIComponent(vaultId)}&select=id`) as {id:string}[];
        if(rows.length!==1)return null;const id=rows[0].id;
        const evidence=await r.store.request(`yc_vault_identities?resource_id=eq.${id}&select=sealed_identity,verified,mapping_approved`) as {sealed_identity:SealedEvidence;verified:boolean;mapping_approved:boolean}[];
        if(evidence.length!==1)return null;
        const raw=await r.cipher.open(evidence[0].sealed_identity,`yc:vault-identity:${environment}:${id}`),identity=JSON.parse(new TextDecoder().decode(raw));
        return {...identity,verified:evidence[0].verified,mappingApproved:evidence[0].mapping_approved} as VaultIdentity;
      },audit:async(vaultId)=>{await r.store.request('yc_audit_events','POST',{environment,action:'identity_callback_served',resource_reference:vaultId},'return=minimal');}
    })(req);
  }catch{return Response.json({error:'Identity service unavailable'},{status:503});}
});
