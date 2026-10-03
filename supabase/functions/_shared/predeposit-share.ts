// Contact suggestions are never delivery authorizations. The merchant reviews them.
export type BuyerShareContext = {buyer_name:string;buyer_email:string;buyer_phone_number:string;merchant_name:string;invoice_number:string;currency:string;total:string;contact_source:'saved'|'extracted'|'missing'};
export const oneLine=(value:unknown,max=300)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
export function emailAddress(value:unknown):string {
 if(typeof value!=='string'||/[\r\n]/.test(value))return '';
 const s=value.trim();return s.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(s)?s:'';
}
export function internationalPhone(value:unknown):string {
 if(typeof value!=='string'||!/^\+[\d ()-]+$/.test(value.trim()))return '';
 const s=value.replace(/[ ()-]/g,'');return /^\+[1-9]\d{7,14}$/.test(s)?s:'';
}
export function invoiceShareContext(payload:any,invoiceNumber:string):BuyerShareContext {
 const total=(payload?.items||[]).reduce((n:number,i:any)=>n+i.quantity*i.unit_amount_minor,0);
 const email=emailAddress(payload?.buyer?.email),phone=internationalPhone(payload?.buyer?.phone_number);
 return {buyer_name:oneLine(payload?.buyer?.legal_name),buyer_email:email,buyer_phone_number:phone,merchant_name:oneLine(payload?.merchant?.legal_name),invoice_number:oneLine(invoiceNumber,80),currency:['USD','EUR','GBP'].includes(payload?.currency)?payload.currency:'',total:Number.isSafeInteger(total)&&total>0?String(Math.floor(total/100))+'.'+String(total%100).padStart(2,'0'):'',contact_source:email||phone?'saved':'missing'};
}
export function suggestedBuyerMessage(c:BuyerShareContext):{subject:string;text:string} {
 const reference=oneLine(c.invoice_number,80),seller=oneLine(c.merchant_name),buyer=oneLine(c.buyer_name);
 const amount=['USD','EUR','GBP'].includes(c.currency)&&/^\d+\.\d{2}$/.test(c.total)?` for ${c.currency} ${c.total}`:'';
 return {subject:`Invoice${reference?' '+reference:''}${seller?' from '+seller:''}`,text:`Dear ${buyer||'Customer'},\n\nPlease find the invoice${reference?' '+reference:''}${amount} in the attached PDF package. Any included agreement follows the invoice. Please review the documents and use the payment instructions and reference shown on the invoice, where provided.\n\nIf you have any questions, please reply before making payment.\n\nKind regards,\n${seller||'Your supplier'}`};
}
export function emailDraftUrl(email:string,subject:string,text:string){
 const address=emailAddress(email);if(!address)throw Error('Enter a valid buyer email address.');
 return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(oneLine(subject,200))}&body=${encodeURIComponent(text)}`;
}
export function whatsappDraftUrl(phone:string,text:string){
 const number=internationalPhone(phone);if(!number)throw Error('Enter the buyer’s phone number with its country code, for example +44.');
 return `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(text)}`;
}
// Optional contact fields may not invalidate the existing compliance comparison.
// Reject fabricated quotes, multiple recipients and contacts not tied to the buyer.
export function extractedBuyerContacts(document:any,ocrText:string){
 const normalize=(v:string)=>v.normalize('NFKC').replace(/\s+/gu,' ').trim();
 const buyer=oneLine(document?.buyer?.value),out:any={buyer_name:buyer,buyer_email:'',buyer_phone_number:'',contact_source:'missing'};
 for(const [field,target,validate] of [['buyer_email','buyer_email',emailAddress],['buyer_phone_number','buyer_phone_number',internationalPhone]] as const){
  const cell=document?.[field];if(!cell||typeof cell.quote!=='string'||!buyer||cell.quote.length>1500)continue;
  const value=validate(cell.value);if(!value||!normalize(ocrText).includes(normalize(cell.quote))||!normalize(cell.quote).includes(normalize(buyer)))continue;
  const quoted=field==='buyer_phone_number'?cell.quote.replace(/[ ()-]/g,''):cell.quote;
  if(!quoted.includes(value))continue;
  out[target]=value;out.contact_source='extracted';
 }
 return out as Pick<BuyerShareContext,'buyer_name'|'buyer_email'|'buyer_phone_number'|'contact_source'>;
}
