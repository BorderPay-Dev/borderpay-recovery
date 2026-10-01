import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/admin-email-ops/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;

async function invoke({ types = ['business'], states = ['active'], campaign = 'banking_transition_active', dryRun = true, localStates = [], action = 'send_campaign', used = 0, quotaOk = true, bearer = 'fixture-admin', demo = false, partner = false, localUsed = 0, localQuotaError = false }) {
  let handler;
  const sent = [];
  const profiles = states.map((state, index) => ({
    id: 'fixture-' + index, email: 'fixture-' + index + '@example.invalid',
    full_name: 'Fixture', account_type: types[index] || types[0],
    is_admin: false, is_demo: demo, bridge_customer_id: 'customer-' + index,
    bridge_kyc_status: state === 'rejected' ? 'rejected' : 'approved',
    bridge_account_status: state, account_status: localStates[index] || (state === 'frozen' ? 'frozen' : 'active'),
  }));
  const businessRows = profiles.filter(p => p.account_type === 'business').map(p => ({
    user_id: p.id, company_name: 'Fixture Ltd', bridge_customer_id: p.bridge_customer_id,
    bridge_kyb_status: p.bridge_account_status === 'not_started' ? 'not_started' : p.bridge_account_status === 'rejected' ? 'rejected' : 'approved',
  }));
  const client = {
    auth: { getUser: async () => ({data:{user:null},error:new Error("unauthorized")}) },
    from(table) {
      assert.ok(['user_profiles', 'business_profiles', 'email_log'].includes(table));
      const q = {
        select() { return q; },
        or() { return q; }, not() { return q; }, order() { return q; }, limit() { return q; }, eq() { return q; },
        then(resolve) { return Promise.resolve(table === 'email_log' ? {count:localUsed,error:localQuotaError?new Error('unavailable'):null} : { data: table === 'user_profiles' ? profiles : businessRows, error: null }).then(resolve); },
        in(_column, ids) {
          const rows = table === 'user_profiles' ? profiles : businessRows;
          return Promise.resolve({ data: rows.filter(p => ids.includes(p.id || p.user_id)), error: null });
        },
      };
      return q;
    },
  };
  const context = vm.createContext({
    Deno: {
      env: { get: name => name === 'ADMIN_BROADCAST_INTERNAL_TOKEN' ? 'fixture-admin' : name === 'SEND_EMAIL_INTERNAL_TOKEN' ? 'fixture-mail' : 'https://example.invalid' },
      serve: callback => { handler = callback; },
    },
    Request, Response, Headers, console, setTimeout, AbortSignal,
    fetch: async (url, options) => {
      if (url === 'https://api.brevo.com/v3/account') return Response.json({plan:[{type:'free',credits:300,creditsType:'sendLimit'}]}, {status:quotaOk?200:503});
      if (url.startsWith('https://api.brevo.com/v3/smtp/statistics/aggregatedReport')) return Response.json({requests:used});
      assert.equal(url, 'https://example.invalid/functions/v1/send-email');
      sent.push(JSON.parse(options.body));
      return Response.json({ success: true, data:{status:"sent"} });
    },
  });
  const module = new vm.SourceTextModule(compiled, { context });
  const audienceSource = await readFile(new URL('../supabase/functions/admin-email-ops/migration-audience.ts', import.meta.url), 'utf8');
  const audience = new vm.SourceTextModule(ts.transpileModule(audienceSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText,{context});
  await audience.link(()=>{throw new Error('Unexpected import')});
  await module.link(specifier => {
    if (specifier === './migration-audience.ts') return audience;
    if (specifier === '../_shared/partner-customer-policy.ts') return new vm.SyntheticModule(['partnerMemberships'], function(){this.setExport('partnerMemberships',async()=>partner ? new Map([['fixture-0',{}]]) : new Map());},{context});
    const names = specifier.includes('supabase-js') ? ['createClient'] : [];
    return new vm.SyntheticModule(names, function () {
      if (names.length) this.setExport('createClient', () => client);
    }, { context });
  });
  await module.evaluate();
  const response = await handler(new Request('https://example.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, campaign, user_ids: profiles.map(p => p.id), account_type: 'all', dry_run: dryRun, props: { transition_status: 'active' } }),
  }));
  return { status: response.status, body: await response.json(), sent };
}


