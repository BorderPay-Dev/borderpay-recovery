---
updatedAt: 2025-05-08T03:59:09.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Subscribe To Webhook

Subscribe to webhook events from Reap’s API to get real-time updates on your card program.

Subscribing to a webhook is a key part of integrating with Reap’s card issuing API. Webhooks allow your system to receive real-time updates about card events, such as transactions and status changes. This ensures you can act immediately based on the latest activity in your card program.

Before testing features like authorization or clearing, be sure your webhook server is set up to listen for these events.

# Endpoint

```json cURL
POST https://sandbox.api.caas.reap.global/webhooks
```

***

# Request

To subscribe to webhook notifications, provide your server’s listening endpoint:

```json
{
"subscribeUrl": "https://webhook-test.com/eafd48685d51ac83b3453aa6db01db82" //(your webhook server url)
}
```

> Replace the example URL with the public URL of your webhook server.

***

# Response

After a successful subscription:

```json
{
    "id": "99dee42f-4479-4c44-9aa9-d482ba77a9e7"
}
```

A successful response indicates your webhook is registered and will start receiving events.

***

**Related Materials**:

⚙️ API Reference/ [Webhooks](https://reap.readme.io/docs/webhooks)

⚙️ API Reference/ [Subscribe To Webhooks](https://reap.readme.io/reference/post_webhooks#/)