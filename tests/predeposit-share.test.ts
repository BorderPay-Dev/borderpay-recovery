import assert from 'node:assert/strict';
import {PDFDocument} from 'npm:pdf-lib@1.17.1';
import {emailAddress,internationalPhone,emailDraftUrl,whatsappDraftUrl,extractedBuyerContacts,invoiceShareContext,suggestedBuyerMessage} from '../supabase/functions/_shared/predeposit-share.ts';
import {validateSharePair,mergeBuyerDocuments} from '../supabase/functions/_shared/predeposit-share-package.ts';
Deno.test('recipient links reject injected headers, lists, malformed domains and inferred phone country codes',()=>{
 for(const s of ['a@example.com\r\nBcc:other@example.com','one@example.com,two@example.com','invalid'])assert.equal(emailAddress(s),'');
 assert.throws(()=>emailDraftUrl('one@example.com\nBcc:test@example.com','Invoice','Text'));
 assert.equal(internationalPhone('020 1234 5678'),'');assert.equal(internationalPhone('+44 (20) 1234-5678'),'+442012345678');
 assert.equal(whatsappDraftUrl('+442012345678','Hi & welcome\nInvoice'), 'https://wa.me/442012345678?text=Hi%20%26%20welcome%0AInvoice');
 assert.match(emailDraftUrl('buyer+ap@example.com','INV & Co','Hello\nBuyer'),/^mailto:buyer%2Bap%40example.com\?subject=INV%20%26%20Co&body=Hello%0ABuyer$/);
});
Deno.test('AI contact candidates need exact source evidence tied to the buyer and never fall back to seller contacts',()=>{
 const quote='Buyer: Example Buyer Ltd, buyer@example.com, +44 20 1234 5678',doc={buyer:{value:'Example Buyer Ltd'},buyer_email:{value:'buyer@example.com',quote},buyer_phone_number:{value:'+442012345678',quote}};
 assert.deepEqual(extractedBuyerContacts(doc,quote),{buyer_name:'Example Buyer Ltd',buyer_email:'buyer@example.com',buyer_phone_number:'+442012345678',contact_source:'extracted'});
 assert.equal(extractedBuyerContacts(doc,'Different invoice').buyer_email,'');
 doc.buyer_email={value:'seller@example.com',quote:'Seller: seller@example.com'};
 assert.equal(extractedBuyerContacts(doc,quote+'\nSeller: seller@example.com').buyer_email,'');
 doc.buyer_email={value:'invented@example.com',quote};assert.equal(extractedBuyerContacts(doc,quote).buyer_email,'');
});
Deno.test('contextual message uses the same invoice snapshot and never includes compliance evidence or signed URLs',()=>{
 const c=invoiceShareContext({buyer:{legal_name:'Buyer Ltd',email:'buyer@example.com'},merchant:{legal_name:'Seller Ltd'},currency:'GBP',items:[{quantity:2,unit_amount_minor:12500}],source_of_funds:'PRIVATE',documents:[{url:'https://private.example'}]},'INV-100');
 const d=suggestedBuyerMessage(c);assert.match(d.text,/Dear Buyer Ltd/);assert.match(d.text,/GBP 250.00/);assert.match(d.subject,/INV-100/);assert.doesNotMatch(JSON.stringify(d),/PRIVATE|https:|approved|paid/i);
 assert.equal(c.contact_source,'saved');
});
Deno.test('uploaded sharing stays owner and hash bound, and rejects unfinished checks or rejected evidence',()=>{
 const i={id:'i',owner_user_id:'a',kind:'merchant_invoice',mime_type:'application/pdf',sha256:'ih',scan_status:'clean'},c={id:'c',owner_user_id:'a',kind:'executed_contract',mime_type:'application/pdf',sha256:'ch',scan_status:'clean'},r={owner_user_id:'a',status:'matched',invoice_asset_id:'i',contract_asset_id:'c',invoice_sha256:'ih',contract_sha256:'ch'};
 validateSharePair('a',r,i,c);assert.throws(()=>validateSharePair('b',r,i,c));assert.throws(()=>validateSharePair('a',{...r,status:'reviewing'},i,c));assert.throws(()=>validateSharePair('a',r,{...i,sha256:'changed'},c));assert.throws(()=>validateSharePair('a',r,i,{...c,scan_status:'rejected'}));
});
Deno.test('buyer package contains invoice then contract and never mutates original PDFs',async()=>{
 const a=await PDFDocument.create(),b=await PDFDocument.create();a.addPage([300,400]);b.addPage([500,600]);const ab=await a.save(),bb=await b.save(),before=ab.slice();
 const merged=await PDFDocument.load(await mergeBuyerDocuments(ab,bb,'application/pdf'));assert.equal(merged.getPageCount(),2);assert.equal(merged.getPage(0).getWidth(),300);assert.equal(merged.getPage(1).getWidth(),500);assert.deepEqual(ab,before);
});
