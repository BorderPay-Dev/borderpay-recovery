---
updatedAt: 2025-08-13T10:47:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Notification 

An overview of the `notification` event type.

There are 2 eventName in `notification` event Type, they are:

1. **3DS Authentication Notification** – Triggered when a transaction is undergoing a **3D Secure (3DS) challenge flow** and requires cardholder authentication. (`eventName: biometric_auth_notification_received`)
2. **Wallet Tokenization OTP Notification** – Triggered when a card is being provisioned to a digital wallet and requires identity verification via SMS. (`eventName: wallet_tokenization_otp`\*\*)

***

## **3DS Authentication Notification**

When a transaction undergoes a **3D Secure (3DS) challenge flow** and the card has \*\*opted into <Glossary>3DS Forwarding</Glossary>, a `biometric_auth_notification_received` webhook is triggered.

### **What You Can Do With This Webhook**

Upon receiving this webhook, your system must validate the cardholder's identity, verify the request, and determine whether to authorize the transaction.

To communicate your decision, send a **POST request** to Reap’s system using [`POST card/{cardid}/3ds-answer/{initiateActionId}/`](https://reap.readme.io/reference/post_cards-cardid-3ds-answer-initiateactionid#/) end point.

The request must include the transaction's `initiateActionId` along with your authorization decision within 5 minutes.

After Reap processes your 3DS decision, a transaction webhook (`eventName=authorization`) will be sent to your system.

### Sample Request Payload

```json
{
 "eventName": "biometric_auth_notification_received",
  "eventType": "notification",
	"data": { 
    "cardId": "5e347602-a66a-42ff-bde9-ccaa6a6a7bb8",
    "status": "PENDING",
    "merchantName": "Sephora Digital",
    "initiateActionId": "254725c4-70d6-4527-8f5a-fbb324ef77d9",
    "transactionAmount": "170.0000",
    "merchantCountryCode": "344",
    "transactionCurrency": "344",
    "transactionTimestamp": "2023-07-26T09:13:01.748Z"
  }
}
```

### Webhook Event Fields

| Field                       | Description                                                                        | Possible values                                       |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `eventName`                 | The name of this webhook event.                                                    | `biometric_auth_notification_received`                |
| `eventType`                 | The type of webhook event.                                                         | `notification`                                        |
| `data`                      | An object containing details about the transaction notification.                   | Object                                                |
| `data.cardId`               | The **unique identifier** of the card undergoing a **3DS challenge flow**.         | String                                                |
| `data.status`               | The **status** of this transaction event.                                          | `PENDING`\| `CLEARED`                                 |
| `data.merchantName`         | The **merchant's name** that is associated with this transaction.                  | String                                                |
| `data.initiateActionId`     | A **unique identifier** for the transaction that initiated the 3DS challenge flow. | String (e.g., `254725c4-70d6-4527-8f5a-fbb324ef77d9`) |
| `data.transactionAmount`    | The **transaction amount**.                                                        | String (monetary value, e.g., `170.0000`)             |
| `data.merchantCountryCode`  | The **ISO 3166-1 numeric country code** of the merchant’s registered address.      | String (e.g., `344` for Hong Kong)                    |
| `data.transactionCurrency`  | The **ISO 4217 currency code** for this transaction.                               | String (e.g., `344` for HKD)                          |
| `data.transactionTimestamp` | The **timestamp** of this transaction.                                             | String (e.g., `2023-07-26T09:13:01.748Z`)             |

> 🚧 To receive this webhook, the following conditions must be met:
>
> 1. The card **must be opted into 3DS forwarding**.
> 2. **3DS forwarding must be enrolled** for this card using [`POST /cards/{cardId}/3ds-forwarding`](https://reap.readme.io/reference/post_cards-cardid-3ds-answer-initiateactionid#/)  end point.
> 3. The transaction **must involve a 3DS challenge flow**.

<br />

To learn more about <Glossary>3DS Forwarding</Glossary>, including how to enrol it for a card and manage 3DS authentication flows, refer to the 3DS Forwarding Setup Guide. For a detailed 3DS challenge transaction flow walkthrough, see the [3DS Forwarding](https://reap.readme.io/reference/3ds-forwarding#/)  guide.

***

## **Wallet Tokenization OTP Notification**

The `wallet_tokenization_otp` webhook is triggered when a cardholder selects SMS as their verification method during tokenization. A common example of tokenization is adding a card to a mobile wallet.

### **What You Can Do With This Webhook**

Tokenization creates a virtual representation of a payment card inside a digital wallet, enabling it for transactions. During this process, the cardholder must verify their identity by receiving a one-time password (OTP) via SMS or email.

When cardholders choose SMS as their OTP delivery method, you will receive this webhook. If network issues prevent OTP delivery, your system can retrieve it from this webhook and forward it through alternative channels, such as in-app notifications or customer support.

Additionally, this webhook provides key tokenization details, including the wallet type, card ID, and phone number information, which can be used for verification tracking.

*Note: If the cardholder selects email for OTP delivery, this webhook will not be triggered.*

> 🚧 Important Notes for the Wallet Tokenization Notification Webhook
>
> The OTP is valid for only 2 minutes, so ensure the cardholder completes the verification within this timeframe.

### Sample Request Payload

```json
{
  "eventName": "wallet_tokenization_otp",
  "eventType": "notification",
  "data": {
    "otp": "173679",
    "wallet": "Google Pay",
    "card_id": "5f9591b4-b26d-43d6-aef0-c0e0f0df6eac",
    "otp_phone_number": {
      "dial_code": 20,
      "phone_number": "1153127906"
    }
  }
}
```

### Webhook Event Fields

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Field
      </th>

      <th>
        Description
      </th>

      <th>
        Possible values
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        `eventName`
      </td>

      <td>
        The name of this webhook event.
      </td>

      <td>
        String
        `wallet_tokenization_otp`
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
        `notification`
      </td>
    </tr>

    <tr>
      <td>
        `data`
      </td>

      <td>
        An object containing details about the cardholder’s tokenization process.
      </td>

      <td>
        Object
      </td>
    </tr>

    <tr>
      <td>
        `data.otp`
      </td>

      <td>
        The one-time password (OTP) required for the cardholder to verify their identity and complete tokenization.
      </td>

      <td>
        A 6-digit string
      </td>
    </tr>

    <tr>
      <td>
        `data.wallet`
      </td>

      <td>
        The mobile wallet the cardholder is linking their card to.
      </td>

      <td>
        String
        `google pay`
      </td>
    </tr>

    <tr>
      <td>
        `data.card_id`
      </td>

      <td>
        The unique identifier of the card being added to the mobile wallet.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        `data.otp_phone_number`
      </td>

      <td>
        An object containing details about the phone number used for OTP verification.
      </td>

      <td>
        Object
      </td>
    </tr>

    <tr>
      <td>
        `data.otp_phone_number.dial_code`
      </td>

      <td>
        The country dial code for the cardholder’s phone number.
      </td>

      <td>
        String (e.g., `20` for Egypt)
      </td>
    </tr>

    <tr>
      <td>
        `data.otp_phone_number.phone_number`
      </td>

      <td>
        The cardholder’s phone number (excluding the dial code).
      </td>

      <td>
        String (e.g., `1153127906`)
      </td>
    </tr>
  </tbody>
</Table>