import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import type {BuyerShareContext} from '../../supabase/functions/_shared/predeposit-share';

export type SharePackage={url:string;sha256:string;filename?:string;share:BuyerShareContext;notice?:string};
export type PreparedInvoice={file:File;nativeUri?:string;cachePath?:string};
const MAX=40*1024*1024,folder='invoice-share';
export const shareCancelled=(e:unknown)=>e instanceof Error&&(e.name==='AbortError'||/cancel|dismiss/i.test(e.message));
export async function prepareInvoiceFile(result:SharePackage):Promise<PreparedInvoice>{
 const u=new URL(result.url),configured=new URL(import.meta.env.VITE_SUPABASE_URL||'https://orwrcpwsffjlvzuraxjc.supabase.co');
 if(u.origin!==configured.origin||u.protocol!=='https:'||u.username||u.password||!u.pathname.startsWith('/storage/v1/object/sign/')||!/^[a-f0-9]{64}$/i.test(result.sha256))throw Error('The secure PDF could not be verified. Please try again.');
 const r=await fetch(u,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('The PDF link has expired or is unavailable. Close sharing and try again.');
 if(Number(r.headers.get('content-length')||0)>MAX)throw Error('This PDF is too large to share. Use Download PDF instead.');
 const reader=r.body?.getReader();if(!reader)throw Error('The PDF could not be downloaded.');
 const parts:Uint8Array[]=[];let size=0;
 try{for(;;){const v=await reader.read();if(v.done)break;size+=v.value.length;if(size>MAX){await reader.cancel();throw Error('This PDF is too large to share. Use Download PDF instead.');}parts.push(v.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('The downloaded file is not a PDF.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==result.sha256.toLowerCase())throw Error('The PDF integrity check failed. Please try again.');
 const filename=(result.filename||'Invoice-and-agreement.pdf').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,120).replace(/\.pdf$/i,'')+'.pdf';
 const file=new File([bytes],filename,{type:'application/pdf'});
 if(!Capacitor.isNativePlatform())return {file};
 // Cache only the buyer copy. Remove stale files without accessing other app data.
 try{const old=await Filesystem.readdir({path:folder,directory:Directory.Cache});for(const f of old.files)if(f.mtime&&f.mtime<Date.now()-3600000)await Filesystem.deleteFile({path:folder+'/'+f.name,directory:Directory.Cache});}catch{/* first use or OS cleanup */}
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Could not prepare the PDF.'));reader.readAsDataURL(file);});
 const cachePath=folder+'/'+crypto.randomUUID()+'.pdf';
 const written=await Filesystem.writeFile({path:cachePath,directory:Directory.Cache,data,recursive:true});
 return {file,nativeUri:written.uri,cachePath};
}
export function releasePreparedInvoice(prepared:PreparedInvoice){
 // The target app may read after its compose window opens. Do not revoke early.
 if(prepared.cachePath)setTimeout(()=>{void Filesystem.deleteFile({path:prepared.cachePath!,directory:Directory.Cache}).catch(()=>{});},3600000);
}
export function canShareInvoice(prepared:PreparedInvoice){return !!prepared.nativeUri||!!(navigator.canShare&&navigator.canShare({files:[prepared.file]}));}
export async function shareInvoice(prepared:PreparedInvoice,subject:string,text:string){
 if(prepared.nativeUri){await Share.share({title:subject,text,files:[prepared.nativeUri],dialogTitle:'Share to Buyer'});return;}
 if(!canShareInvoice(prepared))throw Error('File sharing is not supported by this browser. Download the PDF and use a message draft below.');
 await navigator.share({title:subject,text,files:[prepared.file]});
}
export function downloadPreparedInvoice(prepared:PreparedInvoice){
 const url=URL.createObjectURL(prepared.file),a=document.createElement('a');a.href=url;a.download=prepared.file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
