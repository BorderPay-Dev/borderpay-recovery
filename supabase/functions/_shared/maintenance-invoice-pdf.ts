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
 const {data:p,error}=await db.from('user_profiles').select('bridge_customer_id').eq('id',i.user_id).single();if(error||!p?.bridge_customer_id)throw Error('Invoice buyer identity unavailable');
 const profile=await bridgeProvider.getCustomerProfile(p.bridge_customer_id);const raw:any=profile.raw;
 const buyerName=String(raw?.business_name||raw?.legal_name||'').trim();
 const address=raw?.registered_address||raw?.address_of_incorporation||raw?.business_address;
 const buyerAddress=legalAddress(address);if(!buyerName||!buyerAddress||!address?.country)throw Error('Verified company name and address required for invoice');
 const {data:master,error:me}=await db.from('user_profiles').select('id,bridge_customer_id').eq('email','founder@borderpayafrica.com').single();if(me||!master?.bridge_customer_id)throw Error('Master receiving account unavailable');
 const accounts=await bridgeProvider.listVirtualAccounts(master.bridge_customer_id);
 const usd=accounts.filter(a=>String(a.currency).toUpperCase()==='USD'&&String(a.status)==='active');
 if(usd.length!==1)throw Error('A single active master USD receiving account is required');
 const details:any=usd[0].account_details;const src=details?.source_deposit_instructions||details;
 const account=src?.bank_account_number||src?.account_number;const routing=src?.bank_routing_number||src?.routing_number;
 const holder=src?.account_holder_name||src?.beneficiary_name||src?.account_name;
 if(!account||!routing||!src?.bank_name||!holder||String(holder).replace(/[^a-z]/gi,'').toLowerCase()!=='borderpayafricainc')throw Error('Master USD bank instructions could not be verified');
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
