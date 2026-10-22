---
updatedAt: 2026-02-12T16:04:06.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Transaction 

An overview of the `transaction` event type.

The `transaction` webhook is triggered when a specific event occurs in the transaction lifecycle. A transaction can go through multiple stages, such as <Glossary>Authorization</Glossary>, <Glossary>Clearing</Glossary>, <Glossary>Reversal</Glossary> and <Glossary>Refund</Glossary>, each of which triggers a corresponding `transaction` webhook event webhook with different eventName values.

| Transaction Lifecycle Event | Transaction webhook `eventName` | Description                                                 |
| :-------------------------- | :------------------------------ | :---------------------------------------------------------- |
| Authorization               | `authorization`                 | Triggered when a transaction is authorized.                 |
| Clearing                    | `authorization.clearing`        | Triggered when an authorized transaction amount is cleared. |
| Transaction Decline         | `authorization.advice`          | Triggered when a transaction is declined.                   |
| Reversal                    | `authorization.reversal`        | Triggered when an authorized transaction is reversed.       |
| Refund                      | `refund`                        | Triggered when a transaction is refunded.                   |

## What You Can Do With This Webhook

This webhook is useful for you to keep track of all transaction event coming into your system and on your cards. This is particularly useful for monitoring, managing, and responding to card activity efficiently:

1. **Instant Notifications**: This webhook delivers real-time transaction updates, enabling you to flag fraud, monitor transaction events, and take immediate action when needed.
2. **Enhanced Cardholder Experience** – Notify users of successful transactions, declines, or required actions.
3. **Automated Workflows** – Streamline processes by integrating transaction data into your systems and triggering actions based on event types.
4. **Targeted Monitoring** – Focus on specific transaction types or statuses to maintain security and compliance.

***

### Sample Request Payload

**Example 1: Successful transaction authorization**

```json
{
  "eventName": "authorization",
  "eventType": "transaction",
  "data": {
    "id": "tid_hvB6pAeCy2",
    "fees": {
      "fx_fees": "0.00",
      "atm_fees": "0.00"
    },
    "status": "PENDING",
    "wallet": null,
    "card_id": "3e49943f-d542-4f78-869f-810cfac0b59e",
    "channel": "ECOMMERCE",
    "pos_data": {
      "pos_transaction_data": {
        "card_device_type": "unknown",
        "pos_fraud_indicator": "no_problem",
        "card_data_input_method": "account_data_on_file",
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
        "merchant_initiated_transaction_type_indicator": "credential_on_file",
        "security_protocol_between_cardholder_device_and_merchant": "channel_encryption"
      },
      "pos_terminal_capability": {
        "terminal_type": "unknown/unspecified",
        "terminal_environment": "on_premises_of_cardholder",
        "card_capture_capability": "card_capture_not_supported",
        "partial_approval_support": "not_supported",
        "card_data_input_capability": [
          "e_commerce"
        ],
        "terminal_output_capability": "unknown",
        "terminal_attended_indicator": "unknown",
        "terminal_pin_capture_capability": "none",
        "cardholder_authentication_capability": [],
        "terminal_card_data_output_capability": "unknown"
      }
    },
    "cleared_at": null,
    "created_at": "2025-03-18T13:55:33.051Z",
    "bill_amount": 20.1,
    "cleared_date": null,
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
    "conversion_rate": "1.0000497537191",
    "lifecycle_event_id": "1353ecdd-e61c-40d8-82a6-035a7abada93",
    "mcc_padding_amount": 0,
    "transaction_amount": 20.099,
    "transaction_currency": "840"
  }
}
```

**Example 2: Transaction Authorization Declined**

```json
{
  "eventName": "authorization.advice",
  "eventType": "transaction",
  "data": {
    "id": "tid_hvB6pAeCy2",
    "fees": {
      "fx_fees": "0.00",
      "atm_fees": "0.00"
    },
    "status": "DECLINED",
    "wallet": null,
    "card_id": "3e49943f-d542-4f78-869f-810cfac0b59e",
    "channel": "ECOMMERCE",
    "pos_data": {
      "pos_transaction_data": {
        "card_device_type": "unknown",
        "pos_fraud_indicator": "no_problem",
        "card_data_input_method": "account_data_on_file",
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
        "merchant_initiated_transaction_type_indicator": "credential_on_file",
        "security_protocol_between_cardholder_device_and_merchant": "channel_encryption"
      },
      "pos_terminal_capability": {
        "terminal_type": "unknown/unspecified",
        "terminal_environment": "on_premises_of_cardholder",
        "card_capture_capability": "card_capture_not_supported",
        "partial_approval_support": "not_supported",
        "card_data_input_capability": [
          "e_commerce"
        ],
        "terminal_output_capability": "unknown",
        "terminal_attended_indicator": "unknown",
        "terminal_pin_capture_capability": "none",
        "cardholder_authentication_capability": [],
        "terminal_card_data_output_capability": "unknown"
      }
    },
    "cleared_at": null,
    "created_at": "2025-03-18T13:55:33.051Z",
    "bill_amount": 20.1,
    "cleared_date": null,
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
    "conversion_rate": "1.0000497537191",
    "lifecycle_event_id": "1353ecdd-e61c-40d8-82a6-035a7abada93",
    "mcc_padding_amount": 0,
    "transaction_amount": 20.099,
    "transaction_currency": "840"
  }
}
```

<br />

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
        String
        `authorization`|`authorization.advice`|`authorization.reversal`| `authorization.clearing`| `refund`
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
        `transaction`
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
        status
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
        `ANDROID`|`null`
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
        Object (e.g., `Insufficient Funds by External Auth`)
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
        This is calculated as `bill_amount` / `transaction_amount`.
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
        `actual_authentication_method`
      </td>

      <td>
        The authentication method used in a 3D Secure (3DS) challenge flow.
      </td>

      <td>
        String
        `sms`|`biometric`| `push`| `other`| `not_applicable`
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
        The object that includes  detail POS data of the transaction
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/).
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/).
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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
        For all possible values, please refer to this [page](https://reap.readme.io/docs/understanding-transactions-through-pos-data#/) .
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

## Transaction Status & Event Mapping

Since `status` represents the state of the transaction event, the following table shows possible combinations of `eventName` and their respective statuses:

| **eventName**          | **Status**        |
| ---------------------- | ----------------- |
| authorization          | `PENDING`, `VOID` |
| authorization.clearing | `CLEARED`         |
| authorization.reversal | `PENDING`, `VOID` |
| authorization.advice   | `DECLINED`        |
| refund                 | `CLEARED`         |

To learn more about transaction events and their lifecycle, refer to the [Transaction Scenarios  ](https://reap.readme.io/docs/transaction-scenarios) guide.

***

**Related Materials**:

📖 Guide/ [Transaction Decline Reasons](https://reap.readme.io/docs/transaction-decline)

📖 Guide/ [Understanding Transactions Through POS Data ](https://reap.readme.io/docs/understanding-transactions-through-pos-data)

⚙️ API Reference/ [Authorization Webhook](https://reap.readme.io/reference/webhook-eventtype-authorization-request#/)