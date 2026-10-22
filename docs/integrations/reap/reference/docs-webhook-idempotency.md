---
updatedAt: 2026-06-24T11:45:43.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Webhook Idempotency

Webhook idempotency is the practice of processing each event exactly once even when Reap redelivers the same webhook.

**Purpose:** Explains how Reap delivers and retries outbound webhooks, and how clients can safely detect and ignore duplicate deliveries using the `x-reap-trace-id` header.

***

# Overview

Reap sends outbound webhooks to notify a client's system of events (transactions, card status changes, files, fraud, disputes, stop-payment, rewards, and more). Reap retries any webhook that is not acknowledged with a `2xx` response to guarantee delivery. As a result, the same event can reach an endpoint more than once, so the endpoint must be able to recognise and safely ignore duplicates.

This page covers:

* Why duplicate webhook deliveries occur
* How to identify a unique delivery using `x-reap-trace-id`
* The recommended pattern for de-duplicating (idempotent) webhook handling

<br />

**Scope:** This guidance applies to Reap's **asynchronous (queued)** webhooks that are retried. The **real-time external authorization request** webhook (`eventType: authorization`, `eventName: request`) is delivered synchronously and is *not* retried through the queue so retry-based duplicates do not occur.

***

# Delivery Modes

| Mode                            | Example events                                                           | Delivery                         | Retried?                                                        | Duplicate risk                             |
| ------------------------------- | ------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Asynchronous (queued)           | transactions, card status, files, fraud, disputes, stop-payment, rewards | Queued, delivered asynchronously | Yes, up to approximately 20 attempts spread across several days | Same event can be delivered more than once |
| Real-time authorization request | `eventType: authorization`, `eventName: request`                         | Synchronous request/response     | No (not via the retry queue)                                    | No retry-based duplicates                  |

***

# Why Duplicate Webhooks Occur

Reap treats a delivery as successful only when the receiving endpoint returns a `2xx` response. A retry is triggered whenever that does not happen, including when:

* The `2xx` acknowledgement is lost or never reaches Reap
* The endpoint returns any non-`2xx` status
* The request times out
* The connection is dropped.

<br />

A common duplicate scenario:

1. Reap delivers a webhook
2. The receiving system processes it successfully
3. The success response is lost or not received by Reap (or the request times out / drops)
4. Reap retries the same webhook
5. The endpoint receives the same event again and should detect and ignore it. Because the event was already processed in step 2 the handler must use the trace ID to identify the redelivery in step 5 as a duplicate and avoid processing it twice

***

# Event Ordering

Reap does not guarantee the order in which webhooks are delivered. The same event stream can arrive in a different order from the order in which the events occurred, so an endpoint must not rely on delivery order to reconstruct what happened.

Ordering is not guaranteed because:

* The delivery queue is **priority-weighted rather than FIFO** so webhooks are not dispatched in the same order they were created
* **Failed deliveries are retried using a backoff strategy** so a retried event may be delivered after events that occurred later
* Each batch of webhooks is **dispatched concurrently** so deliveries can overlap and complete in a different order

Use data in the payload such as the `created_at` timestamp to determine event order rather than delivery order, and ensure the handler can correctly process events that arrive out of sequence.

***

# Identifying a Webhook: `x-reap-trace-id`

Every webhook includes an `x-reap-trace-id` header that uniquely identifies the delivery. Use this value as the key for duplicate detection.

* `x-reap-trace-id` is present on **every** webhook
* The **same** trace ID is reused on every attempt for automatic retries of the same webhook
* Two different webhook events will **never** share the same trace ID
* It is the recommended identifier for deduplication and no separate event ID is required

<br />

## Webhook Headers

| Header              | Description                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `x-reap-trace-id`   | Unique ID for the delivery; identical across automatic retries. Use this for de-duplication |
| `x-reap-event-name` | The event name (e.g. `created`)                                                             |
| `x-reap-event-type` | The event type (e.g. `transaction`)                                                         |
| `Reap-Signature`    | Verify the signature before processing to confirm authenticity                              |

<br />

## Verifying the `Reap-Signature`

Every webhook is signed so the receiving endpoint can confirm authenticity before processing. Verify the signature against Reap's public key and reject any request that fails verification.

* **Header format:** `timestamp=<epoch_ms>;signature=<base64>`
* **Algorithm:** RSA SHA3 256
* **Signed payload:** `JSON.stringify({ ...body, timestamp })` where the request body is serialised with the `timestamp` field added as the **last key**
* **Key order is significant:** preserve the exact key order when reconstructing the signed payload for verification because signature verification will fail if the body is serialized with a different key order.
* **Regenerated on every attempt:** the `timestamp` and `signature` are generated fresh for each delivery attempt so the `Reap-Signature` changes on every retry even when the request body and `x-reap-trace-id` remain identical
* **Verify using the request's own timestamp:** always use the `timestamp` provided in the header of the request being verified and never reuse a `timestamp` from a previous delivery attempt
* **Do not use the signature for de-duplication:** the signature changes with each delivery attempt so use `x-reap-trace-id` as the stable identifier for de-duplication

<br />

## Retry Behaviour

