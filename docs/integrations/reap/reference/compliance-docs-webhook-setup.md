---
updatedAt: 2026-09-16T11:26:35.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Webhook Setup 

Configures asynchronous notification delivery from Reap's Compliance API to the integrator's backend by registering a webhook subscription, managing the subscription lifecycle, and verifying signed payloads using Reap's RSA public key.

Register an HTTPS endpoint to receive Reap's KYC decisions, and verify that each delivery came from Reap.

Reap's verification decision is delivered by webhook and is not retrievable from any other endpoint. Registering an endpoint is a prerequisite for KYCaaS, Verified Token Sharing, Universal KYC and Universal KYB.<br /><br />For what the events contain and how to act on them, see [Card Issuance KYC API Access Webhook](https://reap-ra.readme.io/v2.0.6/update/docs/card-issuance-kyc-api-access-webhook) or[ Universal KYB](https://reap-ra.readme.io/docs/universal-kyb#decisions-and-webhooks).

***

# Quick Start

## Register a Webhook Subscription

Register an HTTPS endpoint with Reap's Compliance API to begin receiving asynchronous event notifications for the subscribed event types.

Use [POST /notification](https://reap-ra.readme.io/reference/post_notification) to register the webhook URL and subscribe it to one or more notification event types.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/notification \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "webhookUrl": "https://your-domain.com/webhooks/reap",
    "notificationChannel": "WEBHOOK",
    "notificationTypes": ["account_status_change"]
  }'
```

### Sample Request (JavaScript / Node.js)

```jsx
const url = 'https://sandbox-compliance.api.reap.global/notification';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-reap-api-key': '********',
  },
  body: JSON.stringify({
    webhookUrl: 'https://your-domain.com/webhooks/reap',
    notificationChannel: 'WEBHOOK',
    notificationTypes: ['account_status_change'],
  }),
};
 
fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));
```

### Key Input

| Parameter Name      | Type            | Description                                                                                             |
| :------------------ | :-------------- | :------------------------------------------------------------------------------------------------------ |
| `notificationTypes` | array of string | List of notification event types to subscribe to (e.g. `account_status_change` or `kyb_status_change` ) |

<br />

### Sample Response

```json Response Status 200
{
  "id": "notification-id-123",
  "channel": "WEBHOOK",
  "types": ["account_status_change"],
  "config": {
    "webhook": {
      "url": "https://your-domain.com/webhooks/reap"
    }
  },
  "createdAt": "2024-03-20T10:00:00Z"
}
```

### Key Output

| Parameter Name       | Type            | Description                                                                                                            |
| :------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `id`                 | string          | Unique identifier for the registered webhook subscription. Used as `notificationId` in all subsequent management calls |
| `channel`            | string          | Notification delivery channel configured for the subscription (e.g. `WEBHOOK`)                                         |
| `types`              | array of string | List of notification event types subscribed to                                                                         |
| `config`             | object          | Configuration details for the notification channel                                                                     |
| `config.webhook.url` | string          | Webhook endpoint URL where notification events will be delivered                                                       |
| `createdAt`          | string          | Timestamp indicating when the notification subscription was created (Format: ISO 8601)                                 |

Then:

* Verify the signature on every delivery — see Verifying Deliveries
* Return 200 OK within 5 seconds, before doing any processing.
* Validate in sandbox before registering the production endpoint. Sandbox and production have separate API keys and separate signing keys.

***

# Endpoint Requirements

The webhook endpoint registered with Reap must comply with the following requirements.

| Requirement   | Detail                                                                              |
| :------------ | :---------------------------------------------------------------------------------- |
| Protocol      | HTTPS, with a valid TLS certificate                                                 |
| Response      | 200 OK within 5 seconds. The response body is ignored                               |
| Retries       | Failed deliveries are retried with exponential backoff                              |
| Duplicates    | Retries can redeliver an event. Deduplicate on data.eventId                         |
| Ordering      | Delivery order is not guaranteed. Treat each event as a state assertion, not a step |
| Subscriptions | Up to 10 webhook configurations per business                                        |
| Event types   | account\_status\_change                                                             |

***

## Verifying Deliveries

Every request carries an RSA-SHA512 signature in the reap-signature header.

| Property         | Value                                   |
| :--------------- | :-------------------------------------- |
| Algorithm        | RSA-SHA512                              |
| Signature header | `reap-signature`                        |
| Signed content   | Raw JSON request body delivered by Reap |
| Encoding         | Base64-encoded signature value          |

<br />

### Public Keys for Signature Validation

Use the public key matching the environment from which the webhook is delivered.

**Public Key (**&#x76;alid till 30 Sep 202&#x36;**)**

```text Production
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5JUURpniA359qJLwB9JW
6tFAhc4ChqBiGSBaFTkgmK/XCrV8e/N7q57qq4DwymDk5+ALw8D6cKeG2QkWPDeB
n3ly96sR14+8+2GfS7z82A194V9xEpZQfjF6DeMhidFjhINAAzJHPDiM7QCk9Dh4
/Ny065vzZb0O3ek9Ivs6sbmOKXa/pGACN3k30XLkPu2XxBfeZN1rCFhdwE/wa7Bf
h5AKiA104ais19ct5uf4vNkjG5DwevFK9WiqRVxwzadOyXCk4AdksdFx8ZkOuYWh
rCdIt3Dc+pErfKIHloJ7kqA/8kiWWOP6fWbSSWrEtpLX5ieVsXnqhOYq8xA5WvEo
HwIDAQAB
-----END PUBLIC KEY-----
```
```text Sandbox
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsI0a/jqvSM6Z9gTLVMpD
4hLZ0n1WWuSNMwkqNH8s+E6tnBXx6nETgAJKwjdUagwgkySI74rwkCvPqVE0sm9c
iD8oi7XM+X8ybTET8fmVVG5sr12hJX5jQjjBUXzIuuqx5NJt7lFyo2yNrNzCSzuD
AhEa22Gkw43WWZoAVkNXlrfiyprKMfpjf7S4LUsRI/Y6MGyYmfm1olzYksymcaU+
2edfxoB2qZmezyEJM6CPkL2zt8UnnoS+kf/rbmHk+aKf8DW8v+XjeyQSxuclRZi/
IS589AACMygPvsO9KYzMoxmxNLrDcDnlo8+IKHQwE1RLoGC+EzJ0lDxWOEFZMRiE
xwIDAQAB
-----END PUBLIC KEY-----
```

**New public keys (valid from 1 Oct 2026 onwards):**

```text Production
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAs4OHtO2bxgATTDAblGVP
5hh42j8B2tPiLGr+R02R8nXPJKo6MwknpS5pgZbqYO+XAf2aigBnGFPyyelhjnNT
YzK2oUON191mloJJdf0eteCNemB8OOeBlrlSLeQTykTGGDkBMMUvXPMwhyCiv2ww
36+QB0YWVh5BbzYJl8yrEfd6bey1VB8SVUBovcBzNGKRBWveDNie+PirKddWlWci
LkkpfmVRH3xdZu3RfE1SwngTemfpKcKy/e2U3He6OcWf9salAh5GiPmBEbip5wxW
ZKKvGOCuP4PKlzO+MwOBxSDkPN/xARdpm3DozHgfgKG2ST0SSRy6iepbiahegiqt
+DN85ipA7a8Ky9JU4bYMhiBucrPwyg4c2hx3AJrfbLFv+RnY3iWmfQuBWbMnqUFw
ioSiUEKv8mZq7z7qoykUhIsL9Vbe4saPo0V+g9wQUdaqz14UwD2wWImQV7IcTI+V
MKcFrPnBXCRiaUfWyQkfTEdsKtLxr7EmZiKt5uUrrPFGctmiqI7leTyCMZktSZls
nsQKc75fejm8+1Fs0E0u3iZmNaLbxJJ4VJ0DFaYwvkzc60RZ+F9U088zKV2Gmg48
hcB53D8qydttq1mrktymfv+WOy6yUHV13zEUCgvjhBhEwOVgA6r51usafbJXe+Is
98usg5dfUPAXgfcvraxHQ+cCAwEAAQ==
-----END PUBLIC KEY-----
```
```text Sandbox
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxQuT+5FedgTfMVyJEWuY
JM6YaoYC06ZU/Pgp0RIWefbyZuG1vBbwol2bxt/hfyMfBroz+ErSvPcVV0qB8vGU
189cPG3HwrtHk2xDDKbB178cHAseCZNkv0UhdZbndnbg4Aih6Hc5RZvV9P8e6GUa
o6WkMDtw6CqQCHWhKRAqzb3Ev3aseXBPLcko2vhyieRC+lJ85OMPL90dbhERjcLN
elcgMucivxMThB4/VVhCDg79kZfseIBXBmxHn86OASPUKPluoAXCVjsy0g5OfwbP
cAJ2TlzBh4Rr+zof5ROfnfYjhdAJXnhOlArcY2JXBhqVldJC+TLabGCHmHeCg3O+
+jobpQN/1E/GfIZZLaSHhwjQP2qDj1pTpnhiEcsR3tV1gBvLpq2nG1PRKutg+MLx
GmSmUF1LvDiMxGgojTTrsdve5Fdkf9VIK5kIqAXgk3DwqWdkjJnD0JLSY4N2wbEB
ytGOkdpc+POxBeT/eWRlrU40X5grPZeGEbNRLrI8+ezpHlhYYbt7vI4M/0ZM9qF8
Y1sGEF2ma1BfjipXgrFLqQtgf/Vn/m2Wr/zndWKk+YLWzzAqTK8wr0rHlwS8dib6
SB/nYiXhoGpxHwRI7PEM5eb/aAmI6rEWuxOg//vSGpPAvTb8vdDw6LSsPOrXZTcL
sIlY4esD2zcFgNUttt3nfskCAwEAAQ==
-----END PUBLIC KEY-----
```

### Sample Verification Implementation (Node.js)

```jsx
const crypto = require('crypto');
 
