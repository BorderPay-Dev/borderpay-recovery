import { boundedBody } from '../_shared/providers/yellowcard-evidence.ts';
import { usdPortfolio, type Balance, type Rate } from '../_shared/providers/yellowcard-money.ts';
import type { YellowCardEnvironment } from '../_shared/providers/yellowcard-full-product.ts';
export function accountsHandler(deps:{environment:YellowCardEnvironment;authenticate:(req:Request)=>Promise<string|null>;authorize:(user:string,merchant:string)=>Promise<boolean>;balances:(merchant:string)=>Promise<Balance[]>;rates:()=>Promise<Rate[]>}) {
  return async(req:Request)=>{
    if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
    const user=await deps.authenticate(req);if(!user)return Response.json({error:'Please sign in'},{status:401});
    try {
      const body=JSON.parse(new TextDecoder().decode(await boundedBody(req,4096)));
      const merchant=body.merchantId??user;
      if(typeof merchant!=='string'||!await deps.authorize(user,merchant))return Response.json({error:'Account access denied'},{status:403});
      const balances=await deps.balances(merchant),rates=await deps.rates();
      const total=usdPortfolio(merchant,deps.environment,balances,rates);
      // Public DTO contains neither provider names nor partner-wide identifiers.
      return Response.json({accounts:balances.filter(b=>b.kind!=='virtual_account').map(b=>({id:b.resourceId,currency:b.asset,availableBalance:b.available,pendingBalance:b.held,spendable:b.active&&Date.now()-Date.parse(b.observedAt)<=60000,updatedAt:b.observedAt})),totalBalance:total},{headers:{'Cache-Control':'no-store'}});
    }catch{return Response.json({error:'Balances are temporarily unavailable. Please try again shortly.'},{status:503});}
  };
}
