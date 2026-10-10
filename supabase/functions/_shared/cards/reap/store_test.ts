import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import { PostgresSandboxStore, type SqlExecutor } from "./store.ts";
import { runCommand } from "./commands.ts";
import { SandboxTransport } from "./transport.ts";
const program = "00000000-0000-4000-8000-000000000001",
  tenant = "00000000-0000-4000-8000-000000000002",
  entity = "00000000-0000-4000-8000-000000000003",
  card = "00000000-0000-4000-8000-000000000004",
  op = "00000000-0000-4000-8000-000000000005";
const scope = { programId: program, tenantId: tenant };
const assert = (c: unknown) => {
  if (!c) throw new Error("Assertion failed");
};
async function rejects(fn: () => unknown) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error("Expected rejection");
}
async function setup() {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;",
  );
  const sql = await Deno.readTextFile(
    new URL("./sandbox-schema.sql", import.meta.url),
  );
  await db.exec(sql);
  await db.query(
    "insert into reap_sandbox.programmes(id,authorization_model,enabled) values($1,'standard',true)",
    [program],
  );
  await db.query(
    "insert into reap_sandbox.merchants(program_id,tenant_id,entity_id,kyb_status,issuance_enabled) values($1,$2,$3,'APPROVED',true)",
    [program, tenant, entity],
  );
  await db.query("insert into reap_sandbox.resources values($1,$2,'card',$3)", [
    program,
    tenant,
    card,
  ]);
  return {
    db,
    store: new PostgresSandboxStore(db as unknown as SqlExecutor, program),
  };
}
Deno.test("Postgres: duplicate command executes provider only once; conflicting body rejected", async () => {
  const { db, store } = await setup();
  try {
    let calls = 0;
    const client = new SandboxTransport(
      { cards: "synthetic" },
      (() => {
        calls++;
        return Promise.resolve(Response.json({ id: card }));
      }) as typeof fetch,
    );
    const input = { path: { cardId: card }, body: { adjustment: "20.00" } };
    const first = await runCommand(
      store,
      client,
      scope,
      "adjustCredit",
      input,
      op,
    );
    const replay = await runCommand(
      store,
      client,
      scope,
      "adjustCredit",
      input,
      op,
    );
    assert(
      first.state === "SUCCEEDED" && replay.state === "SUCCEEDED" &&
        calls === 1,
    );
    await rejects(() =>
      runCommand(store, client, scope, "adjustCredit", {
        ...input,
        body: { adjustment: "21.00" },
      }, op)
    );
    assert(calls === 1);
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: unknown remote result is not retried even with the same key", async () => {
  const { db, store } = await setup();
  try {
    let calls = 0;
    const client = new SandboxTransport(
      { cards: "synthetic" },
      (() => {
        calls++;
        return Promise.reject(new Error("timeout"));
      }) as typeof fetch,
    );
    const input = { path: { cardId: card }, body: { adjustment: "20.00" } };
    assert(
      (await runCommand(store, client, scope, "adjustCredit", input, op))
        .state === "UNKNOWN",
    );
    assert(
      (await runCommand(store, client, scope, "adjustCredit", input, op))
        .state === "UNKNOWN",
    );
    assert(calls === 1);
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: cross-tenant card access and disabled programmes denied", async () => {
  const { db, store } = await setup();
  try {
    const client = new SandboxTransport(
      { cards: "synthetic" },
      (() => {
        throw new Error("Must not call provider");
      }) as typeof fetch,
    );
    await rejects(() =>
      runCommand(
        store,
        client,
        { programId: program, tenantId: entity },
        "freezeCard",
        { path: { cardId: card }, body: { freeze: true } },
        op,
      )
    );
    await db.query("update reap_sandbox.programmes set enabled=false");
    await rejects(() =>
      runCommand(store, client, scope, "freezeCard", {
        path: { cardId: card },
        body: { freeze: true },
      }, op)
    );
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: inbox deduplicates manual replays and preserves immutable audit", async () => {
  const { db, store } = await setup();
  try {
    const record = {
      service: "cards" as const,
      traceId: "trace-a",
      businessKey: "b".repeat(64),
      payloadHash: "a".repeat(64),
      eventType: "transaction",
      eventName: "refund",
      keyId: "test",
      ciphertext: "encrypted",
      nonce: "nonce",
    };
    assert(await store.enqueue(record) === "inserted");
    assert(
      await store.enqueue({ ...record, traceId: "trace-b" }) === "duplicate",
    );
    await rejects(() =>
      store.enqueue({ ...record, payloadHash: "c".repeat(64) })
    );
    await rejects(() => db.query("delete from reap_sandbox.audit_events"));
    await rejects(() =>
      db.query("update reap_sandbox.webhook_inbox set ciphertext='changed'")
    );
    const audit = await db.query<{ n: number }>(
      "select count(*)::int as n from reap_sandbox.audit_events",
    );
    assert(audit.rows[0].n === 1);
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: browser roles cannot read sandbox records", async () => {
  const { db } = await setup();
  try {
    await db.exec("set role authenticated");
    await rejects(() => db.query("select * from reap_sandbox.merchants"));
    await db.exec("reset role");
    await db.exec("set role anon");
    await rejects(() => db.query("select * from reap_sandbox.commands"));
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: concurrent reservations allow a single provider attempt", async () => {
  const { db, store } = await setup();
  try {
    const attempts = await Promise.allSettled([
      store.reserve(scope, op, "freezeCard", "a".repeat(64)),
      store.reserve(scope, op, "freezeCard", "a".repeat(64)),
    ]);
    assert(
      attempts.filter((r) => r.status === "fulfilled" && r.value.fresh)
        .length === 1,
    );
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: successful card creation binds the provider card atomically", async () => {
  const { db, store } = await setup();
  try {
    await store.reserve(scope, op, "createCard", "a".repeat(64));
    await store.finish(scope, op, { state: "SUCCEEDED", providerId: entity });
    const bound = await db.query<{ tenant_id: string }>(
      "select tenant_id from reap_sandbox.resources where kind='card' and resource_id=$1",
      [entity],
    );
    assert(bound.rows[0].tenant_id === tenant);
  } finally {
    await db.close();
  }
});
Deno.test("Postgres: restricted service role can persist receipts but cannot rewrite audit", async () => {
  const { db, store } = await setup();
  try {
    await db.exec("set role service_role");
    await store.reserve(scope, op, "freezeCard", "a".repeat(64));
    await store.finish(scope, op, { state: "SUCCEEDED", providerId: card });
    await rejects(() =>
      db.query("update reap_sandbox.audit_events set event_kind='changed'")
    );
    await db.exec("reset role");
  } finally {
    await db.close();
  }
});
