---
updatedAt: 2026-02-13T08:59:41.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Rate Limit

To ensure consistent performance, security, and fair usage of our services, we apply rate limits to all API requests. This guide explains how rate limits work, the specific limits for each endpoint, and how to handle errors if you’ve exceeded them.

> **Note:** The rate limits described on this page apply to both **Production and Sandbox environments**, unless explicitly stated otherwise.

# Rate Limit Rules

The following table outlines the current rate limits, measured as the maximum number of requests per second per API key.

| Rule Type | Endpoint                           | Rate Limit (request/ second/ API Key) |
| :-------- | :--------------------------------- | :------------------------------------ |
| Flat Rule | All endpoints                      | 20                                    |
| Exception | `Post /cards`                      | 10                                    |
| Exception | `GET /cards/{bulkshipID}/bulkship` | 1                                     |
| Exception | `GET /cards/:cardID/orders`        | 1                                     |

> ❗️ Authorization Request
>
> Authorization requests are not subject to rate limits.

***

# What Happens If You Exceed the Limit?

If your system exceeds the allowed rate limit, the API will return a **429 Too Many Requests response**. This means you’ve hit the request threshold for the current time window.

To recover:

* Pause briefly before retrying
* Evaluate whether any unnecessary requests can be reduced

***

**Related Materials**:

⚙️ API Reference/ [API Basics](https://reap.readme.io/docs/api-basics)

⚙️ API Reference/ [Test Environment](https://reap.readme.io/docs/test-environment)