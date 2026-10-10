---
updatedAt: 2025-04-15T09:46:56.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# 3DS Forwarding

How 3DS forwarding works in a 3DS checkout

During a [3DS](https://reap.readme.io/docs/3ds)  checkout, the cardholder’s identity must be verified. 3DS Forwarding is an add-on feature that allows you to use alternative methods—beyond the default SMS option—to verify your cardholders.

By enabling 3DS Forwarding, the responsibility for sending, forwarding, and handling the 3DS authentication process lies with you.

## Methods to Verify a Cardholder Using 3DS Forwarding

Opting for 3DS Forwarding allows you to offer alternative options that fits your internal business logic for cardholders to verify their identities during a 3DS checkout, improving the user experience.

As long as you can notify and verify cardholders' identities, you have full autonomy to build your own workflow or preferred method for authentication. Common communication and authentication channels include email, native mobile or web app, and SMS. Verification methods are not limited to sending an OTP — alternatives may include answering a security question, solving an in-app puzzle, or clicking an **'Authenticate'** button within the app.

**Potential verification use cases:**

* Verify via in-app notification.
* Verify by answering a security question.
* Verify by clicking a link that re-direct the cardholder back to the app to verity.

## **How 3DS Forwarding Works**

Here's a step-by-step explanation of how 3DS Forwarding works:

1. **Enroll in a 3DS Forwarding method**: To enable 3DS Forwarding method for a specific card, use the **[Update 3DS forwarding method API](https://reap.readme.io/reference/put_cards-cardid-3ds-forwarding)**.
2. **User Interaction**: When a cardholder makes an online transaction requiring 3DS authentication, they choose the verification option built into your internal logic (e.g., in-app notification). This triggers 3DS Forwarding.
3. **Webhook Notification**: You will receive a **[webhook with`eventType`= notification](https://reap.readme.io/reference/webhook-events#3ds-forwarding)** and an associated **`initiateActionId`**, requesting 3DS approval.

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

4. **Authenticate the Cardholder**: Authenticate your cardholder according to your configuration and preferred logic.
5. **Respond to the Request**: Using the **[respond to 3DS Forwarding request API](https://reap.readme.io/reference/post_cards-cardid-3ds-answer-initiateactionid)**, you will send a response with the **`initiateActionId`** received earlier. This response indicates whether to proceed with the transaction. You should respond within 5 minutes to avoid transaction timeout and approve the transaction.
6. **Complete Transaction**: Reap responds to the signal back to Visa to proceed with the transaction.

> 🚧 3DS Forwarding is an extra feature that needs to be configured.
>
> Please reach out to your Relationship Manager if you wish to activate this feature for your card program.