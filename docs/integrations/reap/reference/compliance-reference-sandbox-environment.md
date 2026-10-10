---
updatedAt: 2026-06-09T14:14:20.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Sandbox Environment

Reap KYCaaS provides a dedicated **sandbox environment** for testing your integration before going live. This environment allows you to simulate entity onboarding, KYC verification, requirement submissions, and webhook testing without affecting production data.  Using the sandbox helps ensure your implementation is correct, stable, and production-ready—while minimizing surprises at launch.

## 🔐 To Get Started

Make a simple API request using your **sandbox API key**:

**Required header:**

```http
x-reap-api-key: YOUR_API_KEY
```

***

### 📦 Example: List Features (Sandbox)

```bash
curl --request GET \
     --url https://sandbox-compliance.api.reap.global/features \
     --header 'x-reap-api-key: YOUR_API_KEY' \
     --header 'Accept-Version: v1.0' \
     --header 'accept: application/json'
```

You should receive a list of all features available to your sandbox account.

***

> ⚠️ **Note:** Always use the base URL `https://sandbox-compliance.api.reap.global` for all test API calls in this environment. This ensures you're not interacting with live production data.

***

## ✅ No IP Whitelisting Required

IP whitelisting is not required for the Reap Compliance API. You can access both sandbox and production environments without IP allowlisting.

Ensure that your API credentials are kept secure and only used by authorized systems.