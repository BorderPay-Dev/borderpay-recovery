import {createRequire} from 'node:module';
import {strict as assert} from 'node:assert';
const require=createRequire('/tmp/borderpay-browser/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 // This smoke test must never send authentication, telemetry or financial requests to production.
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const request='bpa_'+ 'a'.repeat(43);
 await page.goto('http://127.0.0.1:4173/partner/authorize#request='+request);
 await page.getByRole('heading',{name:'Welcome Back',exact:true}).waitFor({timeout:30000});
 assert.equal(new URL(page.url()).hash,'');
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('borderpay_partner_authorization')),request);
 assert.equal(await page.getByRole('button',{name:'Allow access',exact:true}).count(),0);
 await page.screenshot({path:'customer-authorization-signin.png',fullPage:true});
 console.log('Hosted authorization uses existing sign-in; no unauthenticated consent; request removed from URL.');
}finally{await browser.close();}
