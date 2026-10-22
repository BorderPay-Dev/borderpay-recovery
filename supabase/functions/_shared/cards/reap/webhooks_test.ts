import { createSign, generateKeyPairSync } from "node:crypto";
import {
  createWebhookHandler,
  type InboxRecord,
  verifyWebhook,
  type WebhookInbox,
} from "./webhooks.ts";
const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = pair.publicKey.export({ type: "spki", format: "pem" })
  .toString();
const now = Date.now();
const body = {
  eventType: "transaction",
  eventName: "authorization",
  data: {
    id: "tid_synthetic",
    card_id: "card_synthetic",
    lifecycle_event_id: "life_synthetic",
    bill_amount: 10,
  },
};
const sign = (algorithm: string, value: string) => {
  const s = createSign(algorithm);
  s.update(value);
  s.end();
  return s.sign(pair.privateKey, "base64");
};
function cardHeaders(b: object = body, timestamp = now, trace = "trace-1") {
  return new Headers({
    "content-type": "application/json",
    "x-reap-trace-id": trace,
    "reap-signature": `timestamp=${timestamp};signature=${
      sign("RSA-SHA3-256", JSON.stringify({ ...b, timestamp }))
    }`,
  });
}
const assert = (x: unknown) => {
  if (!x) throw new Error("Assertion failed");
};
async function rejects(fn: () => unknown) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error("Expected rejection");
}
Deno.test("card signature uses SHA3 and timestamp-last JSON; body tampering rejected", async () => {
  const h = cardHeaders();
  const e = verifyWebhook("cards", JSON.stringify(body), h, now, publicKey);
  assert(e.traceId === "trace-1");
  await rejects(() =>
    verifyWebhook(
      "cards",
      JSON.stringify({ ...body, eventName: "refund" }),
      h,
      now,
      publicKey,
    )
  );
  await rejects(() =>
    verifyWebhook(
      "cards",
      JSON.stringify(body),
      cardHeaders(body, now - 300001),
      now,
      publicKey,
    )
  );
  await rejects(() =>
    verifyWebhook(
      "cards",
      JSON.stringify(body),
      cardHeaders(body, now + 60001),
      now,
      publicKey,
    )
  );
});
Deno.test("manual replay changes trace but not signed business identity", () => {
  const a = verifyWebhook(
    "cards",
    JSON.stringify(body),
    cardHeaders(body, now, "trace-1"),
    now,
    publicKey,
  );
  const b = verifyWebhook(
    "cards",
    JSON.stringify(body),
    cardHeaders(body, now + 1, "trace-2"),
    now,
    publicKey,
  );
  assert(a.businessKey === b.businessKey && a.payloadHash === b.payloadHash);
});
Deno.test("legacy trace spelling accepted; conflicting trace headers rejected", async () => {
  const h = cardHeaders();
  h.set("x-reap-traceid", "trace-1");
  h.delete("x-reap-trace-id");
  assert(
    verifyWebhook("cards", JSON.stringify(body), h, now, publicKey).traceId ===
      "trace-1",
  );
  h.set("x-reap-trace-id", "trace-2");
  await rejects(() =>
    verifyWebhook("cards", JSON.stringify(body), h, now, publicKey)
  );
});
Deno.test("compliance uses SHA512 over exact raw bytes and eventId deduplication", async () => {
  const raw =
    '{"eventType":"kyb_status_change", "data":{"eventId":"synthetic-event","status":"APPROVED"}}';
  const h = new Headers({ "reap-signature": sign("RSA-SHA512", raw) });
  assert(
    verifyWebhook("compliance", raw, h, now, publicKey).traceId ===
      "synthetic-event",
  );
  await rejects(() =>
    verifyWebhook(
      "compliance",
      JSON.stringify(JSON.parse(raw)),
      h,
      now,
      publicKey,
    )
  );
  await rejects(() => verifyWebhook("cards", raw, h, now, publicKey));
});
Deno.test("unsigned bodies, unknown shapes and missing event IDs rejected", async () => {
  await rejects(() =>
    verifyWebhook("cards", JSON.stringify(body), new Headers(), now, publicKey)
  );
  const raw = '{"eventType":"kyb_status_change","data":{}}';
  await rejects(() =>
    verifyWebhook(
      "compliance",
      raw,
      new Headers({ "reap-signature": sign("RSA-SHA512", raw) }),
      now,
      publicKey,
    )
  );
});
Deno.test("webhook acknowledges only after encrypted durable enqueue", async () => {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const records: InboxRecord[] = [];
  const inbox: WebhookInbox = {
    enqueue: (r) => {
      records.push(r);
      return Promise.resolve("inserted");
    },
  };
  const handler = createWebhookHandler(
    "cards",
    inbox,
    key,
    "synthetic-encryption-key",
    publicKey,
  );
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: cardHeaders(),
      body: JSON.stringify(body),
    }),
  );
  assert(response.status === 200 && records.length === 1);
  assert(!JSON.stringify(records).includes("bill_amount"));
  assert(!("body" in records[0]));
});
Deno.test("storage failure returns retryable error, no successful acknowledgement", async () => {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const handler = createWebhookHandler(
    "cards",
    { enqueue: () => Promise.reject(new Error("db down")) },
    key,
    "key",
    publicKey,
  );
  const r = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: cardHeaders(),
      body: JSON.stringify(body),
    }),
  );
  assert(r.status === 503);
});
Deno.test("real time authorization is not silently acknowledged as an approval", async () => {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  let calls = 0;
  const handler = createWebhookHandler(
    "cards",
    {
      enqueue: () => {
        calls++;
        return Promise.resolve("inserted");
      },
    },
    key,
    "key",
    publicKey,
  );
  const b = {
    eventType: "authorization",
    eventName: "request",
    data: { id: "synthetic" },
  };
  const r = await handler(
    new Request("https://example.com", {
      method: "POST",
      headers: cardHeaders(b),
      body: JSON.stringify(b),
    }),
  );
  assert(r.status === 503 && calls === 0);
});