function verifyWebhookSignature(payload, signature, publicKey) {
  const verifier = crypto.createVerify('RSA-SHA512');
  verifier.update(JSON.stringify(payload));
  verifier.end();
 
  return verifier.verify(publicKey, signature, 'base64');
}
 
// Webhook handler
app.post('/webhooks/reap', (req, res) => {
  const signature = req.headers['reap-signature'];
  const publicKey = getPublicKeyForEnvironment(); // sandbox or production
 
  if (!verifyWebhookSignature(req.body, signature, publicKey)) {
    return res.status(401).send('Invalid signature');
  }
 
  // Process the verified event
  console.log('Webhook verified successfully');
  res.status(200).send('OK');
});
 
function getPublicKeyForEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5JUURpniA359qJLwB9JW
6tFAhc4ChqBiGSBaFTkgmK/XCrV8e/N7q57qq4DwymDk5+ALw8D6cKeG2QkWPDeB
n3ly96sR14+8+2GfS7z82A194V9xEpZQfjF6DeMhidFjhINAAzJHPDiM7QCk9Dh4
/Ny065vzZb0O3ek9Ivs6sbmOKXa/pGACN3k30XLkPu2XxBfeZN1rCFhdwE/wa7Bf
h5AKiA104ais19ct5uf4vNkjG5DwevFK9WiqRVxwzadOyXCk4AdksdFx8ZkOuYWh
rCdIt3Dc+pErfKIHloJ7kqA/8kiWWOP6fWbSSWrEtpLX5ieVsXnqhOYq8xA5WvEo
HwIDAQAB
-----END PUBLIC KEY-----`;
  }
  return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsI0a/jqvSM6Z9gTLVMpD
4hLZ0n1WWuSNMwkqNH8s+E6tnBXx6nETgAJKwjdUagwgkySI74rwkCvPqVE0sm9c
iD8oi7XM+X8ybTET8fmVVG5sr12hJX5jQjjBUXzIuuqx5NJt7lFyo2yNrNzCSzuD
AhEa22Gkw43WWZoAVkNXlrfiyprKMfpjf7S4LUsRI/Y6MGyYmfm1olzYksymcaU+
2edfxoB2qZmezyEJM6CPkL2zt8UnnoS+kf/rbmHk+aKf8DW8v+XjeyQSxuclRZi/
IS589AACMygPvsO9KYzMoxmxNLrDcDnlo8+IKHQwE1RLoGC+EzJ0lDxWOEFZMRiE
xwIDAQAB
-----END PUBLIC KEY-----`;
}
```

<br />

### Sample Verification Implementation (Python)

```python
import json
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
 
def verify_webhook_signature(payload, signature, public_key_pem):
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode())
        signature_bytes = base64.b64decode(signature)
 
        public_key.verify(
            signature_bytes,
            json.dumps(payload, separators=(',', ':')).encode(),
            padding.PKCS1v15(),
            hashes.SHA512()
        )
        return True
    except Exception:
        return False
 
