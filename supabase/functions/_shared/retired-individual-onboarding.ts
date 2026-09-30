export function retiredIndividualOnboarding(req: Request): Response {
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 return new Response(JSON.stringify({success:false,code:'individual_onboarding_disabled',error:'BorderPay onboarding is available to business accounts only.'}),{status:403,headers});
}
