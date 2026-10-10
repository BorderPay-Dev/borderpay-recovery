---
updatedAt: 2025-03-24T04:00:31.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Show Card PAN via HTML (iframe)

Securely reveal card details in an iFrame with short-lived access URLs and optional encryption.

This guide explains how to securely display a card’s Primary Account Number (PAN), expiration date, and CVV using an iFrame solution (Secure Card Information Display Widget). The rendering is interactive—users can click on the card details to copy them to the clipboard. The UI is fully customizable to match your branding.

# **Overview of the Implementation Steps**

1. **Embed an iFrame** in your application to securely display card data.
2. **Host a custom CSS stylesheet** at a publicly accessible URL to define card UI styling.
3. **Generate a signed access URL** via the API endpoint.
4. **Load the signed URL dynamically** inside the iFrame to securely display the card details.

***

## **Step 1: Embed an iFrame to Display Card Data**

To securely display sensitive card data, **embed an`<iframe>` in your web or mobile app**. This iFrame will dynamically load a card’s **PAN, expiration date, and CVV** via an API request.

### **Example: Adding an iFrame to your webpage**

```html
<iframe
    id="card-data-iframe"
    src=""  <!-- The secure URL will be set dynamically -->
    frameborder="0"
    width="100%"
    height="250px">
</iframe>

```

## **Step 2: Create and Host a Custom CSS Stylesheet**

To customize the card UI, **create a CSS file** and **host it at a publicly accessible URL**. This stylesheet will define how the card data appears inside the iFrame.

### **Example:**

**Skeleton HTML**

```html
<div id="card-data">
  <div id="pan-div">
      <p id="pan-p">
          Card number: <span id="pan-value">1234 4567 1234 4161</span>
      </p>
  </div>
  <div id="expiry-div">
      <p id="expiry-p">
          Expiry date: <span id="expiry-value">02/28</span>
      </p>
  </div>
  <div id="cvv-div">
      <p id="cvv-p">
          CVV: <span id="cvv-value">001</span>
      </p>
  </div>
</div>

```

**Custom CSS** (`styles.css`)

```css
/* ===== Card Data Container ===== */
#card-data {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 15px;
    width: 300px;
    text-align: center;
    box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
}

/* ===== PAN (Card Number) Section ===== */
#pan-div, #expiry-div, #cvv-div {
    margin-bottom: 10px;
}

#pan-value, #expiry-value, #cvv-value {
    font-size: 18px;
    font-weight: bold;
    color: #222;
    padding: 5px;
    border-radius: 5px;
    background: #e9ecef;
    cursor: pointer;
}
}
```

**Hosting the Stylesheet:**

* Upload `styles.css` to your **server** or a **cloud storage provider.**
* Ensure the stylesheet is **publicly accessible** (e.g., `https://yourdomain.com/styles.css`).

## **Step 3: Generate a Signed URL for the iFrame**

To load the iFrame securely, **request a signed access URL** by calling the [`POST /cards/{cardId}/reveal-html`](https://reap.readme.io/reference/post_cards-cardid-reveal-html#/)  API endpoint.

> Note: The `publicKey` field is optional. If provided, the accessUrl will be encrypted for enhanced security. Read more about `publicKey` and `accessUrl` [here](https://reap.readme.io/docs/card-widget#encrypting-your-accessurl).

**Request Body Example**

```json
{
  "stylesheetUrl": "https://yourdomain.com/styles.css",
  "copyPan": true,
  "publicKey":<string>
}

```

**Response Example**

```json
{
  "accessUrl": "https://secure.reap.com/card-display?token=abc123"
}
```

**The`accessUrl` expires in 60 seconds**, ensuring security.

**`publicKey`is optional, if provided the returned`accessUrl` will be in encrypted format.**

***

# Encrypting your `accessUrl`

For enhanced security, encrypt the `accessUrl` so that only verified cardholders can decrypt it. This is done by providing a `publicKey` in the request body.

## Encryption Steps

1. Generate an RSA Public/Private Key Pair. Use this [tool](https://8gwifi.org/RSAFunctionality?keysize=4096)  with the following options:
   * Key size: 4096-bit
   * RSA cipher: RSA/NONE/OAEPWithSHA1AndMGF1Padding
2. Encrypt the `accessUrl` using the generated public key.
3. Base64 encode the encrypted message before including the `publicKey` in the request body.

## Decrypting your `accessUrl`

When a `publicKey` is provided in the request body, the `accessUrl` will be Base64 encoded and RSA encrypted. To decrypt:

1. Base64 Decode the message.
2. Decrypt using your private key.

> 🚧 Security Reminder
>
> Never expose your private key in client-side code, logs, or version control. Store it securely and restrict access to authorized systems only.

***

# Security Considerations

1. **Compliance Consideration**:

   If you are using this method to display sensitive card information due to the lack of <Glossary>PCI Compliant</Glossary> certification, you must not store any card data on your server, as this would violate compliance policies.
2. **Short-Lived Access URL**:

   The signed URL is valid only for 60 seconds, ensuring it cannot be reused.
3. **Optional Encryption**:
   * If enhanced security is needed, provide a `publicKey` in the request.
   * The response will return an encrypted `accessUrl`.
   * The cardholder must decrypt the URL using their private key before accessing it.

***

**Related Materials:**

⚙️ API Reference/ [Show Card PAN](https://reap.readme.io/update/refs/post_cards-cardid-reveal)

⚙️ API Reference/ [Show Card PAN- HTML](https://reap.readme.io/update/refs/post_cards-cardid-reveal-html)

📖 Guide/ [Show Card PAN](https://reap.readme.io/update/docs/show-card-pan)

📖 Guide/ [Show Card PAN via HTML (iFrame)](https://reap.readme.io/update/docs/card-widget)