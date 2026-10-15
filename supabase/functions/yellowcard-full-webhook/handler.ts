import { verifyYellowCardSignature, yellowCardEventFingerprint, type YellowCardEnvironment } from '../_shared/providers/yellowcard-full-product.ts';
import { boundedBody, type EvidenceCipher, type SealedEvidence } from '../_shared/providers/yellowcard-evidence.ts';
export interface WebhookInbox {
  enqueue(input:{environment:YellowCardEnvironment;fingerprint:string;eventType:string;sealed:SealedEvidence}):Promise<void>;
}
const json=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function webhookHandler(config:{environment:YellowCardEnvironment;keys:Record<string,string>;cipher:EvidenceCipher;inbox:WebhookInbox;maxBytes?:number}) {
  return async(req:Request)=>{
    if(req.method!=='POST') return json({error:'Method not allowed'},405);
    let raw:Uint8Array;try{raw=await boundedBody(req,config.maxBytes??1048576);}catch{return json({error:'Payload too large'},413);}
    let body:Record<string,unknown>;try{body=JSON.parse(new TextDecoder().decode(raw));if(!body||typeof body!=='object'||Array.isArray(body))throw 0;}catch{return json({error:'Invalid JSON'},400);}
    const headerKey=req.headers.get('X-YC-API-Key');const bodyKey=typeof body.apiKey==='string'?body.apiKey:null;
    if(headerKey&&bodyKey&&headerKey!==bodyKey)return json({error:'Unauthorized'},401);
    const keyId=headerKey??bodyKey??'';
    if(!Object.hasOwn(config.keys,keyId)||!await verifyYellowCardSignature(raw,req.headers.get('X-YC-Signature')??'',config.keys[keyId]))return json({error:'Unauthorized'},401);
    const eventType=typeof body.event==='string'?body.event:typeof body.type==='string'?body.type:'unknown';
    // Unknown event families are retained and quarantined by the worker, never silently dropped.
    try{
      const fingerprint=await yellowCardEventFingerprint(config.environment,raw);
      const sealed=await config.cipher.seal(raw,`yc:webhook:${fingerprint}`);
      await config.inbox.enqueue({environment:config.environment,fingerprint,eventType:eventType.slice(0,128),sealed});
      return json({received:true},200);
    }catch{return json({error:'Unable to record event'},503);}
  };
}
