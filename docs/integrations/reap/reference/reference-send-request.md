---
updatedAt: 2025-05-08T04:18:09.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Send Request

This quick start section helps you simulate key card activities in Reap Card Issuing API's sandbox environment. In this guide, we will walk through 6 major endpoints that you can use to begin testing in the sandbox. Note that this guide is not exhaustive—the sandbox allows you to test many more endpoints beyond these 6 core examples.

# **What You’ll Learn**

1. Create a card
2. Adjust card balance
3. Subscribe to webhook events
4. Simulate a transaction authorization
5. Simulate a clearing event
6. View a transaction

***

# Authenticate your API request

Include your API key in the header of each request:

```json cURL
"x-reap-api-key": "YOUR_API_KEY"
```

# Select an environment

```json cURL
https://sandbox.api.caas.reap.global
```

# Make API requests using cURL

Example: Retrieve account balance

```json cURL
curl --request GET \
--url https://sandbox.api.caas.reap.global/account/balance \
--header 'Accept-Version: v1.0' \
--header 'accept: application/json'
--header 'x-reap-api-key: YOUR_API_KEY'
```

***

**Related Materials**:

📖 Guide/ [Create a Reap Account and Access the Sandbox Key](https://reap.readme.io/docs/getting-started#/)

⚙️ API Reference/ [Create A Card](https://reap.readme.io/docs/create-a-card)