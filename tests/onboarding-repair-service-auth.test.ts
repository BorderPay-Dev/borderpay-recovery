import { authorizeRepairService } from "../supabase/functions/bridge-missing-customer-migration/service-auth.ts";
const assert = (v: unknown) => { if (!v) throw new Error("assertion failed"); };
const jwt = (role: string) => `e30.${btoa(JSON.stringify({role}))}.signature`;
Deno.test("repair auth requires an actual service credential, not decoded claims", async () => {
  let calls=0;
  const check = (status: number, body: unknown) => (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls++; assert(String(url)==="https://project.supabase.co/auth/v1/admin/users?page=1&per_page=1");
    assert(new Headers(init?.headers).get("apikey")===jwt("service_role"));
    return new Response(JSON.stringify(body), {status});
  }) as typeof fetch;
  assert(await authorizeRepairService("runtime", "runtime", "https://project.supabase.co", check(401, {})));
  assert(!await authorizeRepairService(jwt("authenticated"), "runtime", "https://project.supabase.co", check(200, {users:[]})));
  assert(calls===0);
  assert(!await authorizeRepairService(jwt("service_role"), "runtime", "https://project.supabase.co", check(401, {})));
  assert(!await authorizeRepairService(jwt("service_role"), "runtime", "https://project.supabase.co", check(403, {})));
  assert(!await authorizeRepairService(jwt("service_role"), "runtime", "https://project.supabase.co", check(200, {})));
  assert(await authorizeRepairService(jwt("service_role"), "runtime", "https://project.supabase.co", check(200, {users:[]})));
  assert(!await authorizeRepairService(jwt("service_role"), "runtime", "https://project.supabase.co", (async()=>{throw new Error("outage")}) as typeof fetch));
});