# Flask webhook handler
@app.route('/webhooks/reap', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('reap-signature')
    public_key = get_public_key_for_environment()
 
    if not verify_webhook_signature(request.json, signature, public_key):
        return 'Invalid signature', 401
 
    # Process the verified event
    print('Webhook verified successfully')
    return 'OK', 200
```

<Callout icon="⚠️" theme="warn">
  Verify against the **raw request body**, not a parsed-and-re-serialised object. Re-serialising changes key order and whitespace, and verification will fail.
</Callout>

***

# Managing Subscriptions

All endpoints are scoped to the business behind the API key.

| Action   | Endpoint                       | Method | Notes                                                       |
| -------- | ------------------------------ | ------ | :---------------------------------------------------------- |
| Register | `/notification`                | POST   | Returns the notificationId                                  |
| List     | `/notification`                | GET    | Paginated via page and limit                                |
| Get      | `/notification/notificationId` | GET    | Returns a single configuration                              |
| Update   | `/notification/notificationId` | PUT    | Same body as register. Changes URL, channel, or event types |
| Delete   | `/notification/notificationId` | DELETE | Returns 204. Delivery stops immediately                     |

All four read and write the same object:

| **Field**          | **Type**        | **Description**                             |
| ------------------ | --------------- | ------------------------------------------- |
| id                 | string          | The notificationId used in management calls |
| channel            | string          | Delivery channel, WEBHOOK                   |
| types              | array of string | Subscribed event types                      |
| config.webhook.url | string          | Destination URL                             |
| createdAt          | string          | ISO 8601 creation timestamp                 |

Full request and response schemas are on the [API Reference](https://reap-ra.readme.io/reference/post_notification).

***

# Environments&#x20;

API keys are generated in the Reap Dashboard at Settings → Product Settings → KYC API Keys. Subscriptions, keys, and signing keys are all environment-specific — register separately in each.

| Environment | Base URL                                     | Authentication Header                  |
| :---------- | :------------------------------------------- | :------------------------------------- |
| Sandbox     | `https://sandbox-compliance.api.reap.global` | `x-reap-api-key: <sandbox-api-key>`    |
| Production  | `https://compliance.api.reap.global`         | `x-reap-api-key: <production-api-key>` |

<Callout icon="ℹ️" theme="info">
  Use the sandbox API key and base URL throughout the integration and switch to the production API key and base URL only after the webhook integration has been validated end to end.
</Callout>

***

# Troubleshooting

| Error                             | Cause                                                            | Resolution                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| No events arriving                | Endpoint unreachable, or wrong event type subscribed             | Confirm public HTTPS reachability and that types includes account\_status\_change                                      |
| Signature verification fails      | Payload re-serialised before verifying, or wrong environment key | Verify against the raw body with the matching environment key                                                          |
| Events arriving twice             | Handler exceeded 5 seconds and the delivery was retried          | Acknowledge before processing; deduplicate on data.eventId                                                             |
| 401 on /notification              | Missing or wrong-environment API key                             | Check x-reap-api-key                                                                                                   |
| Registration rejected             | Already at 10 configurations                                     | Delete an unused one first                                                                                             |
| Expected an event that never came | The event may not be emitted for that method                     | See the per-method table in the [event reference](https://reap-ra.readme.io/docs/card-issuance-kyc-api-access-webhook) |

<br />

### Security Best Practices

1. Always verify the signature before processing webhook data
2. Use HTTPS for the webhook endpoint and present a valid TLS certificate
3. Validate the structure and content of every incoming payload
4. Log every webhook event for debugging and audit purposes
5. Implement idempotency at the consumer to safely handle duplicate deliveries from retries
6. Secure the API keys used for subscription management and rotate them regularly

***

# Testing Your Webhook

Validate the webhook integration end to end in the sandbox environment before enabling delivery in production.

### Webhook Endpoint Validation

The webhook endpoint must:

* Be reachable from the public internet via HTTPS
* Return `200 OK` for valid `POST` requests
* Handle JSON request payloads correctly
* Respond within 5 seconds
* Implement RSA-SHA512 signature verification using the sandbox public key

<br />

### Sample Test Endpoint

```jsx
// Simple test endpoint
app.post('/webhooks/reap', (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);
 
  // Always verify the signature in production
  const signature = req.headers['reap-signature'];
  if (signature && !verifyWebhookSignature(req.body, signature, publicKey)) {
    return res.status(401).send('Invalid signature');
  }
 
  res.status(200).send('OK');
});
```

<br />

### Testing Checklist

* [ ] Webhook URL is reachable over HTTPS from the public internet
* [ ] Endpoint returns `200 OK` for valid `POST` requests within 5 seconds
* [ ] Signature verification is implemented using the environment-specific public key
* [ ] Error handling rejects requests with an invalid or missing signature
* [ ] Logging is configured for incoming requests and verification outcomes
* [ ] Webhook registration via `POST /notification` returned a successful response

<br />

***

# Support

<Callout icon="📘" theme="info">
  Contact your **Reap Implementation Manager** for webhook setup, signature, or delivery issues. Include the webhook URL, the `notificationId`, the environment, and any `eventId` values involved.
</Callout>