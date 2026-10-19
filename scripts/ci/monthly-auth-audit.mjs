// Production-safe monthly authentication smoke audit. No merchants, emails or
// provider products are created. Never print responses, tokens or page contents.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const APP = 'https://app.borderpayafrica.com';
const API = 'https://orwrcpwsffjlvzuraxjc.supabase.co';
const email = process.env.AUTH_AUDIT_EMAIL;
const password = process.env.AUTH_AUDIT_PASSWORD;
const anonKey = process.env.AUTH_AUDIT_ANON_KEY;
const results = [];
let step = 'configuration', browser, session, failed = false;
function check(condition) { if (!condition) throw new Error('audit_check_failed'); }
async function run(name, fn) {
  step = name;
  const start = Date.now();
  await fn();
  results.push({ check:name, status:'PASS', elapsed_ms:Date.now()-start });
  console.log(`PASS: ${name}`);
}
async function request(path, body, token = anonKey, method) {
  const response = await fetch(`${API}${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: { apikey:anonKey, Authorization:`Bearer ${token}`, 'Content-Type':'application/json', Origin:APP },
    body:body === undefined ? undefined : JSON.stringify(body),
    signal:AbortSignal.timeout(20_000),
    redirect:'error',
  });
  return { status:response.status, body:await response.json().catch(()=>({})) };
}
try {
  check(email === 'appreview.business@borderpayafrica.com' && password && anonKey);
  await run('authentication service health', async()=>check((await request('/auth/v1/health')).status === 200));
  const malformed = {email:'monthly-auth-audit@borderpayvelocity.xyz', password:'x', full_name:'Synthetic audit', country_code:'FR', account_type:'business', company_name:'Synthetic audit'};
  for (const [name, body, statuses, code] of [
    ['incomplete signup rejected', {}, [400]],
    ['personal signup rejected', {...malformed, account_type:'individual'}, [403], 'business_signup_only'],
    ['disposable email rejected', {...malformed, email:'audit@uberip.com'}, [400], 'business_email_required'],
    ['consumer email rejected', {...malformed, email:'audit@gmail.com'}, [400], 'business_email_required'],
    ['email alias rejected', {...malformed, email:'audit+alias@borderpayvelocity.xyz'}, [400], 'business_email_required'],
    ['signup security check required', malformed, [400], 'captcha_required'],
  ]) await run(name, async()=> {
    // Even if CAPTCHA enforcement regresses, the deliberately invalid password
    // cannot satisfy production's minimum password policy.
    const r=await request('/functions/v1/auth-signup',body);
    check(statuses.includes(r.status) && (!code || r.body.code===code));
  });
  await run('direct authentication signup closed',async()=>{
    const r=await request('/auth/v1/settings');
    check(r.status===200 && r.body.disable_signup===true && r.body.mailer_autoconfirm===false);
  });
  await run('invalid login rejected',async()=>{
    const r=await request('/auth/v1/token?grant_type=password',{email:'audit@example.invalid',password:crypto.randomBytes(24).toString('hex')});
    check(r.status===400 && r.body.code==='invalid_credentials');
  });
  await run('private profile requires authentication',async()=>{
    check([401,403].includes((await request('/functions/v1/get-user-profile',{})).status));
  });
  for(const endpoint of ['auth-reset-password','auth-resend-verification']) {
    await run(`${endpoint} rejects empty input`,async()=>check((await request(`/functions/v1/${endpoint}`,{})).status===400));
  }
  const { chromium }=await import(process.env.AUTH_AUDIT_PLAYWRIGHT_MODULE || 'playwright');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.setDefaultTimeout(20_000);
  await run('web login screen opens',async()=>{
    const r=await page.goto(APP,{waitUntil:'domcontentloaded'}); check(r?.status()===200);
    await page.getByRole('button',{name:/skip/i}).click();
    await page.getByRole('button',{name:'Sign In',exact:true}).waitFor({state:'visible'});
  });
  await run('business signup form and countries load',async()=>{
    await page.getByText('Sign Up',{exact:true}).click();
    await page.getByRole('heading',{name:'Create Business Account',exact:true}).waitFor({state:'visible'});
    const country = page.locator('label').filter({hasText:'Country of Incorporation'}).locator('..').getByRole('button');
    await country.waitFor({state:'visible'});
    await page.waitForFunction(() => Array.from(document.querySelectorAll('label')).some(l => l.textContent?.includes('Country of Incorporation') && l.parentElement?.querySelector('button:not([disabled])')));
    check(await country.isEnabled());
    // No form submission, CAPTCHA solving, or account creation.
    check(await page.getByRole('button',{name:'Create Account',exact:true}).isVisible());
    await page.getByText('Sign In',{exact:true}).click();
  });
  await run('password reset outage offers retry',async()=>{
    await page.getByRole('button',{name:/forgot password/i}).click();
    const pattern='**/functions/v1/auth-reset-password';
    await page.route(pattern,route=>route.fulfill({status:503,contentType:'application/json',body:'{"success":false}'}));
    await page.locator('input[type=email]').fill('audit@example.invalid');
    await page.getByRole('button',{name:/send reset/i}).click();
    await page.getByText("We couldn't request your reset link. Please try again shortly.",{exact:true}).waitFor({state:'visible'});
    check(!await page.getByRole('heading',{name:'Check Your Email'}).isVisible());
    await page.unroute(pattern);
    await page.getByRole('button',{name:/back to sign in/i}).click();
  });
  await run('demo password login reaches dashboard',async()=>{
    await page.locator('input[type=email]').fill(email);
    await page.locator('input[type=password]').fill(password);
    const responsePromise=page.waitForResponse(r=>r.url().startsWith(`${API}/auth/v1/token?grant_type=password`) && r.request().method()==='POST');
    await page.getByRole('button',{name:'Sign In',exact:true}).click();
    const r=await responsePromise;check(r.status()===200);session=await r.json();
    check(session.access_token && session.refresh_token);
    await page.getByText('Create Invoice & Contract',{exact:true}).waitFor({state:'visible'});
  });
  await run('login survives page reload',async()=>{
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByText('Create Invoice & Contract',{exact:true}).waitFor({state:'visible'});
  });
  await run('server validates signed-in identity',async()=>{
    const r=await request('/auth/v1/user',undefined,session.access_token);
    check(r.status===200 && r.body.email===email);
  });
  // Close the browser before refreshing, avoiding a race with its token refresh.
  await browser.close(); browser=undefined;
  await run('session refresh works',async()=>{
    const r=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});
    check(r.status===200 && r.body.access_token);session=r.body;
  });
  await run('audit session signs out',async()=>{
    const r=await request('/auth/v1/logout?scope=local',undefined,session.access_token,'POST');
    check(r.status===204);session=undefined;
  });
} catch {
  failed=true;
  results.push({check:step,status:'FAIL'});
  console.error(`FAIL: ${step}. Inspect privately; credentials and response bodies are intentionally omitted.`);
} finally {
  await browser?.close().catch(()=>{});
  if(session?.access_token) await request('/auth/v1/logout?scope=local',undefined,session.access_token,'POST').catch(()=>{});
  const report={timestamp:new Date().toISOString(),results,limitations:[
    'New-account creation, inbox receipt and confirmation-link consumption are not exercised; no customer emails are sent.',
    'Native iOS/Android attestation, biometric login and customer MFA need separate device acceptance tests.',
    'This is a smoke audit, not a penetration test or an approval of all authentication controls.',
  ]};
  if(process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Monthly signup and login audit\n\n${results.map(r=>`- ${r.status}: ${r.check}`).join('\n')}\n\n${report.limitations.join('\n\n')}\n`);
  if(process.env.AUTH_AUDIT_REPORT) await fs.writeFile(process.env.AUTH_AUDIT_REPORT,JSON.stringify(report,null,2));
  if(failed) process.exitCode=1;
}
