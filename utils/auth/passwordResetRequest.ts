/** A reset request must be accepted before the UI tells the user to check email. */
export async function requestPasswordReset(
  endpoint: string,
  anonKey: string,
  email: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success !== true) throw new Error('reset_request_not_accepted');
  } finally {
    clearTimeout(timer);
  }
}
