import { requestPasswordReset } from '../utils/auth/passwordResetRequest.ts';
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
Deno.test('accepted reset uses normalized email and does not need account-existence details', async () => {
  await requestPasswordReset('https://example.invalid/reset', 'public', ' Person@Example.Invalid ', async (_url, init) => {
    assert(JSON.parse(String(init?.body)).email === 'person@example.invalid', 'normalized email');
    assert(init?.signal, 'bounded request');
    return Response.json({ success: true });
  });
});
for (const [name, status, body] of [
  ['service unavailable', 503, {success:false}],
  ['rate limited', 429, {success:false}],
  ['application failure', 200, {success:false}],
  ['missing success flag', 200, {}],
] as const) {
  Deno.test(`reset does not report success: ${name}`, async () => {
    let rejected = false;
    try { await requestPasswordReset('https://example.invalid/reset', 'public', 'person@example.invalid', async () => Response.json(body, {status})); }
    catch { rejected = true; }
    assert(rejected, 'failure must propagate to retry UI');
  });
}
Deno.test('HTML response is not reported as email sent', async () => {
  let rejected = false;
  try { await requestPasswordReset('https://example.invalid/reset', 'public', 'person@example.invalid', async () => new Response('<html>outage</html>')); }
  catch { rejected = true; }
  assert(rejected, 'invalid response rejected');
});
Deno.test('stalled reset request times out so the form can be retried', async () => {
  let aborted = false;
  const fetcher: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, {once:true});
  });
  try { await requestPasswordReset('https://example.invalid/reset', 'public', 'person@example.invalid', fetcher, 5); } catch { /* expected */ }
  assert(aborted, 'request aborted');
});
