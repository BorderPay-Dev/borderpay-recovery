import {PDFDocument} from 'npm:pdf-lib@1.17.1';
import {validateReviewAssets} from './predeposit-document-checks.ts';
export function validateSharePair(owner:string,row:any,invoice:any,contract:any){
 if(!row||row.owner_user_id!==owner||!['matched','needs_attention','unavailable'].includes(row.status))throw Error('Finish the document check before sharing this package.');
 validateReviewAssets(owner,invoice,contract);
 if(invoice.id!==row.invoice_asset_id||contract.id!==row.contract_asset_id||invoice.sha256!==row.invoice_sha256||contract.sha256!==row.contract_sha256)throw Error('The documents changed. Upload and review the correct pair again.');
}
export async function mergeBuyerDocuments(invoice:Uint8Array,contract:Uint8Array,contractMime:string){
 if(invoice.length+contract.length>40*1024*1024)throw Error('This package is too large to share. Download the original documents.');
 const result=await PDFDocument.create();
 for(const [bytes,mime] of [[invoice,'application/pdf'],[contract,contractMime]] as const){
  if(mime==='application/pdf'){
   const document=await PDFDocument.load(bytes);if(document.getPageCount()>200||document.getPageCount()+result.getPageCount()>200)throw Error('This package has too many pages to share.');
   for(const page of await result.copyPages(document,document.getPageIndices()))result.addPage(page);
  }else if(mime==='image/png'||mime==='image/jpeg'){
   const image=mime==='image/png'?await result.embedPng(bytes):await result.embedJpg(bytes),scale=Math.min(547/image.width,794/image.height);
   const page=result.addPage([595,842]);page.drawImage(image,{x:24,y:842-24-image.height*scale,width:image.width*scale,height:image.height*scale});
  }else throw Error('Unsupported contract format.');
 }
 return result.save();
}
