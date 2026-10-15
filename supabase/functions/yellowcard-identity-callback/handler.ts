import { verifyYellowCardSignature } from '../_shared/providers/yellowcard-full-product.ts';
import { boundedBody } from '../_shared/providers/yellowcard-evidence.ts';
const json=(value:unknown,status:number)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export interface VaultIdentity {firstname:string;lastname:string;country:string;verified:boolean;mappingApproved:boolean}
export function identityCallback(config:{keys:Record<string,string>;corporateMappingApproved:boolean;lookup:(vaultId:string)=>Promise<VaultIdentity|null>;audit:(vaultId:string)=>Promise<void>}) {
  return async(req:Request)=>{
    if(req.method!=='POST')return json({error:'Method not allowed'},405);
    const keyId=req.headers.get('X-YC-API-Key')??'';
    if(!Object.hasOwn(config.keys,keyId))return json({error:'Unauthorized'},401);
    let raw:Uint8Array;try{raw=await boundedBody(req,4096);}catch{return json({error:'Invalid request'},413);}
    if(!await verifyYellowCardSignature(raw,req.headers.get('X-YC-Signature')??'',config.keys[keyId]))return json({error:'Unauthorized'},401);
    if(!config.corporateMappingApproved)return json({error:'Identity service unavailable'},503);
    try {
      const {vaultId}=JSON.parse(new TextDecoder().decode(raw));
      if(typeof vaultId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(vaultId))return json({error:'Invalid vault'},400);
      const owner=await config.lookup(vaultId);
      if(!owner||!owner.verified||!owner.mappingApproved||!owner.firstname.trim()||!owner.lastname.trim()||!/^[A-Z]{2}$/.test(owner.country))return json({error:'Verified owner unavailable'},422);
      await config.audit(vaultId);
      return json({firstname:owner.firstname,lastname:owner.lastname,country:owner.country},200);
    }catch{return json({error:'Identity service unavailable'},503);}
  };
}
