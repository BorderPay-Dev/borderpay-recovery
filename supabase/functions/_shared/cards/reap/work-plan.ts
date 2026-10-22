import type { VerifiedEvent } from "./webhooks.ts";
export type WebhookWork =
  | { kind: "refresh_card"; cardId: string }
  | { kind: "refresh_transaction"; cardId: string; transactionId: string }
  | { kind: "refresh_kyb"; entityId: string }
  | { kind: "operator_review"; reason: string };
/** Webhooks trigger a current API read, never a blind balance/status overwrite.
 * Execute using stored tenant/resource bindings; unknown references go to review.
 * File download URLs are not fetched automatically (SSRF / expiry risk). */
export function planWebhookWork(event: VerifiedEvent): WebhookWork {
  const d = event.body.data as Record<string, unknown>;
  if (event.service === "compliance" && typeof d.entityId === "string") {
    return { kind: "refresh_kyb", entityId: d.entityId };
  }
  if (
    event.service === "cards" && event.eventType === "card" &&
    typeof d.id === "string"
  ) return { kind: "refresh_card", cardId: d.id };
  if (
    event.service === "cards" && event.eventType === "transaction" &&
    typeof d.card_id === "string" && typeof d.id === "string"
  ) {
    return {
      kind: "refresh_transaction",
      cardId: d.card_id,
      transactionId: d.id,
    };
  }
  return {
    kind: "operator_review",
    reason: `${event.service}:${event.eventType}:${event.eventName}`,
  };
}
