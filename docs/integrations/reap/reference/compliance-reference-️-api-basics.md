---
updatedAt: 2026-06-09T14:16:24.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# API Basics

Test and validate your integration using the Reap KYCaaS sandbox environment.  This guide walks you through how to access and use the sandbox environment for the Reap Compliance API. Whether you're setting up entity verification, simulating KYC flows, or testing webhooks, this reference will help you build a secure, stable, and production-ready integration.

## 🧪 Accessing the Sandbox

The Reap sandbox environment allows you to safely test your compliance integration before deploying it to production. All sandbox operations are isolated from live systems and enable simulation of key onboarding workflows.

### ✅ Authentication

To begin testing, send requests to the sandbox server using your **API key** in the request header:

```http
x-reap-api-key: YOUR_API_KEY
```

***

### 📦 Example: List All Features

```bash
curl --request GET \
  --url https://sandbox-compliance.api.reap.global/features \
  --header 'x-reap-api-key: YOUR_API_KEY' \
  --header 'Accept-Version: v1.0' \
  --header 'accept: application/json'
```

Need your key? See the [Getting Started Guide](/reference/getting-started) for how to request access.

> 🔗 Base URL for Sandbox:<br />`https://sandbox-compliance.api.reap.global`

> 📘 IP whitelisting is not required for the Reap Compliance API in either sandbox or production environments.

***

## 🔁 Switching Between Environments

You can easily toggle between sandbox and production by updating your API key and base URL:

| Environment    | Base URL                                     |
| -------------- | -------------------------------------------- |
| **Sandbox**    | `https://sandbox-compliance.api.reap.global` |
| **Production** | `https://compliance.api.reap.global`         |

***

## 🚧 Common Sandbox Limitations

While the sandbox supports most functionality, a few real-world behaviors are simulated:

* KYC verification is mocked (use signed payloads or token flows to simulate success/failure)
* Webhooks are delivered in real-time, but processing delays may vary
* Feature approvals are automatically applied in some flows for testing convenience

***

## 🔁 Versioning and Compatibility

The Reap Compliance API follows **semantic versioning** (`MAJOR.MINOR.PATCH`) to ensure consistent behavior over time.

We avoid breaking changes. All backwards-compatible updates are documented in our [Changelog](/changelog).

### Examples of Non-Breaking Changes

* Adding new optional fields in requests or responses
* Adding support for new `requirementSlug` values
* Improving validation or expanding enum values

***

## 🧩 Working with Multiple Environments

If your organization has multiple internal environments (e.g., dev, staging, prod), we recommend using separate Reap sandbox accounts to mirror your workflow.

| Environment | Suggested Reap Setup               |
| ----------- | ---------------------------------- |
| **Dev**     | Account A – Sandbox only           |
| **Staging** | Account B – Sandbox + Production   |
| **Prod**    | Account B – Production access only |

This setup allows your team to test safely in development while maintaining full control over production access.