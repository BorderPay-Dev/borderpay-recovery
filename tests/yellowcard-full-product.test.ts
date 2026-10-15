import { YellowCardFullProductClient, YellowCardRequestError, yellowCardSignature, verifyYellowCardSignature, requireYellowCardBinding, yellowCardEventFingerprint, normalizeYellowCardVirtualAccountStatus } from "../supabase/functions/_shared/providers/yellowcard-full-product.ts";
function assert(value: unknown, message = "Assertion failed"): asserts value { if (!value) throw new Error(message); }
async function rejects(fn: () => unknown | Promise<unknown>) { try { await fn(); } catch { return; } throw new Error("Expected rejection"); }
const config = { environment: "sandbox" as const, apiKeyId: "fixture-key", secret: "fixture-secret" };
Deno.test("signature matches independent HMAC fixture", async () => {
  assert(await yellowCardSignature(config.secret, "2026-10-03T10:00:00.000Z", "/business/vaults", "POST", '{"name":"Synthetic merchant"}') === "BbsJf92LhEV2gOayCEgeirEiScS1YP+DFYw6b1HuFMo=");
});
Deno.test("production relay preserves GET semantics and signs the full upstream path", async () => {
  const c = new YellowCardFullProductClient({ ...config, environment: "production", relay: { url: "https://relay.example/proxy", token: "fixture-relay-secret" } }, async (input, init) => {
    assert(String(input) === "https://relay.example/proxy" && init?.method === "POST" && init.redirect === "error");
    const body = JSON.parse(String(init.body)); assert(body.method === "GET" && body.path === "/virtual-accounts" && !body.body);
    const headers = new Headers(init.headers); assert(headers.get("Authorization") === "Bearer fixture-relay-secret");
    const signature = await yellowCardSignature(config.secret, headers.get("X-BorderPay-YC-Timestamp")!, "/business/virtual-accounts", "GET");
    assert(headers.get("X-BorderPay-YC-Authorization") === `YcHmacV1 fixture-key:${signature}`);
    return new Response("{}");
  });
  await c.virtualAccounts();
});
Deno.test("webhook verifies original bytes and rejects altered bytes or bad signatures", async () => {
  const sig = "e+tQifyS/xeR+GvyjSu8ETrfOEKGqadZl0aRO3WLVtM=";
  assert(await verifyYellowCardSignature(new TextEncoder().encode('{"event":"VIBAN.ACTIVE"}'), sig, config.secret));
  assert(!await verifyYellowCardSignature(new TextEncoder().encode('{ "event":"VIBAN.ACTIVE"}'), sig, config.secret));
  assert(!await verifyYellowCardSignature(new Uint8Array(), "not-base64", config.secret));
});
Deno.test("production credentials never permit mutations", async () => {
  let called = false;
  const client = new YellowCardFullProductClient({ ...config, environment: "production", sandboxWrites: true }, () => { called = true; throw new Error("Network must not be reached"); });
  await rejects(() => client.createSandboxVault("Synthetic merchant"));
  await rejects(() => client.createSandboxSubWallet({ name: "Synthetic", currency: "EUR", sequenceId: "fixture-1", createVirtualAccount: true }));
  assert(!called);
});
Deno.test("sandbox mutation also needs explicit enablement", async () => {
  let called = false;
  const c = new YellowCardFullProductClient(config, () => { called = true; return Promise.resolve(new Response("{}")); });
  await rejects(() => c.createSandboxVault("Synthetic merchant")); assert(!called);
});
Deno.test("reference paths, isolated sandbox host, redirect refusal and query signing", async () => {
  const c = new YellowCardFullProductClient(config, async (input, init) => {
    const u = new URL(String(input)); const headers = new Headers(init?.headers);
    assert(u.origin === "https://sandbox.api.yellowcard.io"); assert(u.pathname === "/business/virtual-accounts");
    assert(u.searchParams.get("cursor") === "https://untrusted.example/?a=1"); assert(init?.redirect === "error");
    const signature = await yellowCardSignature(config.secret, headers.get("X-YC-Timestamp")!, u.pathname, "GET");
    assert(headers.get("Authorization") === `YcHmacV1 fixture-key:${signature}`);
    return new Response('{"virtualAccounts":[]}');
  });
  await c.virtualAccounts({ cursor: "https://untrusted.example/?a=1" });
  await rejects(() => c.virtualAccount("../vaults")); await rejects(() => c.vault("https://untrusted.example"));
});
Deno.test("ambiguous create is surfaced for reconciliation without automatic retry", async () => {
  let calls = 0;
  const c = new YellowCardFullProductClient({ ...config, sandboxWrites: true }, () => { calls++; throw new Error("network failed"); });
  try { await c.createSandboxVault("Synthetic merchant"); throw new Error("Expected failure"); }
  catch (e) { assert(e instanceof YellowCardRequestError && e.outcomeUnknown); }
  assert(calls === 1);
});
Deno.test("provider rejection never exposes raw provider or customer data", async () => {
  const c = new YellowCardFullProductClient(config, () => Promise.resolve(new Response('{"secret":"sensitive"}', { status: 403 })));
  try { await c.vaults(); throw new Error("Expected failure"); }
  catch (e) { assert(e instanceof YellowCardRequestError && e.status === 403 && !e.message.includes("sensitive")); }
});
Deno.test("EUR/GBP sandbox requests reach provider instead of stale enum denial", async () => {
  const currencies: string[] = [];
  const c = new YellowCardFullProductClient({ ...config, sandboxWrites: true }, (_input, init) => { currencies.push(JSON.parse(String(init?.body)).currency); return Promise.resolve(new Response("{}")); });
  for (const currency of ["USD", "EUR", "GBP"]) await c.createSandboxSubWallet({ name: "Synthetic merchant", sequenceId: "fixture-" + currency, currency, createVirtualAccount: true });
  assert(currencies.join() === "USD,EUR,GBP");
});
Deno.test("bindings cannot cross environment, merchant or resource kind", async () => {
  const binding = { environment: "sandbox" as const, merchantId: "merchant-a", resourceId: "vault-a", kind: "vault" as const };
  assert(requireYellowCardBinding(binding, binding) === binding);
  await rejects(() => requireYellowCardBinding(binding, { ...binding, merchantId: "merchant-b" }));
  await rejects(() => requireYellowCardBinding(binding, { ...binding, environment: "production" }));
  await rejects(() => requireYellowCardBinding(binding, { ...binding, kind: "sub_wallet" }));
  await rejects(() => requireYellowCardBinding(null, binding));
});
Deno.test("reused account ID does not suppress subsequent transition; statuses fail closed", async () => {
  const raw = new TextEncoder().encode('{"id":"account-a","event":"VIBAN.PENDING"}');
  const changed = new TextEncoder().encode('{"id":"account-a","event":"VIBAN.ACTIVE"}');
  const first = await yellowCardEventFingerprint("sandbox", raw);
  assert(first === await yellowCardEventFingerprint("sandbox", raw));
  assert(first !== await yellowCardEventFingerprint("sandbox", changed));
  assert(first !== await yellowCardEventFingerprint("production", raw));
  assert(normalizeYellowCardVirtualAccountStatus("PENDING") === "pending");
  assert(normalizeYellowCardVirtualAccountStatus("FROZEN") === "frozen");
  assert(normalizeYellowCardVirtualAccountStatus("unexpected") === "unknown");
});
