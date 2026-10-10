---
updatedAt: 2025-06-25T11:19:59.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Subscribe to Webhook

Subscribe to webhook events from the Reap Compliance API to receive real-time updates on verification progress, feature access changes, and more.  Webhook integration allows your system to stay synchronized with compliance-related activities—so you can automate responses when an entity is verified, a feature is unlocked, or new compliance actions are required.  Before testing status transitions, make sure your webhook listener is properly set up to receive and respond to these events.

## 📡 Endpoint

```http
POST https://sandbox-compliance.api.reap.global/notification
```

***

## 📨 Request

To subscribe to webhook notifications, provide your public webhook URL and specify the types of events you want to receive:

```json
{
  "notificationChannel": "WEBHOOK",
  "notificationTypes": [
    "account_status_change",
  ],
  "webhookUrl": "https://yourdomain.com/webhooks/reap"
}
```

> 🔁 Replace the `webhookUrl` with your own public server that can receive HTTP `POST` requests.

***

## ✅ Response

After successful registration:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "channel": "WEBHOOK",
  "types": [
    "account_status_change"
  ],
  "config": {
    "webhook": {
      "url": "https://yourdomain.com/webhooks/reap"
    }
  },
  "createdAt": "2025-05-31T12:00:00Z"
}
```

You will begin receiving webhook events based on the types you subscribed to.

***

## 🔐 Notes

* Your server must respond with `200 OK` within **5 seconds**.
* Each business can configure up to **10 webhook connections**.
* Webhook notifications are sent as HTTP `POST` requests with JSON bodies.