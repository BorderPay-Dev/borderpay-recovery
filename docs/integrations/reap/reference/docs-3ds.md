---
updatedAt: 2025-09-26T01:50:26.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# 3D Secure

Learn how 3D Secure checkout and authentication work and their impact on the cardholder's online transaction experience.

**After reading this page, you will understand:**

1. What 3DS is
2. How 3DS policies affect transaction authorization and user experiences
3. When does a 3DS authentication happen

## What is 3D Secure?

Three-Domain Secure (3DS) is a security protocol designed to authenticate cardholders during online transactions. 3DS can be a potential **authentication** check during the transaction lifecycle. Specifically, 3DS may be triggered during the authentication stage, depending on the risk profile of the transaction This extra verification layer is mandatory for all Visa credit card programs, as it reduces the risk of fraudulent transactions and enhances the overall security of online payments. It typically involves entering a one-time password (OTP) or a biometric identification verification before a transaction is authorized online.

<Image align="center" border={false} caption="This is an example of what the cardholder sees on the checkout page if the transaction requires 3DS authentication. (This example is generic and does not limit it to cardholders of Reap's card issuing program.)" src="https://files.readme.io/ca83a55130b3a69972abf1c13434180aae8d06e5c8d98a81d04a2fbe837a0631-Untitled_design.png" />

> 📘 Customized user experience:
>
> Card program using a dedicated BIN can tailor the above prompt’s look and feel by adding their logos and customizing the design. Talk to your Relationship Manager to learn about dedicated BIN configurations.

## When 3DS authentication is triggered?

When an online transaction is triggered, the cardholder may or may not need to authenticate their identity as an extra step to ensure this transaction is 3DS certified. The merchant, the card issuing institute (Reap in our context), and regulatory bodies can set rules for when to apply 3DS authentication based on their internal risk policies and regulations. If authentication is needed, it is considered a **Challenge 3DS transaction**. If not, it is considered a **Frictionless 3DS transaction**.

|                              | Risk of Fraud         | Approval Process                                                           | Pros                               | Cons                                            |
| :--------------------------- | :-------------------- | :------------------------------------------------------------------------- | :--------------------------------- | :---------------------------------------------- |
| Frictionless 3DS Transaction | Low-risk scenarios    | Transaction is approved without any additional steps                       | Better user experience             | May not prevent all fraud                       |
| Challenge 3DS Transaction    | Higher-risk scenarios | An OTP or biometric verification is needed to proceed with the transaction | Ensures a higher level of security | One extra step needed to finish the transaction |

## Step-by-step Explanation: 3DS Checkout And Authentication Flow

When a cardholder initiates an online purchase, the 3DS authentication flow differs slightly depending on whether your Card Program has opted in for [3DS Forwarding](https://reap.readme.io/docs/3ds-forwarding-1#/)  feature. Follow the appropriate steps below based on your configuration:

### For Card Programs NOT using 3DS Forwarding

1. The cardholder initiates a purchase at checkout.
2. The merchant triggers a 3DS authentication request.
3. VISA routes the authentication request to Reap.
4. Reap sends an OTP via SMS directly to the cardholder.
5. The cardholder enters the OTP to verify their identity.
6. Reap shares the authentication result with VISA and completes the transaction.

### For Card Programs WITH 3DS Forwarding

1. The cardholder initiates a purchase at checkout.
2. The merchant triggers a 3DS authentication request.
3. By default, the 3DS forwarding flow is initiated.
4. VISA routes the authentication request to Reap.
5. Reap sends the 3DS authentication notification to your system via the [notification webhook](https://reap.readme.io/reference/webhook-eventtype-notification#/) .
6. Your system authenticates the cardholder using your own method.
7. Once the cardholder is verified, your system notifies Reap.
8. Reap shares the authentication result with VISA and proceeds with the transaction.

## Communication channels to verify cardholders

In all 3DS checkout, an OTP is sent to the cardholder's mobile phone `meta.otpPhoneNumber` via SMS as the default option. However, this may compromise the user experience, as cardholders might not have the option to choose another channel to receive the OTP.

> ❗️ Ensure the cardholders' phone numbers are up-to-date in your system
>
> As the system will send the OTP via SMS as a default option.

## 3DS Forwarding: flexible channel options for receiving OTP

To provide greater flexibility in building your card program and give you more control over the authentication process, you can enable our 3DS Forwarding feature as an optional add-on.

3DS Forwarding is a valuable enhancement for both you and your cardholders. It increases control over how authentication is handled and allows you to implement more reliable methods for verifying cardholders during transactions.

Continue to the next guide to learn more about how the 3DS Forwarding feature works and how it can benefit you as a card program owner.

***

**Related Materials**:

📖 Guide/ [3DS Forwarding](https://reap.readme.io/reference/3ds-forwarding#/)

⚙️ API Reference/ [3DS Forwarding API reference page](https://reap.readme.io/reference/post_cards-cardid-3ds-answer-initiateactionid#/)

⚙️ API Reference/ [Webhook/ Notification](https://reap.readme.io/reference/webhook-eventtype-notification#/)