import { YellowCardFullProductClient, type FullProductConfig, type YellowCardEnvironment } from './yellowcard-full-product.ts';
import { YellowCardStore } from './yellowcard-store.ts';
import { EvidenceCipher } from './yellowcard-evidence.ts';
import { YC_OPERATIONS, type YCOperation } from './yellowcard-operation-catalog.ts';
export type RuntimeSettings={enabled:boolean;writes_enabled:boolean;approval_reference:string;confirmed_contracts:string[];enabled_operations:string[];fiat_currencies:string[];webhook_keys:Record<string,string>;encryption_keys:Record<string,string>;encryption_key_id:string;corporate_mapping_approved:boolean};
/** Resolves Vault through a service-only SQL function, with existing Edge env fallback.
 * No project, secret, webhook registration or entitlement is created by loading config. */
export async function runtime(environment:YellowCardEnvironment,env:(name:string)=>string|undefined,fetcher:typeof fetch=fetch) {
  const url=env('SUPABASE_URL')??'',serviceKey=env('SUPABASE_SERVICE_ROLE_KEY')??'';
  const store=new YellowCardStore(url,serviceKey,fetcher);
  const values=await store.request('rpc/yc_runtime_configuration','POST',{p_environment:environment}) as {settings:RuntimeSettings;secrets:Record<string,string>};
  const get=(name:string)=>values.secrets[name]||env(name)||'';
  if(!values.settings?.enabled)throw new Error('YC full products disabled');
  const prefix=environment==='production'?'YC_PRODUCTION':'YC_SANDBOX';
  const s=values.settings,apiKeyId=get(prefix+'_API_KEY'),secret=get(prefix+'_SECRET_KEY');
  const operations=s.enabled_operations.filter((k):k is YCOperation=>Object.hasOwn(YC_OPERATIONS,k));
  const config:FullProductConfig={environment,apiKeyId,secret,fiatCurrencies:s.fiat_currencies,
    ...(environment==='production'?{relay:{url:get('YC_EGRESS_RELAY_URL'),token:get('YC_EGRESS_RELAY_TOKEN')}}:{}),
    ...(s.writes_enabled&&s.approval_reference?{release:{operations,approvalReference:s.approval_reference,confirmations:s.confirmed_contracts}}:{})};
  // Read confirmations do not activate writes. Identity callback uses its separate approval flag.
  const cipherKeys:Record<string,string>={};for(const [id,name] of Object.entries(s.encryption_keys??{}))cipherKeys[id]=get(name);
  const webhookKeys:Record<string,string>={};for(const [id,name] of Object.entries(s.webhook_keys??{}))webhookKeys[id]=get(name);
  if(!Object.keys(webhookKeys).length&&apiKeyId&&secret)webhookKeys[apiKeyId]=secret;
  return {store,client:new YellowCardFullProductClient(config,fetcher),cipher:new EvidenceCipher(cipherKeys,s.encryption_key_id),webhookKeys,settings:s,url,serviceKey};
}
export function configuredEnvironment(env:(name:string)=>string|undefined):YellowCardEnvironment {
  const value=env('YC_FULL_ENVIRONMENT')??'production';if(value!=='production'&&value!=='sandbox')throw new Error('Invalid provider environment');return value;
}
