import { webhookHandler } from '../supabase/functions/yellowcard-full-webhook/handler.ts';
import { identityCallback } from '../supabase/functions/yellowcard-identity-callback/handler.ts';
import { accountsHandler } from '../supabase/functions/yellowcard-full-accounts/handler.ts';
import { EvidenceCipher } from '../supabase/functions/_shared/providers/yellowcard-evidence.ts';
import { YellowCardPaymentEngine,type PaymentStore,type StoredOperation,type PaymentIntent } from '../supabase/functions/_shared/providers/yellowcard-payment-engine.ts';
import { YellowCardFullProductClient } from '../supabase/functions/_shared/providers/yellowcard-full-product.ts';
const assert=(v:unknown)=>{if(!v)throw new Error('Assertion failed');};
async function rejects(f:()=>unknown|Promise<unknown>){try{await f();}catch{return;}throw new Error('Expected rejection');}
const cipher=new EvidenceCipher({v1:btoa('k'.repeat(32))},'v1');
async function signed(body:unknown,keyId='key') {
 const raw=JSON.stringify(body),key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)));
 return new Request('https://example.test/webhook',{method:'POST',body:raw,headers:{'X-YC-API-Key':keyId,'X-YC-Signature':btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''))}});
}
Deno.test('webhook acknowledges only after durable enqueue; exact replays deduplicate',async()=>{
 const hashes=new Set<string>();const handle=webhookHandler({environment:'production',keys:{key:'test-secret'},cipher,inbox:{enqueue:async(row)=>{hashes.add(row.fingerprint);assert(row.sealed.ciphertext.length>0);}}});
 const body={id:'tx',apiKey:'key',event:'CUSTODY.COMPLETE'};
 assert((await handle(await signed(body))).status===200);assert((await handle(await signed(body))).status===200);assert(hashes.size===1);
 assert((await handle(await signed({...body,event:'CUSTODY.FAILED'}))).status===200);assert(hashes.size===2);
});
Deno.test('webhook rejects key spoofing, tampering and oversized requests without enqueuing',async()=>{
 let calls=0;const handle=webhookHandler({environment:'production',keys:{key:'test-secret'},cipher,maxBytes:1000,inbox:{enqueue:async()=>{calls++;}}});
 assert((await handle(await signed({apiKey:'other'}))).status===401);
 const req=await signed({apiKey:'key'});assert((await handle(new Request(req,{body:'{"apiKey":"key","amount":9}'}))).status===401);
 assert((await handle(new Request('https://example.test',{method:'POST',body:'x'.repeat(1001)}))).status===413);assert(calls===0);
});
Deno.test('database failure returns 503 rather than losing a webhook',async()=>{
 const handle=webhookHandler({environment:'production',keys:{key:'test-secret'},cipher,inbox:{enqueue:async()=>{throw new Error('offline');}}});
 assert((await handle(await signed({apiKey:'key',event:'SEND.COMPLETE'}))).status===503);
});
Deno.test('identity callback uses exact vault identity, rejects unknown owners and requires corporate approval',async()=>{
 let lookedUp='';const deps={keys:{key:'test-secret'},corporateMappingApproved:true,lookup:async(id:string)=>{lookedUp=id;return id==='vault'?{firstname:'Synthetic',lastname:'Person',country:'GB',verified:true,mappingApproved:true}:null;},audit:async()=>{}};
 const response=await identityCallback(deps)(await signed({vaultId:'vault'}));const data=await response.json();assert(response.status===200&&data.firstname==='Synthetic'&&!('firstName'in data)&&lookedUp==='vault');
 assert((await identityCallback(deps)(await signed({vaultId:'unknown'}))).status===422);
 assert((await identityCallback({...deps,corporateMappingApproved:false})(await signed({vaultId:'vault'}))).status===503);
});
Deno.test('account read rejects another merchant and does not leak provider identity',async()=>{
 let read=0;const handle=accountsHandler({environment:'production',authenticate:async()=> 'a',authorize:async(user,merchant)=>user===merchant,balances:async()=>{read++;return [];},rates:async()=>[]});
 const response=await handle(new Request('https://example.test',{method:'POST',body:JSON.stringify({merchantId:'b'})}));assert(response.status===403&&read===0);
 const own=await handle(new Request('https://example.test',{method:'POST',body:'{}'}));assert(own.status===200&&!(await own.text()).includes('yellowcard'));
});
function memoryStore():PaymentStore & {ops:Map<string,StoredOperation>;finishes:string[]} {
 const ops=new Map<string,StoredOperation>(),finishes:string[]=[];
 return {ops,finishes,resource:async(c,id)=>id==='source'?{provider_resource_id:'vault-a',resource_kind:'vault',status:'active'}:null,ownsTransaction:async()=>false,
 reserve:async(c,i,hash,sealed)=>{const previous=ops.get(i.sequenceId);if(previous){if(previous.request_hash!==hash)throw new Error('conflict');return previous;}const op:StoredOperation={id:'op',merchant_id:c.merchantId,environment:c.environment,operation:i.operation,sequence_id:i.sequenceId,request_hash:hash,sealed_request:sealed,state:'reserved',lease_token:null,provider_id:null};ops.set(i.sequenceId,op);return op;},
 claim:async(c,id,hash)=>{const op=[...ops.values()].find(x=>x.id===id&&x.request_hash===hash&&x.merchant_id===c.merchantId);if(!op||op.state!=='reserved')return null;op.state='submitting';op.lease_token='lease';return op;},
 finish:async(id,lease,state,providerId)=>{finishes.push(state);const op=[...ops.values()].find(x=>x.id===id);if(!op||op.lease_token!==lease)return false;op.state=state;op.provider_id=providerId;return true;}};
}
const context={merchantId:'merchant-a',environment:'production' as const,actorId:'merchant-a'};
function intent():PaymentIntent {return {operation:'createSend',sequenceId:'sequence-001',sourceResourceId:'source',sourceAsset:'USDC_BASE',reserveAmount:'101',body:{vaultId:'vault-a',endUserId:'merchant-a',sequenceId:'sequence-001',token:'USDC_BASE',amount:100,destination:{type:'EXTERNAL',address:'synthetic'},countryCode:'GB',travelRuleData:{name:'Synthetic recipient'}}};}
const authorization={verifyAndConsume:async()=>({reference:'authorization',expiresAt:new Date(Date.now()+60000).toISOString()})};
Deno.test('authorized custody execution submits once despite concurrent duplicate execution',async()=>{
 let calls=0;const client=new YellowCardFullProductClient({environment:'production',apiKeyId:'key',secret:'secret',cryptoTokens:['USDC_BASE'],release:{operations:['createSend'],approvalReference:'SYNTHETIC',confirmations:[]}},async()=>{calls++;return Response.json({id:'yc-tx',status:'created'});});
 const store=memoryStore(),engine=new YellowCardPaymentEngine(client,store,cipher,authorization),op=await engine.prepare(context,intent(),{});
 const results=await Promise.all([engine.execute(context,op),engine.execute(context,op)]);assert(calls===1);assert(results.some(x=>x.state==='submitted'));assert(store.finishes.includes('submitted'));
});
Deno.test('timeout never causes a second financial write and retains unknown outcome',async()=>{
 let calls=0;const client=new YellowCardFullProductClient({environment:'production',apiKeyId:'key',secret:'secret',cryptoTokens:['USDC_BASE'],release:{operations:['createSend'],approvalReference:'SYNTHETIC',confirmations:[]}},()=>{calls++;throw new Error('timeout');});
 const store=memoryStore(),engine=new YellowCardPaymentEngine(client,store,cipher,authorization),op=await engine.prepare(context,intent(),{});
 assert((await engine.execute(context,op)).state==='outcome_unknown');await engine.execute(context,op);assert(calls===1&&store.finishes[0]==='outcome_unknown');
});
Deno.test('unverified authorization, cross-owner execution and shared treasury sources are denied',async()=>{
 let calls=0;const client=new YellowCardFullProductClient({environment:'production',apiKeyId:'key',secret:'secret'},()=>{calls++;return Promise.resolve(Response.json({}));});
 const store=memoryStore(),engine=new YellowCardPaymentEngine(client,store,cipher,{verifyAndConsume:async()=>{throw new Error('PIN proof invalid');}});
 await rejects(()=>engine.prepare(context,intent(),{}));
 const authorized=new YellowCardPaymentEngine(client,store,cipher,authorization),op=await authorized.prepare(context,intent(),{});
 await rejects(()=>authorized.execute({...context,merchantId:'b'},op));await rejects(()=>authorized.prepare(context,{...intent(),body:{...intent().body,vaultId:'someone-else'}},{}));assert(calls===0);
});

Deno.test('browser preflight is allowed only for the configured BorderPay app origins',async()=>{
 const handle=accountsHandler({environment:'production',authenticate:async()=>null,authorize:async()=>false,balances:async()=>[],rates:async()=>[]});
 const good=await handle(new Request('https://api.example',{method:'OPTIONS',headers:{Origin:'https://app.borderpayvelocity.xyz'}}));
 assert(good.status===204&&good.headers.get('Access-Control-Allow-Origin')==='https://app.borderpayvelocity.xyz');
 const bad=await handle(new Request('https://api.example',{method:'OPTIONS',headers:{Origin:'https://untrusted.example'}}));assert(bad.status===403);
});
