import { boundedBody } from '../_shared/providers/yellowcard-evidence.ts';
import { usdPortfolio, balanceSpendable, type Balance, type Rate } from '../_shared/providers/yellowcard-money.ts';
import type { YellowCardEnvironment } from '../_shared/providers/yellowcard-full-product.ts';
export function accountsHandler(deps:{environment:YellowCardEnvironment;authenticate:(req:Request)=>Promise<string|null>;authorize:(user:string,merchant:string)=>Promise<boolean>;balances:(merchant:string)=>Promise<Balance[]>;rates:()=>Promise<Rate[]>;accountDetails?:(merchant:string,resourceId:string)=>Promise<unknown>;allowedOrigins?:readonly string[]}) {
  const handle=async(req:Request)=>{
    if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
    const user=await deps.authenticate(req);if(!user)return Response.json({error:'Please sign in'},{status:401});
    try {
      const body=JSON.parse(new TextDecoder().decode(await boundedBody(req,4096)));
      const merchant=body.merchantId??user;
      if(typeof merchant!=='string'||!await deps.authorize(user,merchant))return Response.json({error:'Account access denied'},{status:403});
      if(body.action==='account_details') {
        if(typeof body.resourceId!=='string'||!deps.accountDetails)return Response.json({error:'Account details unavailable'},{status:400});
        return Response.json({account:await deps.accountDetails(merchant,body.resourceId)},{headers:{'Cache-Control':'no-store'}});
      }
      const [balances,rates]=await Promise.all([deps.balances(merchant),deps.rates()]);
      const total=usdPortfolio(merchant,deps.environment,balances,rates);
      // Public DTO contains neither provider names nor partner-wide identifiers.
      return Response.json({accounts:balances.filter(b=>b.kind!=='virtual_account').map(b=>({id:b.resourceId,currency:b.asset,availableBalance:b.available,pendingBalance:b.held,spendable:balanceSpendable(b),updatedAt:b.observedAt})),totalBalance:total},{headers:{'Cache-Control':'no-store'}});
    }catch{return Response.json({error:'Balances are temporarily unavailable. Please try again shortly.'},{status:503});}
  };
  return async(req:Request)=>{
    const origin=req.headers.get('Origin');
    const allowed=deps.allowedOrigins??['https://app.borderpayafrica.com','https://app.borderpayvelocity.xyz','capacitor://localhost','http://localhost'];
    if(origin&&!allowed.includes(origin))return Response.json({error:'Origin not allowed'},{status:403});
    const headers:Record<string,string>={'Vary':'Origin','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin}:{})};
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'}});
    const response=await handle(req);const merged=new Headers(response.headers);for(const [k,v]of Object.entries(headers))merged.set(k,v);
    return new Response(response.body,{status:response.status,headers:merged});
  };
}
