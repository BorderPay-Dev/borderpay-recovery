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
        const list:Balance[]=[];
        // Bounded merchant resource count prevents a request from becoming an unbounded fan-out.
        if(bindings.length>100)throw new Error('Use paginated resource synchronization');
        for(const b of bindings) {
          if(b.resource_kind==='virtual_account')continue;
          const data=await r.client.operation(b.resource_kind==='vault'?'getVault':'getSubWalletById',{params:b.resource_kind==='vault'?{vaultId:b.provider_resource_id}:{id:b.provider_resource_id}});
          const balances=resourceBalances(b,data);
          for(const balance of balances) await r.store.request('yc_balances?on_conflict=resource_id,asset','POST',{resource_id:b.id,merchant_id:merchant,environment,asset:balance.asset,available:balance.available,held:balance.held,observed_at:balance.observedAt,provider_reference:b.provider_resource_id},'resolution=merge-duplicates,return=minimal');
          list.push(...balances);
        }
        return list;
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
