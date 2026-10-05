const enc=new TextEncoder();
const b64=(v:Uint8Array)=>btoa(Array.from(v,x=>String.fromCharCode(x)).join(''));
const bytes=(v:string)=>Uint8Array.from(atob(v),x=>x.charCodeAt(0));
export async function sha256(raw:Uint8Array) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(raw))),b=>b.toString(16).padStart(2,'0')).join('');}
export function canonicalJson(value:unknown):string {
  if(value===null || typeof value==='string' || typeof value==='boolean') return JSON.stringify(value);
  if(typeof value==='number' && Number.isFinite(value)) return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(canonicalJson).join(',')+']';
  if(value && typeof value==='object') return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
  throw new Error('Unsupported request value');
}
export const payloadHash=(value:unknown)=>sha256(enc.encode(canonicalJson(value)));
export interface SealedEvidence {keyId:string;iv:string;ciphertext:string}
/** AAD binds encrypted evidence to environment and record ID, preventing cross-record substitution. */
export class EvidenceCipher {
  constructor(private readonly keys:Record<string,string>,private readonly current:string) {}
  private async key(id:string) {
    const secret=this.keys[id];if(!secret || bytes(secret).length!==32) throw new Error('Evidence encryption unavailable');
    return await crypto.subtle.importKey('raw',bytes(secret),{name:'AES-GCM'},false,['encrypt','decrypt']);
  }
  async seal(raw:Uint8Array,context:string):Promise<SealedEvidence> {
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context)},await this.key(this.current),new Uint8Array(raw));
    return {keyId:this.current,iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted))};
  }
  async open(e:SealedEvidence,context:string):Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv),additionalData:enc.encode(context)},await this.key(e.keyId),bytes(e.ciphertext)));
  }
}
export async function boundedBody(req:Request,max=1048576):Promise<Uint8Array> {
  if(Number(req.headers.get('content-length'))>max) throw new Error('Payload too large');
  const reader=req.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let size=0;
  while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('Payload too large');}chunks.push(value);}
  const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;
}
