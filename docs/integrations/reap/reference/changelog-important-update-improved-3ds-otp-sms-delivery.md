---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Aug 25, 2025

# **Important Update: Improved 3DS OTP SMS Delivery**

Starting **September 1, 2025**, we are upgrading the way One-Time Passwords (OTP) SMS are delivered for **Visa Secure (3DS) authentications**.

## **What’s Changing**

* **More Reliable SMS Delivery**

  Stronger coverage in countries with strict regulations by using pre-registered sender IDs, where required, to avoid being labeled as spam.

* **Sender IDs**

  SMS will appear from a generic sender ID **“AUTHOTP”**, or from a pre-registered sender ID (e.g., **“TWVERIFY”** or **“AUTHMSG”**) where required. This replaces the previous “REAP” signature.

* **Standardized Messages**

  OTP SMS will follow a clear, standardized format:

  `Use code {OTP} to approve your Visa Secure transaction of {CURRENCY} {AMOUNT} to {MERCHANT_NAME} with card ending {LAST_4_DIGITS}`

  Example:

  `Use code 123456 to approve your Visa Secure transaction of USD 120.00 to AMAZON MKTPLC US with card ending 4321`

* **Localized Messages for China**

  Messages sent to Chinese mobile numbers will follow a government-approved local template.

  `【Twilio】 你的 TWVerify 验证码是 {OTP}`

  Example:

  `【Twilio】 你的 TWVerify 验证码是 123456`

## **Why is this happening?**

We’ve heard feedback from clients and cardholders that OTP SMS delivery could occasionally face challenges in certain countries with strict telecom rules (e.g., UAE, China).

In addition, the previous “REAP” SMS signature sometimes caused confusion for cardholders.

To address this, we are introducing a new SMS service provider that ensures **higher reliability, clearer content, and globally compliant messaging**. It will also set the foundation for future client-managed SMS delivery options through the SMS Delegating feature.

## **What does this mean for you?**

No action is required and there will be no disruption to SMS messages. These updates will provide cardholders with **faster, more reliable OTP SMS messages and reduce confusion** during checkout.

## When is this happening?

This change will roll out gradually from **September 1, 2025** and will apply to all 3DS OTP authentication SMS messages.

## **Need Help?**

If you have questions or need guidance, please refer to our API documentation or contact support.