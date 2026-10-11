import {renderInvoiceDocument} from './predeposit-pdf.ts';
import {loadPdfStyleAssets} from './predeposit-pdf-assets.ts';
import {maintenanceDates} from './maintenance-calendar.ts';
import {bridgeProvider} from './providers/bridge.ts';
import type {Invoice} from './predeposit-policy.ts';
import type {BankPaymentInstructions} from './predeposit-payment-instructions.ts';

export function maintenanceInvoiceNumber(i:{id:string;billing_period:string}){return `BP-M-${i.billing_period.slice(0,7).replace('-','')}-${i.id.slice(0,8).toUpperCase()}`;}
export function legalAddress(a:any):string {
 if(!a || typeof a!=='object')return '';
 return [a.street_line_1||a.street_line1||a.line1,a.street_line_2||a.street_line2||a.line2,a.city,a.subdivision||a.state,a.postal_code].filter(Boolean).join(', ');
}
export async function maintenancePdf(db:any,i:any) {
 const {data:master,error:me}=await db.from('user_profiles').select('id,bridge_customer_id').eq('email','founder@borderpayafrica.com').single();if(me||!master?.bridge_customer_id)throw Error('Master receiving account unavailable');
 const accounts=await bridgeProvider.listVirtualAccounts(master.bridge_customer_id);
 const usd=accounts.filter(a=>String(a.currency).toUpperCase()==='USD'&&['active','activated'].includes(String(a.status).toLowerCase()));
 if(usd.length!==1)throw Error('A single active master USD receiving account is required');
 const details:any=usd[0].account_details;const src=details?.source_deposit_instructions||details;
 const account=src?.bank_account_number||src?.account_number;const routing=src?.bank_routing_number||src?.routing_number;
 const holder=src?.bank_beneficiary_name||src?.account_holder_name||src?.beneficiary_name||src?.account_name;
 if(!account||!routing||!src?.bank_name||!holder||String(holder).replace(/[^a-z]/gi,'').toLowerCase()!=='borderpayafricainc')throw Error('Master USD bank instructions could not be verified');
 const {data:p,error}=await db.from('user_profiles').select('bridge_customer_id').eq('id',i.user_id).single();if(error||!p?.bridge_customer_id)throw Error('Invoice buyer identity unavailable');
 const profile=await bridgeProvider.getCustomerProfile(p.bridge_customer_id);const envelope:any=profile.raw;const raw:any=envelope?.data||envelope;
 const {data:business,error:be}=await db.from('business_profiles').select('company_name,address,city,state,postal_code,country,bridge_customer_id,bridge_kyb_status').eq('user_id',i.user_id).single();if(be)throw be;
 const verifiedLocal=business?.bridge_customer_id===p.bridge_customer_id&&['approved','verified'].includes(business?.bridge_kyb_status);
 const buyerName=String(raw?.business_legal_name||raw?.business_name||raw?.legal_name||(verifiedLocal?business.company_name:'')||'').trim();
 const merchantAccounts=await bridgeProvider.listVirtualAccounts(p.bridge_customer_id);
 // The customer endpoint may redact street addresses. Named receiving instructions
 // can supply the provider's beneficiary address; never use the bank's own address.
 const normalizeName=(v:unknown)=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
 const beneficiaryAddresses=merchantAccounts.flatMap(a=>{
   const d:any=a.account_details;const sources=Array.isArray(d?.source_deposit_instructions)?d.source_deposit_instructions:[d?.source_deposit_instructions];
   return sources.flatMap((v:any)=>{
     const name=v?.bank_beneficiary_name||v?.account_holder_name||v?.beneficiary_name;
     if(!name||normalizeName(name)!==normalizeName(buyerName))return [];
     const addr=v?.bank_beneficiary_address||v?.beneficiary_address;
     if(typeof addr==='string'&&addr.trim().length>=15)return [{street_line_1:addr,country:business?.country||raw?.registered_address?.country}];
     return addr&&typeof addr==='object'?[addr]:[];
   });
 });
 const candidates=[raw?.registered_address,raw?.address_of_incorporation,raw?.business_address,verifiedLocal?{street_line_1:business.address,city:business.city,subdivision:business.state,postal_code:business.postal_code,country:business.country}:null,...beneficiaryAddresses];
 const address=candidates.find(a=>a?.country&&String(a.street_line_1||a.street_line1||a.line1||'').trim());
 const buyerAddress=legalAddress(address);if(!buyerName||!buyerAddress||!address?.country)throw Error('Verified company name and full street address required for invoice');
 const invoiceNumber=maintenanceInvoiceNumber(i);const styles=await loadPdfStyleAssets(db);
 const font=await db.storage.from('predeposit-render-assets').download('NotoSans-Regular.ttf');if(font.error||!font.data)throw Error('Invoice font unavailable');
 const month=new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(i.billing_period+'T00:00:00Z'));
 const inv={currency:i.currency,revision:1,merchant:{legal_name:'BorderPay Africa, Inc.',incorporation_country:'USA'},buyer:{legal_name:buyerName,address:buyerAddress,country:address.country},items:[{description:'Account maintenance fee - '+month,quantity:1,unit_amount_minor:Math.round(Number(i.amount)*100)}]} as Invoice;
 const bank={beneficiary_name:holder,bank_name:src.bank_name,account_number:String(account),routing_number:String(routing),required_payment_reference:src.deposit_message||src.reference||invoiceNumber} as BankPaymentInstructions;
 const bytes=await renderInvoiceDocument({invoice:inv,invoiceNumber,fontBytes:new Uint8Array(await font.data.arrayBuffer()),...styles,logo:styles.brandLogo,bank,approved:true,
 sellerAddress:'131 Continental Dr, Suite 305\nNewark, New Castle County, DE 19713\nUnited States',
 billingDates:{issued:i.created_at.slice(0,10),due:i.billing_period,deadline:maintenanceDates(i.billing_period).deadline},paymentUrl:i.payment_link,
 paymentNote:'Bank transfer: pay in USD using the bank details above. Include the invoice reference where permitted, then contact support@borderpayvelocity.xyz with your invoice number and payment receipt. Bank transfers require confirmation by our team. Flutterwave payments are confirmed automatically. Payment clears maintenance restrictions only; any separate account review still applies.'});
 return {name:invoiceNumber+'.pdf',bytes,buyerName,invoiceNumber};
}
export function pdfBase64(bytes:Uint8Array){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);}
