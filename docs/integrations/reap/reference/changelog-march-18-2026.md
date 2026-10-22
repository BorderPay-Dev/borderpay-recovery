---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# March 18, 2026

# **Fraud Alert & Fraud Confirmation**

We’re introducing new capabilities for **CaaS programs** that allow you to receive fraud alerts via webhook and report fraud directly through API.

### 🔔 Fraud Alert Notifications

When our Fraud Transaction Monitoring system flags a suspicious transaction, you’ll receive a webhook event:

* `eventType: "fraud"`
* `eventName: "fraud_detection"`

The event includes transaction details, merchant information, and a suggested message you can send to the cardholder to help confirm whether the transaction is legitimate.

### 🛡️ Fraud Confirmation API

You can report fraud through the API either:

* in response to a Fraud Alert, or
* proactively for a transaction reported by a cardholder, including approved transactions

Available endpoints:

**Respond to an existing fraud alert**

`PUT /fraud-alert/{fraud-alert-id}/respond`

**Report fraud for a transaction**

`POST /transactions/{transaction-id}/fraud-alert`

Once a response is submitted, we’ll process the corresponding fraud action for the card based on that response. A follow-up webhook will then be sent:

`eventName: "fraud_action"`

This event confirms the resulting card status.

### 📘 Fraud History API

You can retrieve fraud records using:

`GET /fraud-alert`

This endpoint supports filtering by status, date range, and transaction.

## Why is this happening?

Timely fraud reporting is an important requirement under card network rules and helps improve fraud detection across the payment ecosystem.

Previously, fraud reporting was largely manual, which made it harder for you to report cases quickly and consistently. These new APIs allow you to manage fraud alerts and confirmations in a more structured and automated way.

## 📅 When is this happening?

This feature is scheduled to be enabled for **CaaS programs** starting **1 April 2026**.

This gives your team time to update your systems to recognize the new webhook event types before they go live.

## ⚠️ Action required

To avoid webhook processing failures after go-live, your systems should be updated to recognize and handle these events:

* `fraud_detection`
* `fraud_action`

## ✅ Optional capabilities

With this feature, you can:

* Receive fraud alerts via webhook and notify your cardholders
* Confirm or dispute suspicious transactions through API
* Trigger fraud actions that may block or unblock cards based on fraud confirmation
* Proactively report fraud on supported transactions within 180 days
* Query fraud history with filters

## 📘 Getting started

Full integration details, payload examples, and sandbox simulation instructions are available in our [API Guide](https://reap.readme.io/docs/fraud-reporting-guide).

We recommend reviewing the guide and testing the full workflow in staging before the feature goes live.

Questions? Please contact your **Implementation Manager** or our **support team**.

Thank you.

**Team Reap**