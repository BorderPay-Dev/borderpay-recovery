import React,{useEffect,useState} from 'react';
import {supabase,BASE_URL,ANON_KEY} from '../../utils/supabase/client';
export const isPartnerAuthorizationPath=()=>window.location.pathname.replace(/\/+$/,'')==='/partner/authorize';
// Capture before asynchronous auth routing; keep request secrets out of query strings and referrers.
if(isPartnerAuthorizationPath()){
 const request=new URLSearchParams(window.location.hash.slice(1)).get('request');
 if(request&&/^bpa_[A-Za-z0-9_-]{43}$/.test(request)){
  sessionStorage.setItem('borderpay_partner_authorization',request);
  window.history.replaceState({},'','/partner/authorize');
 }
}
const labels:Record<string,string>={
 'customers:read':'View your business verification status',
 'customers:write':'Start business verification requests',
 'onboarding:write':'Request verification links',
 'wallets:read':'View wallets and balances',
 'wallets:write':'Manage wallets and withdrawal addresses',
 'virtual_accounts:read':'View your receiving accounts',
 'virtual_accounts:write':'Request receiving accounts',
 'external_accounts:read':'View saved bank accounts',
 'external_accounts:write':'Manage saved bank accounts',
 'transfers:read':'View payments and payment status',
 'transfers:write':'Request payments, subject to your payment authorization',
 'payouts:write':'Request payouts, subject to your payment authorization',
};
export function PartnerCustomerAuthorization(){
 const [details,setDetails]=useState<any>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 async function request(action:string){
  const session=await supabase.auth.getSession();
  if(!session.data.session?.access_token)throw new Error('Sign in to your BorderPay business account to continue.');
  const response=await fetch(`${BASE_URL}/customer-authorization`,{method:'POST',headers:{'Content-Type':'application/json',apikey:ANON_KEY,Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({request:sessionStorage.getItem('borderpay_partner_authorization'),action}),cache:'no-store'});
  const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'We could not complete authorization. Please try again.');
  return result.data;
 }
 useEffect(()=>{let active=true;request('inspect').then(d=>{if(active)setDetails(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function decide(action:string){
  setBusy(true);setError('');
  try{const data=await request(action);sessionStorage.removeItem('borderpay_partner_authorization');window.location.replace(data.redirect_url);}catch(e:any){setError(e.message);setBusy(false);}
 }
 return <main className="min-h-screen bg-[#0B0E11] text-white px-6 py-12 flex items-center justify-center">
  <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#15191D] p-7" aria-labelledby="authorization-title">
   <p className="text-sm font-semibold tracking-wide text-[#C8FF00] mb-6">BorderPay Velocity</p>
   <h1 id="authorization-title" className="text-2xl font-semibold mb-3">Connect your business</h1>
   {!details&&!error&&<p role="status" className="text-gray-300">Loading authorization details…</p>}
   {details&&<>
    <p className="text-gray-300 mb-5"><strong className="text-white">{details.partner_name}</strong> is requesting access to your BorderPay business account.</p>
    <ul className="space-y-3 list-disc pl-5 text-sm text-gray-200">{details.scopes.map((s:string)=><li key={s}>{labels[s]||s}</li>)}</ul>
    <p className="text-sm text-gray-400 mt-6">Access lasts up to 15 minutes. Payments still require applicable authorization and account checks.</p>
    <p className="text-sm text-gray-400 mt-3 break-all">After your decision, you will return to {details.redirect_origin}.</p>
   </>}
   {error&&<p role="alert" className="mt-5 rounded-xl bg-red-950/40 p-4 text-red-200 text-sm">{error}</p>}
   {details&&<div className="flex gap-3 mt-7">
    <button type="button" disabled={busy} onClick={()=>decide('deny')} className="flex-1 rounded-full border border-white/20 py-3 disabled:opacity-50">Decline</button>
    <button type="button" disabled={busy} onClick={()=>decide('allow')} className="flex-1 rounded-full bg-[#C8FF00] text-black font-semibold py-3 disabled:opacity-50">{busy?'Continuing…':'Allow access'}</button>
   </div>}
   <a href="/" className="block mt-6 text-sm text-gray-400 underline">Back to BorderPay</a>
  </section>
 </main>;
}
