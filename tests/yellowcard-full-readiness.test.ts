import { readinessHandler } from "../supabase/functions/yellowcard-full-readiness/handler.ts";
function assert(v: unknown): asserts v { if (!v) throw new Error("Assertion failed"); }
const secret = "internal-synthetic-service-credential";
const config = { apiKeyId: "fixture-api-key", secret: "fixture-provider-secret" };
Deno.test("unauthorized callers cannot reach production provider", async () => {
  let calls = 0;
  const handler = readinessHandler(secret, config, () => { calls++; throw new Error("Unexpected fetch"); });
  for (const value of ["", "wrong", "x".repeat(secret.length)]) {
    assert((await handler(new Request("https://internal.example", { method: "POST", headers: { Authorization: "Bearer " + value } }))).status === 401);
  }
  assert(calls === 0);
});
Deno.test("production readiness uses fixed GET requests and returns no account or credential data", async () => {
  const calls: string[] = [];
  const handler = readinessHandler(secret, config, (input, init) => {
    assert(init?.method === "GET"); assert(init?.redirect === "error"); assert(!init?.body);
    const url = new URL(String(input)); assert(url.origin === "https://api.yellowcard.io"); calls.push(url.pathname);
    return Promise.resolve(Response.json({ accountNumber: "PRIVATE-ACCOUNT", balance: 999999, apiKey: "PRIVATE-KEY" }));
  });
  const res = await handler(new Request("https://internal.example", { method: "POST", headers: { Authorization: "Bearer " + secret }, body: '{"path":"/business/send","method":"POST"}' }));
  assert(res.status === 200); const text = await res.text(); assert(!text.includes("PRIVATE") && !text.includes("999999"));
  const data = JSON.parse(text); assert(!data.writes_enabled && !data.ready_for_migration && calls.length === 6);
});
Deno.test("missing production credentials cannot fall back to sandbox or enable access", async () => {
  const handler = readinessHandler(secret, { apiKeyId: "", secret: "" });
  assert((await handler(new Request("https://internal.example", { method: "POST", headers: { Authorization: "Bearer " + secret } }))).status === 503);
});
