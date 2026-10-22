---
updatedAt: 2026-10-02T05:10:25.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# API Idempotency

Traces how the client sends a retry safe POST request on the CaaS API, with card creation as the example, from the first attempt through the cached response that every retry of that attempt receives. It covers the operations that require a key, key generation, the replay of the cached response on a retry, and the request formats, response formats, and status transitions.

**Purposes**: This guide follows one logical operation that the client repeats safely after a network failure or a timeout, such as creating an account, a card, a posting, a dispute, or an API key, or submitting a card shipment, and maps each attempt to its API call, request, response, and resulting resource. It covers every POST request that carries the idempotency header with card creation as the worked call, separating the one time key generation from the attempts that repeat until a final response arrives.

***

# When to Use This

Use this guide when you need to:

* Protect any POST request that creates money movement or a chargeable resource, such as a card, against duplicate submission and replay the cached response on every retry.

***

# Overview

The CaaS API treats a POST request and every retry of that request as one logical operation that a single idempotency key identifies. The key is required on every operation that creates money movement or a chargeable resource, which covers account, card, posting, dispute, and API key creation and card shipment submission, and stays optional on every other POST request. The server stores the status code and the body of the first completed attempt against that key as the cached response, so a retry never creates a second chargeable resource.

The client generates a key, persists it, and sends the request with that key, as the card creation example in this guide shows. The server runs the operation once, caches the outcome, and returns the result. When the first response does not arrive, the client repeats the request with the same key and the same body and receives the cached response instead of a new execution.

The server keeps the cached response for 24 hours after the first request, so every retry inside that window receives the same outcome. The key stays bound to the body of the first attempt, so a retry repeats that body without change and a different request needs a new key. A required operation that arrives without a key is rejected before it runs.

***

# Prerequisites

1. Use a valid bearer token for the CaaS API project that owns the resource
2. Send the Reap version header on every request
3. Generate a high entropy key of up to 255 characters for each logical operation
4. Persist the key before the first attempt so a retry after a client crash reuses the same key

***

# Key Concepts

## Idempotent Operations

* Groups the POST requests that create money movement or a chargeable resource and therefore require the idempotency key
* Account creation, card creation, posting creation, dispute creation, API key creation, and card shipment submission each reject a request that omits the key with a `422` response
* Every other POST request accepts the key as optional and honors it when present

## Card Creation Request

* Creates a card through the CaaS API and serves as the worked example of an idempotent operation in this guide
* The card counts as a chargeable resource, so the request requires the idempotency key and a duplicate submission carries a real cost
* Returns the card identifier that the cached response repeats on every retry

## Cached Response

* Stores the status code and the body of the first completed attempt against the idempotency key
* Carries the `idempotent-replayed` response header when the server returns it on a retry
* Holds every completed outcome including a business error, while `401`, `422`, and `429` responses stay uncached and safe to repeat under the same key

## Idempotency Key

* Identifies one logical operation and travels in the `Idempotency-Key` header of any POST request
* Accepts a UUIDv4 or any high entropy string of up to 255 characters and expires 24 hours after the first request
* A retry with the same key and the same body replays the cached response instead of creating a second resource

***

# Flow Overview

Key generation runs once for each logical operation, and every idempotent request, shown here through card creation, repeats under that key until a final response arrives.

* Card creation uses `POST /cards` to create the card and cache the first response against the idempotency key, which every retry with the same key and the same body receives

***

# API Summary

| Action      | Endpoint | Method | Use Case                                                                           |
| ----------- | -------- | ------ | ---------------------------------------------------------------------------------- |
| Create card | `/cards` | POST   | Creates a card and caches the first response for every retry of the same operation |

***

# Idempotent Request Walkthrough

## Step 1: Create Card

Create the card as one logical operation that stays safe to repeat after a timeout or a network failure. Repeat the step after a failed attempt to receive the cached response instead of a second card.

<br />

### Call the Create Card Endpoint

Use [POST /cards](https://reap.readme.io/reference/post_cards) to create a card and cache the first response for every retry.

<Callout icon="ℹ️" theme="info">
  <br />The `Idempotency-Key` header is required on this call because it creates a chargeable resource, and the same rule applies to every operation under Idempotent Operations. The server keeps the cached response for 24 hours after the first request, so a retry with the same key and the same body inside that window never creates a second card.
</Callout>

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox.api.reap.global/cards \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --header 'Idempotency-Key: <idempotency-key>' \
  --data '{
  "cardType": "Virtual",
  "spendLimit": "1000",
  "customerType": "Consumer",
  "kyc": {
    "firstName": "<string>",
    "lastName": "<string>",
    "dob": "2000-07-22",
    "residentialAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "country": "HKG"
    },
    "idDocumentType": "Passport",
    "idDocumentNumber": "<string>"
  },
  "preferredCardName": "<string>",
  "meta": {
    "otpPhoneNumber": {
      "dialCode": 60,
      "phoneNumber": "123456789"
    },
    "id": "<string>"
  },
  "programType": "retail",
  "scheme": "visa"
}'
```

### Key Input

| **Parameter Name** | **Type** | **Description**                                           |
| ------------------ | -------- | --------------------------------------------------------- |
| `Idempotency-Key`  | string   | Identifies one logical card creation across every attempt |

<br />

### Sample Response

```json Response Status 201
{
  "id": "<string>"
}
```

### Key Output

| **Parameter Name** | **Type** | **Description**                                                        |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `id`               | string   | Identifies the created card that every retry with the same key returns |

***

# Scenarios

## Scenario: Successful Retry After a Network Timeout

* The client generates one idempotency key for the card creation and persists it before the first attempt
* The client sends `POST /cards` with the key and receives no response within the timeout window
* The client repeats `POST /cards` with the same key and the same body
* The client confirms that the response carries the `idempotent-replayed` header and stores the returned card identifier
* The cached response stays available for 24 hours, so a retry inside that window returns the same card identifier

***

# Common Errors

| **Error**                  | **Cause**                                                                         | **Resolution**                                                            |
| -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `IDEMPOTENCY_KEY_MISMATCH` | The retry sends a different body under a key that already holds a cached response | A new key covers a request with a different body                          |
| `IDEMPOTENCY_KEY_CONFLICT` | The attempt arrives while another attempt under the same key still runs           | A retry with backoff returns the cached response of the completed attempt |

***

# TL;DR

* Step 1 creates a card as the example idempotent operation through `POST /cards`, which runs the operation once, caches the first response for 24 hours, and replays the cached response on every retry of the same operation