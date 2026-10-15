import { runtime, configuredEnvironment } from '../_shared/providers/yellowcard-runtime.ts';
import { resourceBalances, type BoundResource } from '../_shared/providers/yellowcard-reconciliation.ts';
import { decimal, units, type Rate, type Balance } from '../_shared/providers/yellowcard-money.ts';
import { accountsHandler } from './handler.ts';
const env=(name:string)=>Deno.env.get(name);
Deno.serve(async(req:Request)=>{
  try {
    const environment=configuredEnvironment(env),r=await runtime(environment,env);
    return await accountsHandler({environment,
      authenticate:async(request)=>{
        const token=request.headers.get('Authorization');if(!token?.startsWith('Bearer '))return null;
        const res=await fetch(new URL('/auth/v1/user',r.url),{headers:{Authorization:token,apikey:r.serviceKey},signal:AbortSignal.timeout(3000),redirect:'error'});
        if(!res.ok)return null;const user=await res.json();return typeof user.id==='string'?user.id:null;
      },
      authorize:(user,merchant)=>r.store.authorizeUser(user,merchant,environment),
      balances:async(merchant)=>{
        const bindings=await r.store.request(`yc_resources?merchant_id=eq.${encodeURIComponent(merchant)}&environment=eq.${environment}&select=id,merchant_id,environment,provider_resource_id,resource_kind,status`) as BoundResource[];
        const merchants=await r.store.request(`yc_merchants?merchant_id=eq.${encodeURIComponent(merchant)}&environment=eq.${environment}&select=status,controls_satisfied,global_blocked,cutover_approved_at`) as {status:string;controls_satisfied:boolean;global_blocked:boolean;cutover_approved_at:string|null}[];
        const m=merchants[0];const maySpend=merchants.length===1&&m.status==='active'&&m.controls_satisfied&&!m.global_blocked&&!!m.cutover_approved_at;
        const list:Balance[]=[];
        if(bindings.length>100)throw new Error('Use paginated resource synchronization');
        // Bounded concurrency avoids serial waits across currency accounts.
        for(let offset=0;offset<bindings.length;offset+=4) {
          const group=await Promise.all(bindings.slice(offset,offset+4).map(async(b)=>{
            if(b.resource_kind==='virtual_account')return [] as Balance[];
            const data=await r.client.operation(b.resource_kind==='vault'?'getVault':'getSubWalletById',{params:b.resource_kind==='vault'?{vaultId:b.provider_resource_id}:{id:b.provider_resource_id}});
            return resourceBalances(b,data);
          }));
          list.push(...group.flat());
        }
        if(list.length)await r.store.request('yc_balances?on_conflict=resource_id,asset','POST',list.map(balance=>({resource_id:balance.resourceId,merchant_id:merchant,environment,asset:balance.asset,available:balance.available,held:balance.held,observed_at:balance.observedAt,provider_reference:bindings.find(b=>b.id===balance.resourceId)!.provider_resource_id})),'resolution=merge-duplicates,return=minimal');
        return list.map(balance=>({...balance,active:balance.active&&maySpend}));
      },
      accountDetails:async(merchant,id)=>{
        const scope=`merchant_id=eq.${encodeURIComponent(merchant)}&environment=eq.${environment}`;
        const merchants=await r.store.request(`yc_merchants?${scope}&status=eq.active&controls_satisfied=eq.true&global_blocked=eq.false&select=merchant_id`) as unknown[];
        if(merchants.length!==1)throw new Error('Receiving account unavailable');
        const rows=await r.store.request(`yc_resources?${scope}&resource_kind=eq.virtual_account&id=eq.${encodeURIComponent(id)}&status=eq.active&select=provider_resource_id`) as {provider_resource_id:string}[];
        if(rows.length!==1)throw new Error('Receiving account unavailable');
        const data=await r.client.operation('getVirtualAccountById',{params:{id:rows[0].provider_resource_id}}) as Record<string,unknown>;
        if(data.id!==rows[0].provider_resource_id||data.status!=='ACTIVE')throw new Error('Receiving account unavailable');
        return Object.fromEntries(['currency','accountName','accountNumber','routingNumber','swiftCode','bankName','bankAddress','iban','sortCode','status'].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
      },
      rates:async()=>{
        const response=await r.client.operation('getRates') as {rates?:{code?:string;currency?:string;buy?:number;updatedAt?:string}[]};const rates:Rate[]=[];
        for(const row of response.rates??[]) {
          const asset=row.code??row.currency;if(!asset||!row.buy||!Number.isFinite(row.buy))continue;
          const denominator=units(String(row.buy));if(denominator<=0n)continue;
          rates.push({asset,usdPerUnit:decimal(1000000000000n*1000000000000n/denominator),observedAt:row.updatedAt??new Date().toISOString(),source:'yc_rates_buy_local_per_usd'});
        }
        return rates;
      }
    })(req);
  }catch{return Response.json({error:'Account service unavailable'},{status:503});}
});
