---
updatedAt: 2025-04-23T05:44:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Configuration Checklist 

After you have passed KYB and completed sandbox testing, you can contact your relationship manager to request access to the production environment and retrieve your production API keys.

This checklist outlines the **technical configuration steps** developers should take to ensure the production environment is correctly set up for live testing or for preparing the card program to go live.

> Note: This is not the complete launch checklist for a card program. It does **not** include operational or business readiness tasks. This list only covers the technical setup required after production access is granted.

## **1. Whitelist your IP addresses**

To access the production environment for testing or future live API calls, you must first whitelist your server IP addresses.

<Image align="center" border={false} caption="Upload IP addresses in the **IP Whitelisting** section under **Production Configurations** in the Reap Dashboard." src="https://files.readme.io/1eba700d4fb0bc5df2b1dec37f69a75341223a362c5e24a287cf87c985ac91ee-f89e55b-Screenshot_2024-01-25_at_10.41.33_AM.png" />

Note: The IP address associated with the ReadMe documentation platform is **not** whitelisted and cannot be used to make production calls. Only whitelisted IP addresses are allowed to make production API requests.

## **2. Subscribe to webhooks**

To receive real-time notifications about transaction events, subscribe to webhooks via the API. Use the `POST /webhooks` endpoint to register your webhook URL.

## **3. Upload your public key**

If your card program uses the **Show Card PAN API** to display full card numbers, you must upload your public key.

* Upload your public key in the **Production Configurations** section of the Reap Dashboard.
* This key is used to encrypt sensitive card data returned by the API.
* You must use your private key to decrypt the response on your end.

If your card program is **not PCI compliant**, you must use the `POST /{cardId}/reveal-html` endpoint instead. You can skip this step. For more details, refer to the [Show Card PAN via HTML (iframe)](https://reap.readme.io/docs/card-widget#/) guide.

## **4. Subscribe to the API changelog**

To stay informed about API updates, feature changes, and deprecations:

* Subscribe to the [https://reap.readme.io/changelog.rss](https://www.notion.so/Configuration-checklist-for-developers-before-production-testing-1d57e193475080fbad95ff7932b60ccc?pvs=21).
* Review changelog updates before upgrading your integration.

## **5. Understand API versioning**

Reap’s API uses **header-based versioning** to ensure stability and give you control over when to upgrade.

* Include the Accept-Version header in every API request.

  Example:

```
Accept-Version: v1.0
```

* Your integration will remain on the specified version until you update the header value.
* New versions may introduce breaking changes or updated field structures.

# **Next steps**

* Retrieve your production API keys from the **Settings > API Keys** section in the Reap Dashboard.
* Complete all the technical configurations above before initiating any production traffic—whether for environment testing or going live.
* If you have questions about setup, funding, or overall card program readiness, reach out to your relationship manager. They will support you throughout the launch process.

***

**Related Materials**:

📖 Guide/ [Show Card PAN via HTML (iframe)](https://reap.readme.io/docs/card-widget#/)

📖 Guide/ [Show Card PAN](https://reap.readme.io/docs/show-card-pan#/)

⚙️ API Reference/ [Subscribe To Webhook](https://reap.readme.io/reference/post_webhooks#/)

💻 Webpage/ [Reap Card Issuing Dashboard ](https://dashboard.reap.global/dashboard/home)

💻 Webpage/ [Card Issuing Solution Changelog](https://reap.readme.io/changelog#/)