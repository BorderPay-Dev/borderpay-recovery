---
updatedAt: 2026-06-26T06:48:22.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Card 

An overview of the `card` event type.

The `card` webhook event is triggered when a card is **blocked** or **deactivated** by Reap’s system. This may result in transaction declines because, depending on the reason, the `card_status` is set to either`BLOCKED`or `SANCTION_CHECK_FAILED`.

You will receive details about:

* The **reason** the card was blocked.
* The **specific card** affected by the block.

### **What You Can Do With This Webhook**

Upon receiving this webhook, review the card's activity and assess potential fraud or compliance risks. Depending on the reason:

* For **fraud-related blocks** (`SUSPECTED_FRAUD_*`): inform the cardholder about the block and take appropriate action, such as verifying transactions or unblocking the card if applicable.
* For **internal review related blocks** (`INTERNAL_REVIEW_FAILED`): the card has been permanently deactivated. Do not attempt to reactivate, unblock, or recreate it for the same cardholder. Contact your Reap account manager if you believe the match is a false positive.

> 🚧 Important note about `card_status` webhook
>
> * If your system **manually blocks a card** using the [`PUT /cards/{cardId}/block`](https://reap.readme.io/reference/put_cards-cardid-block#/)  endpoint, this webhook **will not be triggered**.
>   * To **unblock a card**, use the [`PUT /cards/{cardId}/unblock` ](https://reap.readme.io/reference/put_cards-cardid-unblock#/) endpoint.
> * Cards deactivated due to `INTERNAL_REVIEW_FAILED` cannot be unblocked, unfrozen, reactivated, or re-confirmed via any client API. The card lifecycle state for these cards is `DELETED`.
>   * Calls to `PUT /cards/{cardId}/unblock`, `PUT /cards/{cardId}/unfreeze`, `PUT /cards/{cardId}/activate`, and the cardholder identity confirmation endpoint will all return errors against these cards.

### Possible Reasons for a Card Block

| Status                   | Description                                                                                       |
| :----------------------- | :------------------------------------------------------------------------------------------------ |
| `SUSPECTED_FRAUD_CVV`    | Triggered when 3 incorrect CVV attempts occur within the last hour.                               |
| `SUSPECTED_FRAUD_EXPIRY` | Triggered when 3 incorrect expiration date attempts occur within the last hour.                   |
| `SUSPECTED_FRAUD_PIN`    | Triggered when 3 incorrect transaction PIN attempts occur.                                        |
| `INTERNAL_REVIEW_FAILED` | Triggered when the cardholder fails internal review during the automated post-creation screening. |

***

### Sample Request Payload

```json Suspected fraud
{
  "eventName": "card_status",
  "eventType": "card",
  "data": {
    "id": "e3b45865-8bc1-4ac7-9eb2-6c520bc9a545",
    "status": "SUSPECTED_FRAUD_PIN"
  }
}
```
```json Internal review failed
{
  "eventName": "card_status",
  "eventType": "card",
  "data": {
    "id": "e3b45865-8bc1-4ac7-9eb2-6c520bc9a545",
    "status": "INTERNAL_REVIEW_FAILED"
  }
}
```

### Webhook Event Fields

| Field         | Description                                          | Possible Values                                                                                            |
| :------------ | :--------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `eventName`   | The name of this webhook event.                      | String `card_status`                                                                                       |
| `eventType`   | The type of webhook event.                           | String `card`                                                                                              |
| `data`        | An object containing details about the blocked card. | Object                                                                                                     |
| `data.id`     | The unique identifier of the blocked card.           | String (e.g., `"e3b45865-8bc1-4ac7-9eb2-6c520bc9a545"`)                                                    |
| `data.status` | The reason the card was blocked by Reap’s system.    | String `SUSPECTED_FRAUD_CVV`\| `SUSPECTED_FRAUD_EXPIRY`\| `SUSPECTED_FRAUD_PIN`\| `INTERNAL_REVIEW_FAILED` |