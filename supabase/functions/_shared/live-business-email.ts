import { evaluateBusinessEmail } from './business-email-policy.ts';

type Decision = { allowed: true } | { allowed: false; status: number; code: string; error: string };
type Dependencies = { getApiKey: () => Promise<string | null>; request?: typeof fetch };
const unavailable = (): Decision => ({ allowed: false, status: 503, code: 'email_validation_unavailable', error: 'We cannot verify your business email right now. Please try again shortly.' });
const rejected = (): Decision => ({ allowed: false, status: 400, code: 'business_email_required', error: 'Use your company email address or inbox.eu. Free email services, disposable addresses and email aliases are not accepted.' });

// Always retain deterministic checks, including alias rules, before the exception.
// Call only after CAPTCHA/App Check, durable rate limits and tenant authorization.
export async function validateLiveBusinessEmail(value: string, deps: Dependencies): Promise<Decision> {
  const email = value.trim().toLowerCase();
  const local = evaluateBusinessEmail(email);
  if (!local.allowed) return rejected();
  if (local.domain === 'inbox.eu') return { allowed: true };
  try {
    const key = (await deps.getApiKey())?.trim();
    if (!key) return unavailable();
    // Fixed HTTPS host; never accept a client-supplied validator URL.
    const url = new URL('https://api.kickbox.com/v2/verify');
    url.searchParams.set('email', email);
    url.searchParams.set('apikey', key);
    url.searchParams.set('timeout', '6000');
    const response = await (deps.request ?? fetch)(url, {
      method: 'GET', signal: AbortSignal.timeout(8000), redirect: 'error',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return unavailable();
    const data = await response.json();
    // A malformed response, wrong mailbox or absent flags must never allow signup.
    if (!data || data.success !== true || typeof data.email !== 'string' ||
        data.email.trim().toLowerCase() !== email || data.domain?.toLowerCase() !== local.domain ||
        typeof data.free !== 'boolean' || typeof data.disposable !== 'boolean' ||
        typeof data.accept_all !== 'boolean' ||
        !['deliverable', 'undeliverable', 'risky', 'unknown'].includes(data.result)) return unavailable();
    if (data.free || data.disposable) return rejected();
    if (data.result === 'unknown') return unavailable();
    if (data.result !== 'deliverable' || data.accept_all) return {
      allowed: false, status: 400, code: 'business_email_unverified',
      error: 'We could not confirm this business mailbox. Check the address or use another company mailbox or inbox.eu, then try again.',
    };
    // Role mailboxes such as accounts@ or compliance@ are valid B2B addresses.
    return { allowed: true };
  } catch {
    // Never log exceptions: provider URLs contain both the API key and email.
    return unavailable();
  }
}
