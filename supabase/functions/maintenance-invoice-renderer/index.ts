import {createClient} from 'jsr:@supabase/supabase-js@2';
import {maintenancePdf,pdfBase64} from '../_shared/maintenance-invoice-pdf.ts';
const base=Deno.env.get('SUPABASE_URL')||'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const worker=Deno.env.get('WORKER_AUTH_TOKEN')||'';
const db=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function equal(a:string,b:string){if(!a||!b||a.length!==b.length)return false;let diff=0;for(let n=0;n<a.length;n++)diff|=a.charCodeAt(n)^b.charCodeAt(n);return diff===0;}
Deno.serve(async req=>{
 if(req.method!=='POST')return json({success:false,error:'Method not allowed'},405);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!equal(token,service)&&!equal(token,worker))return json({success:false,error:'Unauthorized'},401);
 try{
  const body=await req.json();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(body.invoice_id||'')))return json({success:false,error:'Invoice required'},400);
  const {data:i,error}=await db.from('subscription_external_invoices').select('*').eq('id',body.invoice_id).single();if(error)throw Error('Invoice unavailable');
  const {data:s}=await db.from('subscriptions').select('account_type').eq('id',i.subscription_id).eq('user_id',i.user_id).single();
  if(s?.account_type!=='business')return json({success:false,error:'Business invoice required'},400);
  const pdf=await maintenancePdf(db,i);
  return json({success:true,name:pdf.name,invoiceNumber:pdf.invoiceNumber,buyerName:pdf.buyerName,content:pdfBase64(pdf.bytes)});
 }catch(error){return json({success:false,error:error instanceof Error?error.message:'Invoice generation unavailable'},500);}
});
