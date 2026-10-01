export async function maintenanceEmailCapacity(db:any):Promise<number>{
 const key=Deno.env.get("BREVO_API_KEY")??Deno.env.get("BREVO_API_KEYS")??"";
 if(!key)return 0;
 try{
  const day=new Date().toISOString().slice(0,10),start=`${day}T00:00:00.000Z`,headers={"api-key":key,accept:"application/json"};
  const [account,stats,local]=await Promise.all([
   fetch("https://api.brevo.com/v3/account",{headers,signal:AbortSignal.timeout(10000)}),
   fetch(`https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${day}&endDate=${day}`,{headers,signal:AbortSignal.timeout(10000)}),
   db.from("email_log").select("id",{count:"exact",head:true}).or(`created_at.gte.${start},sent_at.gte.${start}`)
  ]);
  if(!account.ok||!stats.ok||local.error||typeof local.count!=="number")return 0;
  const a=await account.json(),s=await stats.json(),used=Number(s.requests);
  if(!Number.isFinite(used)||used<0)return 0;
  const credits=(a.plan??[]).filter((p:any)=>["free","subscription","payAsYouGo"].includes(p.type)).map((p:any)=>Number(p.credits)).filter((n:number)=>Number.isFinite(n)&&n>=0);
  return Math.max(0,Math.floor(Math.min(300-Math.max(used,local.count),...(credits.length?credits:[300]))-20));
 }catch{return 0;}
}