* Failed deliveries are retried with **increasing backoff**
* Reap makes up to **\~20 delivery attempts**
* Retries are spread over **several days** before Reap stops
* Each retry uses the same request body and `x-reap-trace-id` while the `Reap-Signature` changes because a new `timestamp` is generated and the payload is re-signed for every attempt
* The real-time authorization request webhook is **not** retried (see [Delivery Modes](https://reap.readme.io/docs/webhook-idempotency-tc-draft#delivery-modes))

<Callout icon="ℹ️" theme="info">
  Design the handler to remain correct regardless of when a duplicate arrives or how many times it is delivered.
</Callout>

***

# Recommended Idempotency Handling

Make the webhook endpoint idempotent so that processing the same event twice has no additional effect:

1. Verify the `Reap-Signature` and reject the request if it is invalid
2. Read `x-reap-trace-id`
3. If that trace ID has already been processed, return `2xx` immediately and stop (acknowledge and ignore)
4. Otherwise, process the event, then store the trace ID
5. Return a `2xx` response and make the underlying business action idempotent using a business key such as a transaction ID so repeated processing remains safe

<br />

## Example: webhook payload

The payload below is a validated example of a transaction authorization event (`eventType: transaction`, `eventName: authorization`). Values may vary by event but the structure reflects what an endpoint receives, verifies, and de-duplicates.

```json
{
  "eventName": "authorization",
  "eventType": "transaction",
  "data": {
    "id": "tid_01890a5d7b3c4f2e9a1b6c8d2e4f0a11",
    "card_id": "11111111-2222-4333-8444-555566667777",
    "bill_amount": 21.80,
    "bill_currency": "840",
    "transaction_amount": 20,
    "transaction_currency": "978",
    "conversion_rate": "1.0900000000000",
    "merchant_data": {
      "merchant_id": "987654321",
      "merchant_name": "BLUE BEAN COFFEE",
      "merchant_city": "AMSTERDAM",
      "merchant_post_code": "1011",
      "merchant_state": "NH",
      "merchant_country": "NLD",
      "mcc_category": "Eating Places, Restaurants",
      "mcc_code": "5812"
    },
    "fees": { "atm_fees": "0.00", "fx_fees": "0.04" },
    "mcc_padding_amount": 0,
    "cleared_at": null,
    "cleared_date": null,
    "status": "PENDING",
    "decline_reason": {},
    "channel": "POS",
    "pos_entry_mode": { "code": "07", "description": "Contactless chip using VSDC rules" },
    "wallet": "APPLE",
    "lifecycle_event_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    "created_at": "2026-06-14T10:15:30.000Z",
    "pos_data": {
      "pos_transaction_data": {
        "card_device_type": "mobile_phone",
        "card_present_indicator": "card_present",
        "cardholder_present_indicator": "cardholder_present",
        "card_data_input_method": "emv_contactless_or_vsdc_contactless",
        "merchant_or_cardholder_initiated_indicator": "cardholder_initiated"
      },
      "pos_terminal_capability": {
        "terminal_type": "unknown/unspecified",
        "terminal_environment": "on_premises_of_card_acceptor",
        "terminal_attended_indicator": "attended"
      }
    }
  }
}
```

<br />

## Example: duplicate-check pattern (Javascript)

```javascript
async function webhookHandler(req, res) 
{
  
// Verify signature before processing
  const isValid = verifyReapSignature(req);

  if (!isValid) 
  {
    return res.status(401).send("Invalid signature");
  }

  const traceId = req.headers["x-reap-trace-id"];

  // Check whether this event was already processed
  const alreadyProcessed = await store.exists(traceId)

  if (alreadyProcessed) 
  {
    return res.status(200).send("OK")
  }

  // Process the webhook payload
  await processEvent(req.body)

  // Record the trace ID for duplicate detection
  await store.put(traceId, 
  {
    ttl: 14 * 24 * 60 * 60 
  })

  return res.status(200).send("OK")
}

```

<br />

## Key rules

* **Always return a `2xx` response for duplicate events.** A non-`2xx` response will cause Reap to continue retrying the webhook
* **Verify the signature before processing**
* **Use `x-reap-trace-id` for deduplication** as the `Reap-Signature` is regenerated on every delivery attempt and changes across retries of the same event
* **Keep stored trace IDs at least as long as the retry window** (see retention below)
* **Manual replays generate a new trace ID.** A manually replayed event is sent as a new delivery with a new `x-reap-trace-id`. Trace-ID checks will not detect these replays so business-key idempotency is required to prevent duplicate processing

***

# How Long to Retain Trace IDs

No client-side de-duplication window is enforced. Duplicate deliveries may occur until Reap's retry period ends. After that no further automatic retries are made.

* **Minimum:** retain each processed `x-reap-trace-id` for at least the retry window (\~10 days)
* **Recommended:** 14 days (covers the window with margin)
* **Safe upper bound:** 30 days

***

# TL;DR

* Reap retries any webhook that does not receive a `2xx` response so the same event may be delivered to an endpoint multiple times
* Use `x-reap-trace-id` as the deduplication key because it is included in every webhook and remains unchanged across automatic retries while also being unique to a single event
* Verify the `Reap-Signature` then validate the trace ID then process the event only if the trace ID has not been seen before then store the trace ID and return a `2xx` response
* The `Reap-Signature` is regenerated on every attempt so verify it using the `timestamp` from that specific request and never use the signature as the deduplication key
* Duplicate deliveries caused by retries apply only to asynchronous webhooks because the real time authorisation request webhook is synchronous and is not retried
* Webhook delivery order is not guaranteed so do not rely on the sequence in which events arrive and order them using payload data such as `created_at` when sequence matters
* Store processed trace IDs for at least 10 days with 14 days recommended and 30 days as the maximum retention period
* Implement idempotency using a business specific identifier in addition to the trace ID because manual replays generate a new trace ID

***

<br />