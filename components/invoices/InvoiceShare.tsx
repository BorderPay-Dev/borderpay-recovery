import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Share2} from 'lucide-react';
import {AppLauncher} from '@capacitor/app-launcher';
import {Capacitor} from '@capacitor/core';
import {suggestedBuyerMessage,emailDraftUrl,whatsappDraftUrl,type BuyerShareContext} from '../../supabase/functions/_shared/predeposit-share';
import {prepareInvoiceFile,releasePreparedInvoice,shareInvoice,shareCancelled,canShareInvoice,downloadPreparedInvoice,type PreparedInvoice,type SharePackage} from './invoiceShareDelivery';

export default function InvoiceShare({prepare,disabled=false}:{prepare:()=>Promise<SharePackage>;disabled?:boolean}){
 const [open,setOpen]=useState(false);
 return <><button type="button" disabled={disabled} onClick={()=>setOpen(true)}><Share2 size={18}/> Share to Buyer</button>{open&&<ShareDialog prepare={prepare} onClose={()=>setOpen(false)}/>}</>;
}
function ShareDialog({prepare,onClose}:{prepare:()=>Promise<SharePackage>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),alive=useRef(true);
 const [file,setFile]=useState<PreparedInvoice|null>(null),[context,setContext]=useState<BuyerShareContext|null>(null);
 const [email,setEmail]=useState(''),[phone,setPhone]=useState(''),[subject,setSubject]=useState(''),[text,setText]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  alive.current=true;const previous=document.activeElement as HTMLElement|null,old=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();let active=true,prepared:PreparedInvoice|null=null;
  void prepare().then(async result=>{if(!active)return;prepared=await prepareInvoiceFile(result);if(!active){releasePreparedInvoice(prepared);return;}
   if(!result.share)throw Error('Sharing is not available on this server yet. Please use Download PDF.');
   const draft=suggestedBuyerMessage(result.share);setContext(result.share);setEmail(result.share.buyer_email);setPhone(result.share.buyer_phone_number);setSubject(draft.subject);setText(draft.text);setNotice(result.notice||'');setFile(prepared);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'We could not prepare this PDF package. Close sharing and try again, or use Download PDF.');});
  return()=>{active=false;alive.current=false;document.body.style.overflow=old;previous?.focus();if(prepared)releasePreparedInvoice(prepared);};
 },[]);
 const run=async(fn:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn();}catch(e){if(alive.current&&!shareCancelled(e))setError(e instanceof Error?e.message:'Could not open sharing. Please try again.');}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const launch=async(url:string)=>{if(Capacitor.isNativePlatform()){const r=await AppLauncher.openUrl({url});if(!r.completed)throw Error('No application could open this draft. Copy the message and attach the downloaded PDF.');}else if(url.startsWith('mailto:'))window.location.href=url;else window.open(url,'_blank','noopener,noreferrer');};
 return createPortal(<dialog ref={dialog} className="ih-share-dialog" aria-labelledby="invoice-share-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <div className="ih-section-heading"><h2 id="invoice-share-title">Share to Buyer</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Close sharing">Close</button></div>
  {error&&<p className="ih-error" role="alert">{error}</p>}{notice&&<p className="ih-notice" role="status">{notice}</p>}
  {!file&&!error&&<p role="status">Preparing your invoice and included agreement…</p>}
  {file&&context&&<>
   <p>{file.file.name} · {(file.file.size/1024).toFixed(0)} KB</p>
   <p className="ih-muted">{context.contact_source==='extracted'?'Buyer details were read from your invoice. Check them before sharing.':'Review your buyer details and message before sharing.'} You select the recipient in the receiving app.</p>
   <div className="ih-grid"><label className="ih-field"><span>Buyer email</span><input type="email" value={email} maxLength={254} onChange={e=>setEmail(e.target.value)}/></label><label className="ih-field"><span>Buyer WhatsApp number</span><input type="tel" value={phone} maxLength={30} placeholder="+44…" onChange={e=>setPhone(e.target.value)}/></label></div>
   <label className="ih-field"><span>Subject</span><input value={subject} maxLength={200} onChange={e=>setSubject(e.target.value)}/></label>
   <label className="ih-field"><span>Message to buyer</span><textarea rows={9} value={text} maxLength={4000} onChange={e=>setText(e.target.value)}/></label>
   <div className="ih-actions">
    {canShareInvoice(file)&&<button type="button" className="ih-primary" disabled={busy||!text.trim()} onClick={()=>void run(async()=>{await shareInvoice(file,subject,text);if(alive.current)setNotice('Sharing closed. Check the receiving app to confirm whether your message was sent.');})}><Share2 size={18}/> Choose app & share PDF</button>}
    <button type="button" disabled={busy} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(text);if(alive.current)setNotice('Message copied. Paste it into your buyer’s conversation.');})}>Copy message</button>
    <button type="button" disabled={busy} onClick={()=>downloadPreparedInvoice(file)}>Download PDF</button>
   </div>
   <p className="ih-muted">Choose WhatsApp, Mail or Gmail in your device’s share menu. Some apps accept the PDF but omit the message; use Copy message if needed. BorderPay does not send it automatically.</p>
   <details><summary>Open a message draft instead</summary><p className="ih-muted">These drafts prefill the recipient and text only. Attach the downloaded PDF before sending.</p><div className="ih-actions">
    <button type="button" disabled={busy||!email.trim()} onClick={()=>void run(()=>launch(emailDraftUrl(email,subject,text)))}>Open email draft</button>
    <button type="button" disabled={busy||!phone.trim()} onClick={()=>void run(()=>launch(whatsappDraftUrl(phone,text)))}>Open WhatsApp draft</button>
   </div></details>
  </>}
 </dialog>,document.body);
}
