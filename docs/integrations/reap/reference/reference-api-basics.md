---
updatedAt: 2025-05-08T04:31:05.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# API Basics

Test and validate your card issuing integration with the Reap API sandbox environment.

This guide provides a comprehensive walkthrough of accessing the using the Reap Card Issuing API in the sandbox environment. Whether you’re just getting started or looking to validate key integration flows before going live, this reference will help ensure your implementation is seamless, secure, and production-ready.

# **Accessing Sandbox**

The Reap sandbox environment allows you to safely test your API integration before deploying it to production. All test requests are isolated from live data and enable simulation of key workflows.

To begin testing, authenticate your request using your API key:

```Text cURL
"x-reap-api-key": "YOUR_API_KEY"
```

### **Example: Issue a Card**

```Text cURL
curl --request POST \
  --url https://sandbox.api.caas.reap.global/cards \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-reap-api-key: YOUR_API_KEY'
```

To learn more and retrieve your sandbox API key, visit our [Getting Started Guide](https://reap.readme.io/docs/getting-started).

**Note**: Always use the sandbox base URL (<https://sandbox.api.caas.reap.global>) when making test API calls.

**No IP whitelisting is required** for sandbox access.

***

# **Switching Between Environments**

You can switch between sandbox and production environments by updating the base URL and using the appropriate API key.

* **Sandbox Base URL**: <https://sandbox.api.caas.reap.global>
* **Production Base URL**: [https://prod.api.caas.reap.global](https://prod.api.caas.reap.global/)

***

# **Common Sandbox Limitations**

While the sandbox supports most core features, some production-only workflows are simulated or unavailable:

* 3DS transaction and 3DS forwarding flow
* Physical card shipping cannot be fully tested
* Mobile Wallet provisioning

# **Versioning and Backward Compatibility**

The Reap Card Issuing API follows semantic versioning to maintain stability across updates. Breaking changes will never be introduced without prior notice.

We regularly release backward-compatible improvements documented in our [Changelog](https://reap.readme.io/changelog#/).

### **Examples of Non-Breaking Changes**

* Adding new optional request parameters to existing endpoints
* Adding new fields in existing responses
* Modifying the format or length of opaque values (e.g., resource IDs or error messages)

***

# Connecting Multiple Environments to Reap’s Sandbox

Reap supports two environments: sandbox and production. If your internal setup includes additional environments—such as dev, staging, and production—you can use multiple Reap accounts to mirror your workflow.

For example, you can create:\
•	Account A: access to both sandbox and production, used for your staging and production systems.
•	Account B: access to sandbox only, used for your dev environment.

This setup allows your developers to safely test in dev, run QA in staging, and deploy to production while staying within Reap’s supported environments.

***

<br />

**Related Materials:**

⚙️ API Reference/ [Test Environment](https://reap.readme.io/docs/test-environment)

⚙️ API Reference/ [Rate Limit](https://reap.readme.io/docs/rate-limit)