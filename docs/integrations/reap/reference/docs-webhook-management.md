---
updatedAt: 2026-05-25T12:36:35.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Webhook Management

Enables management of CaaS webhook configurations and supports real-time event notifications across features.

**Purpose:** Configure, retrieve, and delete webhook endpoints to receive real-time event notifications from the CaaS platform.

***

# When to Use This

Use this guide when you need to:

* Receive real-time event notifications
* Register a webhook endpoint for transaction event updates
* View existing webhook configurations
* Remove unused webhook endpoints

***

# Overview

Webhooks enable real-time event notifications from the CaaS platform to external systems. Events are delivered via automated HTTP callbacks when relevant actions occur instead of polling for updates which ensures timely processing, improved system efficiency, and a more responsive user experience.

***

# Prerequisites

1. A valid CaaS API key is required to authenticate all webhook management requests
2. At least one webhook must be previously configured to be retrieved or removed
3. Access to the CaaS Client Dashboard is required for managing webhooks via the UI

***

# Key Concepts

## Webhook

* HTTP callback triggered by events
* Enables real-time communication

## Subscriber URL

* Public endpoint that receives webhook payloads

## Webhook ID

* Unique identifier for each webhook configuration
* Used for deletion and management

***

# Flow Overview

1. Register a webhook endpoint using `POST /webhooks`
2. Receive event notifications at the subscriber URL
3. Retrieve configured webhooks using `GET /webhooks`
4. Delete a webhook using `DELETE /webhooks/webhookId`

***

# API Summary

| Action            | Endpoint              | Method | Use Case                                |
| ----------------- | --------------------- | ------ | :-------------------------------------- |
| Subscribe webhook | `/webhooks`           | POST   | Register a new webhook subscription     |
| List webhooks     | `/webhooks`           | GET    | Retrieve all webhook subscriptions      |
| Delete webhook    | `/webhooks/webhookId` | DELETE | Remove an existing webhook subscription |

***

# Managing Webhooks

## Subscribe to Webhooks

Register a webhook endpoint to receive real-time transaction events and notifications from the CaaS platform.

<br />

### Call the Subscribe Webhook Endpoint

Use [POST /webhooks](https://reap.readme.io/reference/post_webhooks) to subscribe a webhook URL that will receive event callbacks.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox.api.caas.reap.global/webhooks \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "subscriberUrl": "string"
  }'
```

### Key Input

| Parameter Name  | Type   | Description                                                         |
| :-------------- | :----- | :------------------------------------------------------------------ |
| `subscriberUrl` | string | Publicly accessible endpoint where webhook events will be delivered |

<br />

### Sample Response

```json Response Status 200
{
  "id": "string"
}
```

### Key Output

| Parameter Name | Type   | Description                                    |
| :------------- | :----- | :--------------------------------------------- |
| `id`           | string | Unique identifier of the webhook configuration |

***

## List Webhooks

Retrieve all webhook configurations associated with the account.

<br />

### Call the List Webhooks Endpoint

Use [GET /webhooks](https://reap.readme.io/reference/get_webhooks) to fetch all registered webhook endpoints tied to the API key.

<br />

### Sample Request (cURL)

```curl
curl --request GET \
  --url https://sandbox.api.reap.global/webhooks \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
```

<br />

### Sample Response

```json Response Status 200
{
  "items": [
    {
      "id": "string",
      "budgetId": "string",
      "businessUuid": "string",
      "subscriberUrl": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "meta": {
    "totalItems": 0,
    "itemCount": 0,
    "itemsPerPage": 0,
    "totalPages": 0,
    "currentPage": 0
  }
}
```

### Key Output

#### i) items\[] (array of objects)

| Parameter Name  | Type   | Description                                        |
| :-------------- | :----- | :------------------------------------------------- |
| `id`            | string | Unique identifier of the webhook configuration     |
| `budgetId`      | string | Identifier of the associated budget                |
| `businessUuid`  | string | Unique identifier of the business                  |
| `subscriberUrl` | string | Public endpoint where webhook events are delivered |
| `createdAt`     | string | Timestamp when the subscription was created        |
| `updatedAt`     | string | Timestamp when the subscription was last updated   |

<br />

#### ii) meta (object)

| Parameter Name | Type  | Description                               |
| :------------- | :---- | :---------------------------------------- |
| `totalItems`   | float | Total number of webhook subscriptions     |
| `itemCount`    | float | Number of items returned in this response |
| `itemsPerPage` | float | Number of items per page                  |
| `totalPages`   | float | Total number of pages available           |
| `currentPage`  | float | Current page number                       |

***

## Delete Webhook

Remove an existing webhook configuration when no longer required.

<br />

### Call the Delete Webhook Endpoint

Use [DELETE /webhooks/webhookId](https://reap.readme.io/reference/delete_webhooks-id) to permanently delete a webhook using its unique identifier.

<br />

### Sample Request (cURL)

```curl
curl --request DELETE \
  --url https://sandbox.api.reap.global/webhooks/webhookId \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
```

### Key Input

| Parameter Name | Type   | Description                                    |
| :------------- | :----- | :--------------------------------------------- |
| `webhookId`    | string | Unique identifier of the webhook configuration |

<br />

### Sample Response

```json Response Status 200
{
  "id": "string"
}
```

### Key Output

| Parameter Name | Type   | Description                              |
| :------------- | :----- | :--------------------------------------- |
| `id`           | string | Unique identifier of the deleted webhook |

***

## Manage Webhooks via Dashboard

Configure and manage webhook endpoints directly from the CaaS Client Dashboard.

<br />

### Where to Find It:

Navigate to the Webhooks section within the CaaS dashboard after logging in.

<Image align="center" src="https://files.readme.io/634209ac8f9c864ee565891fa165f7dbe07cea7dbfd512dc5db831ac06f3679d-dashboard_webhook_config.png" />

**Figure 1.** Webhook Management Workflow (Dashboard UI)

<br />

**Figure 1.** shows the Steps of Webhook Management Workflow

1. **Navigate to Settings**: Access the Settings page from the dashboard.
2. **Open the Developer Tab**: Select the Developer tab to view developer configurations.
3. **Locate the Webhooks Section**: Scroll to the Webhooks section to view all configured webhook endpoints.
4. **View Webhook Details**: Each webhook entry displays the Destination URL and Last updated timestamp
5. **Manage a Webhook**: Select the action menu next to a webhook to Edit the webhook URL or Delete the webhook.

***

# Scenarios

## Scenario: Registering a New Webhook

* Use `POST /webhooks`
* Provide a valid subscriberUrl

## Scenario: Checking Existing Webhooks

* Use `GET /webhooks`

## Scenario: Removing an Unused Webhook

* Use `DELETE /webhooks/webhookId`

***

# Common Errors

| Error             | Cause                       | Resolution                    |
| ----------------- | --------------------------- | ----------------------------- |
| 401 Unauthorized  | Invalid API key             | Check x-reap-api-key          |
| Invalid URL       | subscriberUrl not reachable | Use public HTTPS endpoint     |
| Webhook not found | Wrong webhookId             | Verify ID via `GET /webhooks` |

***

# TL;DR

* Use `POST /webhooks` to register a webhook
* Use `GET /webhooks` to list all webhooks
* Use `DELETE /webhooks/webhookId` to remove a webhook
* Webhooks deliver real-time event notifications

***

Related Materials

⚙️ API Reference/ [API Basics](https://reap.readme.io/reference/api-basics)