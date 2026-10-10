---
updatedAt: 2026-08-03T08:16:55.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Authorization 

An overview of the `authorization` event type.

The `authorization` webhook is triggered when a transaction decision is required for card programs that have opted into <Glossary>Real-Time Authorization</Glossary>. This occurs whenever a transaction request is received.

## What You Can Do With This Webhook

This webhook is essential for card programs that support real-time authorization, as it enables your system to approve or decline a transaction request when a cardholder initiates a transaction.

When triggered, this webhook provides detailed transaction data, including merchant and amount details. You must respond to Reap’s system within 1.6 seconds using the unique `authorization_id` as the identifier.

To learn how to respond to an authorization request, refer to the Response to the [Response to Real-Time Authorization Request](https://reap.readme.io/docs/response-to-real-time-authorization-request#/)   guide.

***

### Sample Payload

```json json
{
  "mcc": "5342",
  "fees": {
    "fx_fees": "0.00",
    "atm_fees": "0.00"
  },
  "wallet": "",
  "card_id": "a1e3c40a-e9ac-4795-a8fb-e623ec41258a",
  "channel": "ECOMMERCE",
  "pos_data": {
    "pos_transaction_data": {
      "card_device_type": "unknown",
      "pos_fraud_indicator": "no_problem",
      "card_data_input_method": "ecommerce",
      "card_present_indicator": "card_not_present",
      "cardholder_present_indicator": "cardholder_not_present_ecommerce",
      "3d_secure_authentication_method": "unknown/not_applicable",
      "cardholder_authentication_entity": [
        "not_authenticated"
      ],
      "cardholder_authentication_method": [
        "not_authenticated"
      ],
      "merchant_or_cardholder_initiated_indicator": "unknown",
      "merchant_initiated_transaction_type_indicator": "unknown/not_applicable",
      "security_protocol_between_cardholder_device_and_merchant": "channel_encryption"
    },
    "pos_terminal_capability": {
      "terminal_type": "unknown",
      "terminal_environment": "unknown",
      "card_capture_capability": "unknown",
      "partial_approval_support": "unknown",
      "card_data_input_capability": [
        "e_commerce"
      ],
      "terminal_output_capability": "unknown",
      "terminal_attended_indicator": "unknown",
      "terminal_pin_capture_capability": "unknown",
      "cardholder_authentication_capability": [],
      "terminal_card_data_output_capability": "unknown"
    }
  },
  "created_at": "2025-05-28T02:55:14.692Z",
  "message_id": "891ef522-dc2d-4e5e-b6ed-1894db67a5c9",
  "bill_amount": 10,
  "bill_currency": "344",
  "exchange_rate": "1.00",
  "merchant_city": "www.reap.global",
  "merchant_data": {
    "mcc_code": "5342",
    "merchant_id": "311178830000",
    "mcc_category": "Electronics Stores",
    "merchant_city": "www.reap.global",
    "merchant_name": "Reap",
    "merchant_state": null,
    "merchant_country": "HK",
    "merchant_post_code": null
  },
  "merchant_name": "Reap",
  "billing_amount": 10,
  "merchant_state": null,
  "transaction_id": "tid_0YyrdIyRk9",
  "conversion_rate": "1.00",
  "merchant_amount": 10,
  "authorization_id": "891ef522-dc2d-4e5e-b6ed-1894db67a5c9",
  "billing_currency": "344",
  "merchant_address": null,
  "merchant_country": "HK",
  "transaction_date": "2025-05-28T02:55:14.692Z",
  "transaction_type": "100",
  "conversation_rate": "1.00",
  "merchant_currency": "344",
  "settlement_amount": 10,
  "lifecycle_event_id": "891ef522-dc2d-4e5e-b6ed-1894db67a5c9",
  "mcc_padding_amount": 0,
  "transaction_amount": 10,
  "settlement_currency": "344",
  "transaction_currency": "344",
  "actual_authentication_method": "not_applicable"
}

```

### Webhook Event Fields

<Table align={["left","left","left","left"]}>
  <thead>
    <tr>
      <th>
        Field
      </th>

      <th>
        Description
      </th>

      <th>
        Possible Values
      </th>

      <th>
        Remarks
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        `eventName`
      </td>

      <td>

      </td>

      <td>
        String<br />`request`
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `eventType`
      </td>

      <td>
        The type of webhook event.
      </td>

      <td>
        String
        `authorization`
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `data`
      </td>

      <td>
        An object containing transaction-specific details.
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `data.id`
      </td>

      <td>
        The unique identifier for the transaction within its lifecycle.
      </td>

      <td>
        String
      </td>

      <td>
        If additional transaction events occur within the same transaction lifecycle, `data.id` remains the same.
      </td>
    </tr>

    <tr>
      <td>
        `fees`
      </td>

      <td>
        Object containing details of fees applied to this transaction.
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `fees.fx_fees`
      </td>

      <td>
        Foreign exchange (FX) fees incurred in this transaction.
      </td>

      <td>
        String (e.g., `0.00`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `fees.atm_fees`
      </td>

      <td>
        ATM withdrawal fees incurred in this transaction.
      </td>

      <td>
        String (e.g., `0.00`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `status`
      </td>

      <td>
        The current status of this transaction event within the transaction lifecycle.
      </td>

      <td>
        String
        `PENDING`| `CLEARED`| `DECLINED`|`VOID`
      </td>

      <td>
        Refer to the table below for valid `status` for each `eventName`.
      </td>
    </tr>

    <tr>
      <td>
        `wallet`
      </td>

      <td>
        The mobile wallet used for this transaction, if applicable.
      </td>

      <td>
        String
        `android`|`null`|`MRTOKEN`
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `card_id`
      </td>

      <td>
        The unique identifier of the card used in this transaction.
      </td>

      <td>
        String
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `channel`
      </td>

      <td>
        The payment channel used for this transaction.
      </td>

      <td>
        String
        `ATM`|`POS`| `ECOMMERCE`| `VISA_DIRECT`
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `message_id`
      </td>

      <td>
        The unique identifier for this specific transaction event.
      </td>

      <td>
        String
      </td>

      <td>
        Each `message_id` is unique, even within the same transaction lifecycle.
      </td>
    </tr>

    <tr>
      <td>
        `created_at`
      </td>

      <td>
        The timestamp when the transaction was created.
      </td>

      <td>
        String
        (e.g., `2025-02-04T07:28:04.362Z`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `cleared_at`
      </td>

      <td>
        The timestamp when the transaction was cleared (if applicable).
      </td>

      <td>
        String
        (e.g., `2025-02-04T07:28:04.362Z`| `null`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `bill_currency`
      </td>

      <td>
        The currency of the cardholder's account used for billing.
      </td>

      <td>
        String
        ISO 4217 currency code (e.g., `840` for USD, `344` for HKD)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `bill_amount`
      </td>

      <td>
        The amount billed in the cardholder’s currency.
      </td>

      <td>
        Float
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data`
      </td>

      <td>
        Object containing merchant details.
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.mcc_code`
      </td>

      <td>
        The Merchant Category Code (MCC) of the merchant.
      </td>

      <td>
        String (e.g., `5732`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_id`
      </td>

      <td>
        The unique identifier of the merchant.
      </td>

      <td>
        String (e.g., `311178830000`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.mcc_category`
      </td>

      <td>
        The business category of the merchant.
      </td>

      <td>
        String (e.g., `Electronics Stores`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_city`
      </td>

      <td>
        The registered city of the merchant
      </td>

      <td>
        String (e.g., `Manchester`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_name`
      </td>

      <td>
        The registered name of the merchant.
      </td>

      <td>
        String (e.g., `ABC Company`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_state`
      </td>

      <td>
        The state or city in the merchant’s registered address.
      </td>

      <td>
        String (e.g., `London`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_country`
      </td>

      <td>
        The country in the merchant’s registered address.
      </td>

      <td>
        String (e.g., `Japan`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `merchant_data.merchant_post_code`
      </td>

      <td>
        The postal code in the merchant’s registered address.
      </td>

      <td>
        String (e.g., `SW1X 7XL`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `decline_reason`
      </td>

      <td>
        The reason for a declined transaction. Only applicable if the transaction is `DECLINED`.
      </td>

      <td>
        String (e.g., `Insufficient Funds by External Auth`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `conversion_rate`
      </td>

      <td>
        The exchange rate applied if `bill_currency` and `transaction_currency` are different.
      </td>

      <td>
        String
      </td>

      <td>
        This is calculated as `transaction_amount`/`bill_amount`.
      </td>
    </tr>

    <tr>
      <td>
        `lifecycle_event_id`
      </td>

      <td>
        The unique identifier of the transaction event lifecycle.
      </td>

      <td>
        String (e.g., `ec3a4131-580e-4f5f-851c-ff350bdfb183`)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `mcc_padding_amount`
      </td>

      <td>
        The MCC padding amount  due to MCC padding rules, if applicable.
      </td>

      <td>
        Float
      </td>

      <td>
        MCC padding can be adjusted using [`POST /account/mcc-padding`](https://reap.readme.io/update/reference/post_account-mcc-padding#/) .
      </td>
    </tr>

    <tr>
      <td>
        `transaction_amount`
      </td>

      <td>
        The amount charged in the merchant's currency.
      </td>

      <td>
        Float
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `transaction_currency`
      </td>

      <td>
        The currency used by the merchant for this transaction.
      </td>

      <td>
        String
        ISO 4217 currency code (e.g., `840` for USD, `344` for HKD)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `authorization_id`
      </td>

      <td>
        The unique identifier of the transaction that needs authorization approval.
      </td>

      <td>
        String (e.g., `b4a33cc4-67a4-4d9a-9f3b-b3d3b728a65f`)
      </td>

      <td>
        You must respond to Reap’s system within 1.6 seconds using the unique `authorization_id` as the identifier using HTTP status code.
      </td>
    </tr>

    <tr>
      <td>
        `actual_authentication_method`
      </td>

      <td>
        The authentication method used in a 3D Secure (3DS) challenge flow.
      </td>

      <td>
        String
        `sms`| `biometric`| `push`| `other`| `not_applicable`
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `settlement_amount`
      </td>

      <td>
        The final amount settled after FX conversion.
      </td>

      <td>
        String
        ISO 4217 currency code (e.g., `840` for USD, `344` for HKD)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `settlement_currency`
      </td>

      <td>
        The currency in which the transaction is settled.
      </td>

      <td>
        String
        ISO 4217 currency code (e.g., `840` for USD, `344` for HKD)
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data`
      </td>

      <td>
        Include the transaction data from the POS.
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data`
      </td>

      <td>
        The object that include the detail POS data of the transaction
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.cardholder_present_indicator`
      </td>

      <td>
        This field describes if the cardholder was present at the point of sale
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.card_present_indicator`
      </td>

      <td>
        This field describes if the card was present at the point of sale
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.card_data_input_method`
      </td>

      <td>
        This field describes how the card data (eg PAN) was provided to the terminal
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.cardholder_authentication_method`
      </td>

      <td>
        Describes the possible cardholder authentication method.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.cardholder_authentication_entity`
      </td>

      <td>
        For each authentication method, the entity performing that authentication method is recorded
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.pos_fraud_indicator`
      </td>

      <td>
        This is used by the merchant to indicate if the merchant thought the transaction was suspicious.  Not all networks, acquirers or terminals may support this.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.security_protocol_between_cardholder_device_and_merchant`
      </td>

      <td>
        This describes, for an e-commerce or equivalent card data input method, what security was in place between the cardholder device and merchant system.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.card_device_type`
      </td>

      <td>
        If 3D Secure was used to authenticate the cardholder, then this indicates what type of authentication was used.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.merchant_or_cardholder_initiated_indicator`
      </td>

      <td>
        Network flag to indicate the transaction uses instant funding (MoneySend or Visa Direct)
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_transaction_data.merchant_initiated_transaction_type_indicator`
      </td>

      <td>
        Indicates who initiated the transaction.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability`
      </td>

      <td>
        An object shows the details of the POS that is used for the transaction.
      </td>

      <td>
        Object
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.partial_approval_support`
      </td>

      <td>
        Indicates if POS terminal supports partial approval or not
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.card_data_input_capability`
      </td>

      <td>
        Card Data Input methods supported by the terminal.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.card_capture_capability`
      </td>

      <td>

      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_attended_indicator`
      </td>

      <td>
        Indicates if the terminal is attended by the merchant
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_environment`
      </td>

      <td>
        Indicates the Terminal Environment or Location-type
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_card_data_output_capability`
      </td>

      <td>
        Indicates the ability of the terminal to write to the card
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_output_capability`
      </td>

      <td>
        Indicates the output capabilities of the terminal
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_pin_capture_capability`
      </td>

      <td>
        Terminal PIN Capture Capability.
        Says if the terminal can capture PINs, and if so, the maximum length of PIN supported:
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>

    <tr>
      <td>
        `pos_data.pos_terminal_capability.terminal_type`
      </td>

      <td>
        Defines what sort of terminal this is.
      </td>

      <td>
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/)  .
      </td>

      <td>

      </td>
    </tr>
  </tbody>
</Table>

***

## Responding to the Authorization Request

To approve or decline an authorization request, your system must respond within 1.6 seconds with an `authorization response` to inform Reap of the decision.

The endpoint should return a status code following the best practices of [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

### Sample Response Payload

```json json
{
  "authorization_id":"b4a33cc4-67a4-4d9a-9f3b-b3d3b728a65f",
  "response_code": "00"
}
```

When responding to an authorization request webhook, use the following codes:

| **Response Code** | **Action**          | **Description**                                                                                          | Remarks                                                                                                               |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `00`              | Approve transaction | Transaction is successfully authorized.                                                                  | /                                                                                                                     |
| `51`              | Decline transaction | Insufficient funds.                                                                                      | This code is returned as `5E` in the `decline_reason.response_code` when querying the retrieve transaction endpoints. |
| `5C`              | Decline transaction | Transaction not permitted (e.g., restricted MCC).                                                        | This code is returned as `5C` in the `decline_reason.response_code` when querying the retrieve transaction endpoints. |
| `41`              | Decline transaction | The card is reported lost.                                                                               | Use this code when a cardholder has reported their card as lost.                                                      |
| `43`              | Decline transaction | Stolen card capture.                                                                                     | Use this code when a cardholder has reported their card as stolen.                                                    |
| `46`              | Decline transaction | The card is no longer active.                                                                            | The card status is inactive, and transactions cannot be processed.                                                    |
| `59`              | Decline transaction | Something went wrong when processing the transaction. Please contact support.                            | This may indicate a potential fraud case.                                                                             |
| `61`              | Decline transaction | You have exceeded your ATM withdrawal limit. Please try a smaller amount or wait for the limit to reset. | The cardholder has exceeded their ATM withdrawal limit.                                                               |
| `62`              | Decline transaction | ATM withdrawals are not allowed in this country for your card.                                           | ATM withdrawals are not enabled for this card in the country where the cardholder attempted to use it.                |
| `65`              | Decline transaction | You have exceeded the allowed number of ATM withdrawals. Please try again later.                         | The cardholder has exceeded the permitted number of ATM withdrawals.                                                  |

<Callout icon="❗️" theme="error">
  ### Important Note for Real-Time Authorization Card Programs

  Only the codes listed above can be used by your system to send responses back to Reap's system after receiving the authorization webhook. Using any other codes from this table will result in a declined transaction with a decline code `R12` from our system, refer to the [Real Time Authorization Request Response](https://reap.readme.io/docs/response-to-real-time-authorization-request)   Guide for more detials.
</Callout>

***

**Related Materials**:

📖 Guide/ [Transaction Decline Reasons](https://reap.readme.io/docs/transaction-decline)

📖 Guide/ [Understanding Transactions Through POS Data ](https://reap.readme.io/docs/understanding-transactions-through-pos-data)

⚙️ API Reference/ [Transaction Webhook](https://reap.readme.io/reference/webhook-eventtype-transaction#/)