import { units, decimal, usdPortfolio, jsonAmount, balanceSpendable, type Balance } from '../supabase/functions/_shared/providers/yellowcard-money.ts';
import { EvidenceCipher, payloadHash } from '../supabase/functions/_shared/providers/yellowcard-evidence.ts';
import { institutionalParty, custodyPayment, virtualAccountPayment, type BusinessIdentity } from '../supabase/functions/_shared/providers/yellowcard-business.ts';
import { financialState, errorAction, assertRfqAcceptable } from '../supabase/functions/_shared/providers/yellowcard-lifecycle.ts';
import { reconcilePages, resourceBalances, transactionObservation } from '../supabase/functions/_shared/providers/yellowcard-reconciliation.ts';
import { YellowCardFullProductClient } from '../supabase/functions/_shared/providers/yellowcard-full-product.ts';
const assert=(v:unknown,m='Assertion failed')=>{if(!v)throw new Error(m);};
async function rejects(f:()=>unknown|Promise<unknown>){try{await f();}catch{return;}throw new Error('Expected rejection');}
Deno.test('decimal aggregation retains cents and rejects scientific/unsafe input',async()=>{
 assert(decimal(units('0.1')+units('0.2'))==='0.3');assert(decimal(units('999999999999999999.12')+units('0.01'))==='999999999999999999.13');
 await rejects(()=>units('1e6'));await rejects(()=>jsonAmount('999999999999999999.12'));await rejects(()=>units('NaN'));
});
const now=Date.parse('2026-10-03T12:00:00Z');
const base:Balance={merchantId:'merchant',environment:'production',resourceId:'usd',kind:'fiat',asset:'USD',available:'100',held:null,observedAt:new Date(now).toISOString(),active:true};
Deno.test('USD total excludes VA duplicate and values EUR and African fiat with sourced rates',()=>{
 const balances=[base,{...base,resourceId:'eur',asset:'EUR',available:'100'},{...base,resourceId:'kes',asset:'KES',available:'13000'},{...base,kind:'virtual_account' as const,available:'900'}];
 const total=usdPortfolio('merchant','production',balances,[{asset:'EUR',usdPerUnit:'1.1',observedAt:base.observedAt,source:'quote'},{asset:'KES',usdPerUnit:'0.007',observedAt:base.observedAt,source:'quote'}],now);
 assert(total.total==='301');
});
Deno.test('missing/stale rates never yield a misleading total and stablecoins are not assumed USD',()=>{
 assert(usdPortfolio('merchant','production',[{...base,asset:'EUR'}],[],now).total===null);
 assert(usdPortfolio('merchant','production',[{...base,kind:'crypto',asset:'EURC_BASE'}],[],now).total===null);
 assert(usdPortfolio('merchant','production',[base],[],now+61000).total===null);
});
Deno.test('cross-merchant and duplicate balances fail closed',async()=>{
 await rejects(()=>usdPortfolio('other','production',[base],[],now));await rejects(()=>usdPortfolio('merchant','production',[base,base],[],now));
});
Deno.test('evidence is encrypted and cannot be substituted across merchants or environments',async()=>{
 const cipher=new EvidenceCipher({v1:btoa('x'.repeat(32))},'v1');const raw=new TextEncoder().encode('synthetic identity');
 const sealed=await cipher.seal(raw,'prod:merchant-a');assert(!sealed.ciphertext.includes('synthetic'));
 assert(new TextDecoder().decode(await cipher.open(sealed,'prod:merchant-a'))==='synthetic identity');await rejects(()=>cipher.open(sealed,'sandbox:merchant-a'));await rejects(()=>cipher.open(sealed,'prod:merchant-b'));
 assert(await payloadHash({a:1,b:2})===await payloadHash({b:2,a:1}));
});
const business:BusinessIdentity={accountType:'business',merchantId:'merchant',legalName:'Synthetic Trade Ltd',registrationNumber:'SYN-001',incorporationCountry:'GB',representative:{name:'Synthetic Person',country:'GB',phone:'+440000000000',address:'Synthetic address',dob:'1980-01-01',email:'synthetic@example.com',idNumber:'SYN-ID',idType:'PASSPORT'}};
Deno.test('institution mapping keeps company and representative identities distinct',()=>{
 const p=institutionalParty(business);assert(p.businessName==='Synthetic Trade Ltd'&&p.name==='Synthetic Person'&&p.businessId==='SYN-001');
});
Deno.test('custody cannot use shared USD treasury or omit travel-rule evidence',async()=>{
 const input={merchantId:'merchant',vaultId:'vault',sequenceId:'seq',token:'USDC_BASE',amount:'100',destination:{type:'EXTERNAL' as const,address:'0xsynthetic'},countryCode:'GB',enabledTokens:['USDC_BASE']};
 await rejects(()=>custodyPayment(input));assert(custodyPayment({...input,travelRuleData:{name:'Synthetic recipient'}}).endUserId==='merchant');
 await rejects(()=>custodyPayment({...input,destination:{type:'USD_BALANCE'}}));
});
Deno.test('GBP bank sends require sort code and guide-specific wallet binding',async()=>{
 const destination:Record<string,unknown>=Object.fromEntries(['accountNumber','accountName','networkId','bankName','bankAddress','bankCity','bankPostalCode','bankCountry','city','postalCode','state','country','address'].map(k=>[k,'synthetic']));
 Object.assign(destination,{accountType:'bank',bankAccountType:'checking',outboundTransactionType:'FASTER_PAYMENTS',memo:'Invoice 123'});
 const input={walletId:'wallet-gbp',sequenceId:'seq',channelId:'channel',amountUsd:'100',currency:'GBP',reason:'services',destinationKind:'business' as const,destination};
 await rejects(()=>virtualAccountPayment(business,input));destination.sortCode='12-34-56';const p=virtualAccountPayment(business,input);assert(p.walletId==='wallet-gbp'&&!('customerType'in p));await rejects(()=>virtualAccountPayment(business,{...input,destinationKind:'individual'}));
});
Deno.test('RFQ and refunds keep acceptance separate from financial settlement',async()=>{
 assert(financialState('rfq','RFQ_ACCEPTED')==='processing');assert(financialState('receive','refund_processing')==='refund_pending');assert(financialState('custody','complete')==='completed');
 await rejects(()=>assertRfqAcceptable({status:'RFQ_QUOTE_SENT',quoteExpiresAt:new Date(now-1).toISOString()},now));assert(errorAction('POSSIBLE_DUPLICATE',400)==='reconcile_before_retry');assert(errorAction('FRAUD_CHECK',400)==='compliance_review');
});
Deno.test('pagination checkpoints only persist after a whole page and loops are rejected',async()=>{
 let checkpoint=0;
 await rejects(()=>reconcilePages({load:async()=>({items:[{id:'1'},{id:'2'}],nextCursor:'a'}),consume:async(item)=>{if(item.id==='2')throw new Error('database unavailable');},checkpoint:async()=>{checkpoint++;}}));assert(checkpoint===0);
 await rejects(()=>reconcilePages({cursor:'a',load:async()=>({items:[],nextCursor:'a'}),consume:async()=>{},checkpoint:async()=>{checkpoint++;}}));assert(checkpoint===0);
});
Deno.test('provider balance records preserve currency and reject mismatched resources',async()=>{
 const b={id:'internal',merchant_id:'merchant',environment:'production' as const,provider_resource_id:'wallet',resource_kind:'sub_wallet' as const,status:'active'};
 assert(resourceBalances(b,{id:'wallet',currency:'NGN',availableBalance:1550.5,status:'active'})[0].asset==='NGN');await rejects(()=>resourceBalances(b,{id:'other'}));
 const t=transactionObservation('receive',{id:'tx',amount:100,convertedAmount:13000,currency:'KES',status:'complete'});assert(t.currency==='USD'&&t.settled_currency==='KES'&&t.provider_fee===null);
});
Deno.test('public contracts need explicit release and ambiguous VA route confirmation',async()=>{
 let called=0;const config={environment:'production' as const,apiKeyId:'test',secret:'test'};
 const fetcher:typeof fetch=()=>{called++;return Promise.resolve(Response.json({id:'x'}));};
 const blocked=new YellowCardFullProductClient(config,fetcher);await rejects(()=>blocked.operation('createVault',{body:{name:'Synthetic'}}));assert(called===0);
 const enabled=new YellowCardFullProductClient({...config,release:{operations:['createVault'],approvalReference:'SYNTHETIC-TEST-ONLY',confirmations:[]}},fetcher);
 await enabled.operation('createVault',{body:{name:'Synthetic'}});assert(called===1);
 await rejects(()=>enabled.operation('submitVirtualAccountSend',{body:{}}));assert(called===1);
});

Deno.test('restricted, stale, future-dated and zero balances are never labelled spendable',()=>{
 assert(balanceSpendable(base,now));assert(!balanceSpendable({...base,active:false},now));assert(!balanceSpendable(base,now+61000));
 assert(!balanceSpendable({...base,observedAt:new Date(now+60000).toISOString()},now));assert(!balanceSpendable({...base,available:'0'},now));
});
