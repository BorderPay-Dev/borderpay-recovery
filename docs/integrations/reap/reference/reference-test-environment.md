---
updatedAt: 2026-07-14T03:12:19.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Sandbox Environment

### Accessing Sandbox

By using the Reap API test environment, you can ensure that your implementation is functioning correctly before it goes live. This will help you avoid any unexpected issues in the production environment and provide you with a smooth and successful launch.

To get started

```curl curl
"x-reap-api-key": "YOUR_API_KEY"
```

#### Example

```curl
curl --request POST \
     --url https://sandbox.api.caas.reap.global/cards \
     --header 'accept: application/json' \
     --header 'content-type: application/json'
```

Start exploring our [Guides](https://reap.readme.io/docs/getting-started) to find out more and get your API key to your sandbox environment.

**NOTE: Please only use the sandbox base URL in the example above when making these test API calls on our documentation page.**

> 🚧 IP Whitelisting not required for Sandbox environment.

***

**Related Materials:**

⚙️ API Reference/ [API Basics](https://reap.readme.io/reference/api-basics#/)

⚙️ API Reference/ [Rate Limit](https://reap.readme.io/reference/rate-limit#/)