test('active campaign lists only active verified businesses and sends active template', async () => {
  const list = await invoke({ states: ['active', 'frozen', 'rejected', 'not_started'], action: 'list_recipients' });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.recipients.length, 1);
  assert.equal(list.body.data.recipients[0].transition_status, 'active');
  const sent = await invoke({ dryRun: false });
  assert.equal(sent.status, 200);
  assert.equal(sent.sent[0].template, 'business.banking_transition_active');
});
test('restricted campaign lists all restricted statuses without blocking the notice', async () => {
  const result = await invoke({ states: ['active', 'rejected', 'paused', 'frozen', 'suspended', 'offboarded', 'not_started'], campaign: 'banking_transition_restricted', action: 'list_recipients' });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.recipients.length, 5);
  assert.ok(result.body.data.recipients.every(p => p.can_receive_broadcast));
});
test('restricted send assigns status from stored account data, ignoring supplied props', async () => {
  const result = await invoke({ states: ['rejected', 'paused', 'frozen'], campaign: 'banking_transition_restricted', dryRun: false });
  assert.equal(result.status, 200);
  assert.deepEqual(result.sent.map(p => p.props.transition_status), ['rejected', 'paused', 'frozen']);
  assert.ok(result.sent.every(p => p.template === 'business.banking_transition_restricted'));
});
test('local freeze overrides provider approval for both listing and send', async () => {
  const input = { states: ['active'], localStates: ['frozen'], dryRun: false };
  assert.equal((await invoke(input)).status, 409);
  const restricted = await invoke({ ...input, campaign: 'banking_transition_restricted' });
  assert.equal(restricted.status, 200);
  assert.equal(restricted.sent[0].props.transition_status, 'frozen');
});
test('wrong cohort, mixed audience and pending businesses cannot be sent either notice', async () => {
  for (const input of [
    { states: ['active', 'paused'] },
    { states: ['active'], campaign: 'banking_transition_restricted' },
    { states: ['not_started'] },
    { states: ['not_started'], campaign: 'banking_transition_restricted' },
    { types: ['individual'] },
    { types: ['individual'], states: ['rejected'], campaign: 'banking_transition_restricted' },
  ]) {
    const result = await invoke({ ...input, dryRun: false });
    assert.equal(result.status, 409);
    assert.deepEqual(result.sent, []);
  }
});
test('dry run never dispatches email', async () => {
  const result = await invoke({ states: ['rejected', 'paused'], campaign: 'banking_transition_restricted' });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.selected_recipients, 2);
  assert.deepEqual(result.sent, []);
});
test('legacy combined campaign is unavailable', async () => {
  const result = await invoke({ campaign: 'banking_transition', dryRun: false });
  assert.equal(result.status, 400);
  assert.deepEqual(result.sent, []);
});
test('other campaigns retain their restrictions', async () => {
  for (const state of ['paused', 'frozen', 'rejected', 'offboarded']) {
    const result = await invoke({ states: [state], campaign: 'founder_welcome', dryRun: false });
    assert.equal(result.status, 409);
    assert.deepEqual(result.sent, []);
  }
});

test('migration service notice lists and accepts every business status', async()=>{
 const states=['active','paused','frozen','rejected','incomplete','awaiting_ubo','needs_ubos','not_started','under_review','offboarded'];
 const result=await invoke({states,campaign:'business_migration_notice',action:'list_recipients'});
 assert.equal(result.status,200);assert.equal(result.body.data.recipients.length,states.length);
 const dry=await invoke({states,campaign:'business_migration_notice'});assert.equal(dry.status,200);assert.equal(dry.sent.length,0);
});
test('migration excludes consumers and demo accounts',async()=>{
 for(const args of [{types:['individual']},{demo:true}]) {
  const result=await invoke({...args,campaign:'business_migration_notice',dryRun:false});assert.equal(result.status,409);assert.equal(result.sent.length,0);
 }
});
test('migration sends at most 30 and uses stable per-recipient deduplication keys',async()=>{
 const over=await invoke({states:Array(31).fill('paused'),campaign:'business_migration_notice',dryRun:false});assert.equal(over.status,400);assert.equal(over.sent.length,0);
 const ok=await invoke({states:Array(30).fill('paused'),campaign:'business_migration_notice',dryRun:false});assert.equal(ok.status,200);assert.equal(ok.sent.length,30);
 assert.equal(new Set(ok.sent.map(x=>x.idempotency_key)).size,30);assert.ok(ok.sent.every(x=>x.idempotency_key.includes('20260928:v1')));
});
test('migration stops when Brevo quota is low or unavailable',async()=>{
 const low=await invoke({used:275,states:Array(30).fill('paused'),campaign:'business_migration_notice',dryRun:false});assert.equal(low.status,429);assert.equal(low.sent.length,0);
 const down=await invoke({quotaOk:false,campaign:'business_migration_notice',dryRun:false});assert.equal(down.status,503);assert.equal(down.sent.length,0);
});
test('service credential is scoped to migration operations only',async()=>{
 const allowed=await invoke({bearer:'https://example.invalid',campaign:'business_migration_notice'});assert.equal(allowed.status,200);
 const denied=await invoke({bearer:'https://example.invalid',campaign:'founder_welcome',dryRun:false});assert.equal(denied.status,401);assert.equal(denied.sent.length,0);
});

test('activity notice accepts every business status but excludes individual, demo and partner recipients',async()=>{
 const states=['active','paused','frozen','rejected','incomplete','not_started','awaiting_ubo'];
 assert.equal((await invoke({campaign:'business_activity_update',states})).body.data.selected_recipients,states.length);
 for(const input of [{types:['individual']},{demo:true},{partner:true}]) assert.equal((await invoke({campaign:'business_activity_update',...input})).status,409);
});
test('activity notice has deterministic deduplication, batch limit and quota failure protection',async()=>{
 const result=await invoke({campaign:'business_activity_update',dryRun:false,bearer:'https://example.invalid'});
 assert.equal(result.status,200);
 assert.equal(result.sent[0].template,'business.business_activity_update');
 assert.equal(result.sent[0].idempotency_key,'admin_email_ops:business_activity_update:20261001:v1:fixture-0');
 for(const input of [{states:Array(31).fill('active')},{used:280},{quotaOk:false}]){
  const denied=await invoke({campaign:'business_activity_update',dryRun:false,...input});assert.ok(denied.status>=400);assert.equal(denied.sent.length,0);
 }
});

test('stale provider statistics cannot bypass locally recorded daily usage',async()=>{
 for(const input of [{localUsed:280},{localQuotaError:true}]){
  const result=await invoke({campaign:'business_activity_update',dryRun:false,used:0,...input});
  assert.ok(result.status>=400);assert.equal(result.sent.length,0);
 }
 const remaining=await invoke({campaign:'business_activity_update',states:Array(2).fill('active'),dryRun:false,used:0,localUsed:279});
 assert.equal(remaining.status,429);assert.equal(remaining.sent.length,0);
});
