---
updatedAt: 2026-06-03T03:59:17.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Webhooks

An overview of the Card Issuing Program webhook and how to subscribe to it.

Reap's webhooks provide real-time event notifications for your card program, allowing you to stay informed about critical activities and automate workflows. By integrating with our webhooks, you can receive instant updates on events such as authorization requests, transaction events, fund transfers, card status changes, and more.

To ensure seamless operations, you must subscribe your server to receive webhook notifications from Reap.

# Webhook Events Types

| Webhook `eventType` | Description                                                                                                                                                                                                                                                                                                                                                                                                                      | Configuration Requirements                                                                                                                                                                                           | Remarks                                                                                                |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `account`           | Triggered when Reap receives a fund-in, increasing the program’s credit limit.                                                                                                                                                                                                                                                                                                                                                   | Funding model: <Glossary>Card Program Owner Managed Funding Model</Glossary>                                                                                                                                         |                                                                                                        |
| `authorization`     | Triggered when a transaction authorization is received, pending the approval of the card program owner to proceed or decline the transaction.                                                                                                                                                                                                                                                                                    | Authorization model: <Glossary>Real-Time Authorization</Glossary>                                                                                                                                                    | Card program owners must send the authorization decision back to Reap's server within **1.6 seconds**. |
| `card`              | Triggered when a card’s status changes to `BLOCKED` or `SANCTION_CHECK_FAILED` due to security reasons, sanction check, or system rules.                                                                                                                                                                                                                                                                                         |                                                                                                                                                                                                                      | Only triggered when Reap’s system blocks  the card.                                                    |
| `crypto_wallet`     | Triggered by the following events: (1) Top-up Wallet: Reap receives a fund-in from a cardholder. (2) Withdrawal to External Wallet: Reap processes a withdrawal request, transferring a cardholder’s balance to an external wallet assigned.                                                                                                                                                                                     | Funding model: <Glossary>Cardholder Managed Funding Model</Glossary>                                                                                                                                                 |                                                                                                        |
| `files`             | Triggered after you request a file using the [`GET /files/{fileType}`](https://reap.readme.io/reference/get_files-filetype#/)  endpoint.                                                                                                                                                                                                                                                                                         |                                                                                                                                                                                                                      | The webhook is triggered after the endpoint is called, and the link is valid for **5 minutes**.        |
| `fraud`             | Triggered when a transaction is flagged as potentially fraudulent by Fraud Monitoring tool, or when a card is blocked or unblocked as the result of fraud confirmation call (either when [responding to fraud alert ](https://reap.readme.io/v2.0/reference/put_fraud-alert-fraudalertid-respond)or when [reporting fraudulent transaction](https://reap.readme.io/v2.0/reference/post_transactions-transactionid-fraud-alert)). |                                                                                                                                                                                                                      |                                                                                                        |
| `dispute`           | Triggered when there is a status update to the dispute that was raised through Dispute API or through Docusign Web Form.                                                                                                                                                                                                                                                                                                         |                                                                                                                                                                                                                      |                                                                                                        |
| `notification`      | Triggered when: (1) A cardholder initiates a 3D Secure (3DS) transaction. (2) A cardholder tokenizes a virtual card and chooses OTP via **SMS**.                                                                                                                                                                                                                                                                                 | (1) Applies only to card programs that opt into [3DS forwarding](https://reap.readme.io/docs/3ds-forwarding-1#/) feature. (2) Applies only when the cardholder chooses **SMS** as the preferred verification method. |                                                                                                        |
| `shipping`          | Triggered when the physical card shipment is confirmed by Reap’s logistics partner.                                                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                                                      |                                                                                                        |
| `transaction`       | Triggered when a transaction event occurs, such as authorization, clearing, or refund.                                                                                                                                                                                                                                                                                                                                           |                                                                                                                                                                                                                      |                                                                                                        |

# Connecting To Webhooks

To subscribe to webhook notifications, use [`POST /webhooks`](https://reap.readme.io/reference/post_webhooks#/)  end point.

> 📘 Subsequent Requests Will Override Previous Subscriptions
>
> Reap maintains only the latest subscription and tracks a single endpoint per client for webhook event delivery. Please note that Reap’s system will send webhooks only to the most recently subscribed server URL, as specified in the latest [`POST /webhooks`](https://reap.readme.io/reference/post_webhooks#/)  request.

***

# Webhook Security: Reap Digital Signature Verification

Since webhooks contain sensitive cardholder and payment data, Reap enforces strict security protocols to ensure their integrity and authenticity.

### Webhook Headers & Payload

Below is an example of a webhook request header:

```json
{
  "accept-language": "*",
  "content-length": "778",
  "content-type": "application/json",
  "newrelic": "eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkFwcCIsImFjIjoiMjg2MTAyNSIsImFwIjoiMTA1ODc1MTk5MyIsInR4IjoiMzg4MGIxOGNkMDFkM2JiYSIsInRyIjoiYWM5Zjg2N2FkZjRjNTg4ZjAyOTI1YmY0ZGI1N2ZiOTYiLCJwciI6MC44OTU1MDUsInNhIjpmYWxzZSwidGkiOjE3Mzc2MTkyODY4MjJ9fQ==",
  "reap-signature": "timestamp=1737619286792;signature=MdudN2H16agsPeqLW8l2885mVKb4hVrF6DvljJFBVX/AAHhSlJ6dRTu+T2bZHLRF+f92zZKnGlaburAc2/G4+STXkvfAoSghvq/Gyb0QyPgLxwQ9JENSCA0xS9SEmicF3O1rHanpvo1CzTlwPXqb9awxXK5XtvA4PKGRPuODNCNB9+37yEEQr5FNP5RQz5+fpsbFTlx8tvTPR1rQ9w0DQA9kbWBoonVgvb6trYKoORWQUHZlFXTVaIiIBbHN5zryBpUXJWRSmU+xLnWimSISoaCTIDx3UNUXs8Ta2HrrUl3TougzSh4Jc7RzVttT5DLdfCiedz8lLQu9xF5FIYme0w==",
  "sec-fetch-mode": "cors",
  "tracestate": "2861025@nr=0-0-2861025-1058751993-90b25fafabdd3025-3880b18cd01d3bba-0-0.895505-1737619286822",
  "user-agent": "node",
  "x-reap-trace-id": "6d8c163c-bd05-4a47-86f7-0106fcfc6c6d"
}
```

## Reap implements the following security measures:

1. **Timestamp Validation to Prevent Replay Attacks**
   * Each webhook request includes a **timestamp** in the signature.
   * Servers should verify the timestamp and reject requests **older than 5 minutes** to prevent replay attacks.
   ```json
   "reap-signature": "timestamp=1737619286792;signature=..."
   ```
2. **Webhook Authentication via Digital Signature Verification**
   * Webhook requests are signed using **RSA-SHA3-256**.
   * The client must verify the signature using Reap’s **public key**.
3. **Idempotency Support with`x-reap-traceid` Header**:

   To prevent processing the same webhook event multiple times, Reap includes an HTTP Header with each webhook request: `x-reap-traceid`. This Trace ID remains consistent across retry attempts for the same webhook message and can be used to implement idempotent processing on your server.

***

## Verifying A Digital Signature

```javascript
const crypto = require('crypto');

// Example Reap-Signature Header: `timestamp=123456;signature=abcdefg`
let verifier = crypto.createVerify('RSA-SHA3-256');
const publicKey = ''; // Public key provided by Reap (check the keys below)
verifier.update(
  JSON.stringify({...body, timestamp: 123456 }) // The data to be verified
);
const result = verifier.verify(
  publicKey, // The public key to check the signature
  'abcdefg', // The received signature
  'base64' // Signature encoding format
);
console.log(result); // true means the signature is valid
```

## Reap's Public Keys

**Sandbox Public Keys:**

```text text
-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQBKh0Ow2ADYAz8yXjNaez++
PZnyGmYx0enkvZlMbDgcSfO4Z7921Fx5NZ1k513nSI7rP9Lgp1weKQwnaDrALHaj
HGCzTThC70ElW9eO3QVhAQ930dflhz0k9xsIrdFpqlFFQTRGZ8Ylzj+2rlBWYAsN
OegW8BQq7JLRNQX9Fi55ENpNVxwQsNKtLRdzKYAlJ3G0W7R0po5lh4DxuFnQ/ngE
ARKvI8y4cty4mXi7j+pS3AJekmZwMefzyLCY97T/pWdqVOVzOl7BhUNynQfZvHcG
rt6faSAMbK4mvljfxoAkEIsxL5t2xzR+AWHBeeF0GdGHCdpyfKUyJm8oq1FIuqZZ
AgMBAAE=
-----END PUBLIC KEY-----
```

**Production Public Keys:**

```text
-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB1KCqLRzqeRMpOh//gll08
/Xmoh1r8suUszvC3H1dG2mz/cEos3jG0AI+67ba5D1bSpIJCfOaHCPNAFqZiKaSR
X9QiWlnTqgyt45MUS5dZtRE4DA/pmzHa2NEW0yXeheycSbT4Yurw804ofB4wTVwk
PEF0+9bdBB544ZGxZegiGC9NQTrfqLiCO8fCHWsPbKYix97k0gfFl0NHhX+UB1pL
g5MPVk255mr7+63ymgc42ryhtx0f+aZALISdl/tfH7f35h4dE7kPJlGv6e7bgKVA
HIFB9sfcWUs70/Cpa5rN0u4P14NHRZWHY/Lhv3uJEm6owr1WKA3nAQTHKdshcFar
AgMBAAE=
-----END PUBLIC KEY-----
```

<br />

# Webhook Delivery and Retry Behavior

To confirm the receipt of a webhook, your server must return an [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) in the 2xx range (such as `200 OK`). Any other status code—including 3xx, 4xx, or 5xx responses—will be treated as a failed delivery.

If Reap does not receive a 2xx response, the system will retry delivery up to **20 times** using an exponential backoff strategy.

> 🚧 Special case: authorization event
>
> Webhook events of type `authorization` are not retried if delivery fails. However, these events will still be marked as `FAILED` in Reap’s system for audit and monitoring purposes.