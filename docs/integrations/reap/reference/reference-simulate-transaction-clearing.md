---
updatedAt: 2025-05-08T03:59:21.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate Transaction Clearing

Simulate and test transaction clearing events in the Reap API sandbox environment

After simulating a transaction authorization, the next step in validating your integration is to simulate a **clearing event**. This confirms the final settlement of funds and triggers webhook notifications that reflect a completed transaction. You can simulate clearing against a specific authorized transaction using its transactionID, or independently for testing purposes.

# Prerequisite

To use this endpoint, you must first create a card using `POST /cards`endpoint and subscribe to a webhook using `POST /webhooks` endpoint first.

# Endpoint

```json cURL
POST https://sandbox.api.caas.reap.global/simulate/{transactionID}/clearing
```

> Replace `{transactionID}` with the ID returned during the authorization simulation. You may omit the transaction ID for a standalone clearing simulation.

***

# Example: Simulate Clearing for an Authorized Transaction

## Request

```json cURL
POST https://sandbox.api.caas.reap.global/simulate/tid_ND0Q3FX8of/clearing
```

## Request Body

```json
{
  "transactionAmount": "10"
}
```

## Response

```json
{
    "lifecycleEventID": "11ce6e85-3c3e-4da2-b65c-da279a2681c6",
    "id": "tid_ND0Q3FX8of"
}
```

## **Webhook: Transaction Cleared**

Once the clearing is completed, you’ll receive a webhook with:

* `eventType`: `transaction`
* `eventName`: `authorization.clearing`

This indicates that the funds have been settled and the transaction is now marked as cleared.

```json
{
  "eventName": "authorization.clearing",
  "eventType": "transaction",
  "data": {
    "id": "tid_ND0Q3FX8of",
    "fees": {
      "fx_fees": "0.00",
      "atm_fees": "0.00"
    },
    "status": "CLEARED",
    "wallet": null,
    "card_id": "515e0272-249b-4172-aa0f-1e85de4ff534",
    "channel": "ECOMMERCE",
    "cleared_at": "2025-04-22T08:53:33.000Z",
    "created_at": "2025-04-22T08:53:33.456Z",
    "bill_amount": 500,
    "cleared_date": "2025-04-22T08:53:33.456Z",
    "bill_currency": "840",
    "merchant_data": {
      "mcc_code": "5732",
      "merchant_id": "311178830000",
      "mcc_category": "Electronics Stores",
      "merchant_city": "www.reap.global",
      "merchant_name": "Reap",
      "merchant_state": null,
      "merchant_country": "HKG",
      "merchant_post_code": null
    },
    "decline_reason": {},
    "conversion_rate": "1.0000000000000",
    "lifecycle_event_id": "11ce6e85-3c3e-4da2-b65c-da279a2681c6",
    "mcc_padding_amount": 0,
    "transaction_amount": 500,
    "transaction_currency": "840"
  }
}
```

***

**Related Materials**:

📖 Guide/ [Transaction Scenarios/ Lifecycle](https://reap.readme.io/docs/transaction-scenarios)

📖 Guide/ [Authorized Transaction With Clearing](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/)

📖 Guide/ [Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)

⚙️ API Reference/ [Simulate Authorization Clearing Transaction](https://reap.readme.io/reference/post_simulate-transactionid-clearing#/)

⚙️ API Reference/ [Webhook / Transaction](https://reap.readme.io/reference/webhook-eventtype-transaction#/)