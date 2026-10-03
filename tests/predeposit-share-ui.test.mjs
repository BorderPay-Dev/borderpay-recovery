import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch();
try{
 for(const mode of ['supported','cancelled','unsupported','corrupt']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(mode=>{
   window.__shares=[];Object.defineProperty(navigator,'canShare',{value:()=>mode!=='unsupported',configurable:true});
   Object.defineProperty(navigator,'share',{value:async data=>{window.__shares.push({title:data.title,text:data.text,name:data.files[0].name,type:data.files[0].type,bytes:await data.files[0].text()});if(mode==='cancelled')throw new DOMException('Cancelled','AbortError');},configurable:true});
   Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text},configurable:true});
  },mode);
  await page.route('**/storage/v1/object/sign/**',route=>route.fulfill({status:200,contentType:'application/pdf',body:mode==='corrupt'?'%PDF-corrupted':'%PDF-1.4\nSynthetic buyer package\n%%EOF'}));
  await page.goto('http://127.0.0.1:4173/tests/fixtures/invoice-ui.html?share_fixture=1');
  await page.getByLabel('Continue a saved draft').selectOption('draft-1');
  await page.getByRole('button',{name:'Share to Buyer',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Share to Buyer'});
  if(mode==='corrupt'){await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').innerText(),/integrity/);assert.equal(await dialog.getByRole('button',{name:'Choose app & share PDF'}).count(),0);}
  else{
   await dialog.getByLabel('Message to buyer').waitFor();assert.equal(await dialog.getByLabel('Buyer email',{exact:true}).inputValue(),'buyer@example.com');
   assert.match(await dialog.getByLabel('Message to buyer').inputValue(),/Dear Buyer Ltd/);
   await dialog.getByLabel('Message to buyer').fill('Dear Buyer Ltd, please review invoice TEST-001.');
   await dialog.getByRole('button',{name:'Copy message',exact:true}).click();assert.equal(await page.evaluate(()=>window.__copied),'Dear Buyer Ltd, please review invoice TEST-001.');
   if(mode==='unsupported')assert.equal(await dialog.getByRole('button',{name:'Choose app & share PDF'}).count(),0);
   else{await dialog.getByRole('button',{name:'Choose app & share PDF'}).click();await page.waitForFunction(()=>window.__shares.length===1);const [s]=await page.evaluate(()=>window.__shares);assert.equal(s.text,'Dear Buyer Ltd, please review invoice TEST-001.');assert.equal(s.type,'application/pdf');assert.match(s.bytes,/Synthetic buyer package/);assert.equal(await dialog.getByRole('alert').count(),0);}
   await dialog.getByText('Open a message draft instead',{exact:true}).click();assert.equal(await dialog.getByRole('button',{name:'Open email draft'}).isEnabled(),true);assert.match(await dialog.innerText(),/Attach the downloaded PDF/);
   if(mode==='supported')await page.screenshot({path:'/tmp/predeposit-pdf-qa/share-to-buyer-mobile.png',fullPage:true});
  }
  await dialog.getByRole('button',{name:'Close sharing'}).click();assert.equal(await page.getByRole('dialog').count(),0);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');await page.close();
 }
 console.log('Share payload, recipient review, cancellation, fallback and PDF integrity checks passed.');
}finally{await browser.close();}
