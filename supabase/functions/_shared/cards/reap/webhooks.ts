import { createHash, createVerify } from "node:crypto";
import keys from "./sandbox-public-keys.json" with { type: "json" };
import type { Service } from "./contracts.ts";
export class WebhookError extends Error {}
export interface VerifiedEvent {
  service: Service;
  traceId: string;
  businessKey: string;
  payloadHash: string;
  eventType: string;
  eventName: string;
  body: Record<string, unknown>;
}
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function base64(s: string): boolean {
  return s.length >= 64 && s.length <= 1500 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(s) && s.length % 4 === 0;
}
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export function verifyWebhook(
  service: Service,
  raw: string,
  headers: Headers,
  now = Date.now(),
  publicKey = keys[service],
): VerifiedEvent {
  if (
    !Object.hasOwn(keys, service) ||
    new TextEncoder().encode(raw).length > 1024 * 1024
  ) throw new WebhookError("invalid_envelope");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WebhookError("invalid_json");
  }
  if (
    !object(parsed) || !object(parsed.data) ||
    typeof parsed.eventType !== "string"
  ) throw new WebhookError("invalid_envelope");
  const signatureHeader = headers.get("reap-signature") ?? "";
  let signature: string;
  let signed: string;
  let algorithm: string;
  let traceId: string;
  if (service === "cards") {
    const match = /^timestamp=(\d{13});signature=([A-Za-z0-9+/=]+)$/.exec(
      signatureHeader,
    );
    if (!match || Object.hasOwn(parsed, "timestamp")) {
      throw new WebhookError("invalid_signature_header");
    }
    const timestamp = Number(match[1]);
    // Provider specifies 5 minute past tolerance. 60s future skew is BorderPay policy.
    if (now - timestamp > 300000 || timestamp - now > 60000) {
      throw new WebhookError("expired_signature");
    }
    signature = match[2];
    signed = JSON.stringify({ ...parsed, timestamp });
    algorithm = "RSA-SHA3-256";
    const current = headers.get("x-reap-trace-id");
    const legacy = headers.get("x-reap-traceid");
    if (current && legacy && current !== legacy) {
      throw new WebhookError("conflicting_trace_headers");
    }
    traceId = current ?? legacy ?? "";
    if (typeof parsed.eventName !== "string") {
      throw new WebhookError("invalid_event_name");
    }
    for (
      const [header, key] of [["x-reap-event-name", "eventName"], [
        "x-reap-event-type",
        "eventType",
      ]]
    ) {
      const supplied = headers.get(header);
      if (supplied && supplied !== parsed[key]) {
        throw new WebhookError("event_header_mismatch");
      }
    }
  } else {
    signature = signatureHeader;
    signed = raw;
    algorithm = "RSA-SHA512";
    traceId = typeof parsed.data.eventId === "string"
      ? parsed.data.eventId
      : "";
  }
  if (!/^[A-Za-z0-9_.:-]{1,200}$/.test(traceId) || !base64(signature)) {
    throw new WebhookError("invalid_delivery_identity");
  }
  try {
    const verifier = createVerify(algorithm);
    verifier.update(signed);
    verifier.end();
    if (!verifier.verify(publicKey, signature, "base64")) throw new Error();
  } catch {
    throw new WebhookError("signature_verification_failed");
  }
  const eventType = parsed.eventType as string,
    eventName = typeof parsed.eventName === "string" ? parsed.eventName : "";
  const d = parsed.data;
  const payloadHash = hash(JSON.stringify(parsed));
  // Trace headers are not signed. A signed business identity also prevents manual
  // replay with a new trace ID. Unknown events use a payload digest and cause no posting.
  let identity: string;
  if (service === "compliance") identity = `compliance:${traceId}`;
  else if (
    eventType === "transaction" && typeof d.id === "string" &&
    typeof d.lifecycle_event_id === "string" && typeof d.card_id === "string"
  ) {
    identity = JSON.stringify([
      eventType,
      eventName,
      d.card_id,
      d.id,
      d.lifecycle_event_id,
    ]);
  } else identity = JSON.stringify([eventType, eventName, payloadHash]);
  return {
    service,
    traceId,
    businessKey: hash(identity),
    payloadHash,
    eventType,
    eventName,
    body: parsed,
  };
}
export interface InboxRecord extends Omit<VerifiedEvent, "body"> {
  keyId: string;
  ciphertext: string;
  nonce: string;
}
export interface WebhookInbox {
  // Atomic insert and dedupe by both service+trace and service+businessKey.
  // A same-key/different-hash conflict must raise, never overwrite the first event.
  enqueue(record: InboxRecord): Promise<"inserted" | "duplicate">;
}
function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function createWebhookHandler(
  service: Service,
  inbox: WebhookInbox,
  encryptionKey: CryptoKey,
  keyId: string,
  publicKey = keys[service],
) {
  if (!keyId || encryptionKey.algorithm.name !== "AES-GCM") {
    throw new Error("Configured evidence encryption is required.");
  }
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (
      !req.headers.get("content-type")?.toLowerCase().startsWith(
        "application/json",
      )
    ) return new Response("JSON required", { status: 415 });
    let event: VerifiedEvent;
    try {
      const reader = req.body?.getReader();
      if (!reader) throw new WebhookError("empty_body");
      let size = 0;
      const parts: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024 * 1024) {
          await reader.cancel();
          return new Response("Too large", { status: 413 });
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const p of parts) {
        bytes.set(p, offset);
        offset += p.length;
      }
      event = verifyWebhook(
        service,
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        req.headers,
        Date.now(),
        publicKey,
      );
    } catch {
      return new Response("Invalid webhook", { status: 401 });
    }
    if (event.eventType === "authorization") {
      return new Response("Real-time authorization is not enabled", {
        status: 503,
      });
    }
    try {
      const { body, ...metadata } = event;
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      const aad = new TextEncoder().encode(
        `${service}:${event.businessKey}:${keyId}`,
      );
      const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, additionalData: aad },
        encryptionKey,
        new TextEncoder().encode(JSON.stringify(body)),
      );
      await inbox.enqueue({
        ...metadata,
        keyId,
        ciphertext: b64(new Uint8Array(encrypted)),
        nonce: b64(nonce),
      });
      return new Response("OK", { status: 200 });
    } catch {
      return new Response("Retry delivery", { status: 503 });
    }
  };
}
