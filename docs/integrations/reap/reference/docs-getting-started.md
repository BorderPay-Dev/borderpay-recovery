---
updatedAt: 2026-08-01T04:15:57.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Getting Started 

Walks a new user through signing in to Reap, opening the Card Issuing dashboard, and completing the developer setup that powers an integration. Covers webhooks, delivery logs, API keys, IP whitelisting, the public key, and KYC API keys. All setup is done through the CaaS Dashboard.

**Purpose**: Help new users sign in, reach the Developer tab in the CaaS Dashboard, and complete the initial configuration needed to authenticate, receive events, and call the Card Issuing APIs.

***

# When to Use This

Use this guide to:

* Sign in to Reap and open the Card Issuing dashboard for the first time
* Find where developer configuration lives inside the CaaS Dashboard
* Configure a webhook to receive real time event notifications
* Monitor webhook delivery logs and retry failed events
* Decide between Standard Authorization and Real-Time Authorization before generating keys
* Generate Sandbox or Production API keys with the right permissions
* Whitelist the server IP addresses that will call the Reap APIs
* Upload the public key used by the `/reveal` endpoint
* Generate KYC API keys for identity verification flows

***

# Overview

The CaaS Dashboard is the starting point for every Card Issuing integration. After signing in and selecting the Card Issuing product, all developer configuration lives in one place under Account settings → Developer. That single tab covers webhook configuration, delivery log monitoring, API key generation, IP whitelisting, public key management for the `/reveal` endpoint, and KYC API key generation.

<br />

Each section can be completed independently and changes take effect immediately. A new integration can move from first sign in to a working Sandbox setup in a few minutes.

***

# Prerequisites

1. A registered Reap account, created in advance or through the Sign up for free link on the sign in page
2. Access to the CaaS Dashboard with permission to view the Developer tab
3. A decision between Standard Authorization and Real-Time Authorization for the integration
4. A publicly reachable destination URL if a webhook will be configured
5. The IP addresses of every server that will call the Reap APIs
6. A public key in plaintext format if the integration will use the `/reveal` endpoint

***

# Key Concepts

## CaaS Dashboard

The web interface for the Card Issuing service. Every setting covered in this guide lives under Account settings → Developer.

## Business ID

A unique identifier for the business. The value appears at the top of the Settings page with a copy icon and can also be copied through Copy business ID in the profile menu.

## Webhook

A destination URL that receives real time event notifications from Reap. Every delivery attempt is recorded in the webhook delivery logs where failed events can be retried.

## API Key

A credential that authenticates requests to the Card Issuing APIs. Each key belongs to one environment and carries the permissions selected at generation.

### Available Environments

| Value        | Description                                     | Typical Use Case                      |
| :----------- | :---------------------------------------------- | :------------------------------------ |
| `Sandbox`    | A test environment for building the integration | Development and integration testing   |
| `Production` | The live environment                            | Real traffic once testing is complete |

### Available Permissions

| Value       | Description                      | Typical Use Case                      |
| :---------- | :------------------------------- | :------------------------------------ |
| `Read All`  | Grants read access to resources  | Reporting and monitoring integrations |
| `Write All` | Grants write access to resources | Card issuance and management flows    |

## Authorization Model

The model that determines which system holds the authoritative card balance when an authorization request arrives. The model is selected once per account and applies to all sandbox testing on that account.

### Available Models

| Value                     | Description                                                                                                                                                                                             | Typical Use Case                             |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------- |
| `Standard Authorization`  | Reap acts as the authoritative source for card balances, evaluating the `availableCredit` of each card to determine whether to approve or decline incoming authorization requests                       | Programs that let Reap manage card balances  |
| `Real-Time Authorization` | The card program owner maintains the authoritative record of card balances and approves or declines transactions based on balance availability, responding within 1.6 seconds for successful processing | Programs that maintain an independent ledger |

## IP Whitelisting

A list of approved server addresses. Only whitelisted IP addresses can call the Reap APIs, so every server in the infrastructure needs an entry.

## Public Key

An optional key used by the `/reveal` endpoint. The key must be supplied in plaintext format with the BEGIN PUBLIC KEY and END PUBLIC KEY lines included.

## KYC API Key

A separate credential for KYC requests, managed in a dedicated section of the Developer tab. The generation dialog currently offers the Sandbox type.

***

# Flow Overview

1. Sign in to the Reap account
2. Click Get started under Card Issuing on the product selection screen
3. Open the profile menu and click Account settings
4. Click the Developer tab on the Settings page
5. Configure a webhook and check the delivery logs
6. Decide which authorization model the integration will use
7. Generate an API key with the required environment and permissions
8. Whitelist the server IP addresses that will call the APIs
9. Update the public key if the `/reveal` endpoint will be used
10. Generate a KYC API key if the integration includes KYC

***

# Set Up an Integration via the CaaS Dashboard

The CaaS Dashboard is the interface for the entire setup flow.

<br />

## Step 1: Sign In to the Reap Account

![](https://files.readme.io/ee818e1adab371658f1973b157ce9df67436d42e28aff741be2a039f3cf77645-1_sign_in.png)

Select a region, enter the account email address and password, then click Sign in on the Reap sign in page.

<br />

## Step 2: Select the Card Issuing Product

![](https://files.readme.io/d6c88dfaefa58c1fb3e73b278fc0b13d9fd9339d33224412244245405bab87c4-2_select_card_issuing_dashboard.png)

Click "Get started" under Card Issuing to open the dashboard on the product selection screen.

<br />

## Step 3: Open Account Settings

![](https://files.readme.io/efea4a0e4d4a387c4268e3eabae61a91d6645e99c89da28f9dda44f5fc9a5585-3_card_issuing_dashboard.png)

Click the "profile icon" in the top right corner, then select "Account settings".

<br />

## Step 4: Open the Developer Tab and View Webhooks

![](https://files.readme.io/e21ecd113d7af0c4836fda0141f5ca35bc8e0c1fd02819b7d3fff891116c244d-4_view_configured_webhook.png)

Click the "Developer" tab to reveal all developer configuration.&#x20;

1. The Webhooks section appears first and shows the currently configured destination for real time event notifications.&#x20;

<br />

## Step 5: Configure a New Webhook

![](https://files.readme.io/df58ed5631062e877150dacf673dd53abb26436d083b39ce5852cc097c5380e9-5_configure_webhook.png)

Click "Configure new webhook" to open the configuration dialog.&#x20;

1. Enter the destination URL that should receive event notifications, then click Confirm.

<br />

## Step 6: Monitor Webhook Delivery Logs

![](https://files.readme.io/3fc96fe84f4837cbf2cba159824dfdd3d604ec5dfd143b903cf93d2d88453bb6-6_view_webhook_delivery_log.png)

The Webhook delivery logs section supports monitoring delivery status and debugging failed events.

* Search by `upcharge_id` to find specific deliveries
* Filter events with the Status dropdown
* Retry failed events individually or in bulk
* Click the refresh icon if the panel shows Failed to load delivery logs
* Click View all events to open the full event history

<br />

## Step 7: View API Keys and API Versions

![](https://files.readme.io/fda17404b94f67297c726d92ed25f47644b97a04c4cc011004fff3401baa89aa-7_view_generated_api_keys_and_version.png)

The API Keys section is where Production and Sandbox keys are managed. The API Versions section below lists the versions enabled.

<br />

## Step 8: Generate an API Key

![](https://files.readme.io/cfc9c45866bf7c3ef8136d86c0f8c99c6efda722101d021aeb85caf5b7e8e996-8_generate_api_key.png)

<Callout icon="⚠️" theme="info">
  Before generating the first sandbox API key, choose either <Glossary>Standard Authorization</Glossary> or <Glossary>Real-Time Authorization</Glossary>.

  This choice applies only to sandbox API keys and cannot be changed after the first key is created. Each Reap account supports one authorization model for sandbox testing. To test both models, use two Reap accounts registered with different email addresses.

  See the [Authorization Model Comparison Guide](https://reap.readme.io/docs/authorization#/) or contact a relationship manager for guidance.
</Callout>

Click "Generate an API Key" to open the generation dialog.

1. Select the type of key to generate, either Sandbox or Production
2. Select the permissions the key should carry, Read All, Write All, or both
3. Click Generate to create the key

<br />

## Step 9: View Whitelisted IP Addresses

![](https://files.readme.io/957477eb5c922b85682686bc05276fc90c7c78ed44830cd404ec5c42437b63f5-9_view_whitelisted_ip.png)

The IP Whitelisting section lists the IP addresses that are allowed to call the Reap APIs.

<br />

## Step 10: Whitelist an IP Address

![](https://files.readme.io/1d807eee929210c465eff4c4e179eeb85bb91cbbbd4b5e941aed7b7522cd7f3f-10_whitelist_ip.png)

Click "Add IP Address" to open the dialog.&#x20;

1. Enter the IP address to whitelist, then click Confirm.

<br />

## Step 11: View the Public Key

![](https://files.readme.io/3dce65acd928ef16888eeea99785d45e9552ddc748cbc55a1e74637640a4fe8c-11_view_public_key.png)

The Public key section is marked Optional and only matters if the integration uses the `/reveal` endpoint.&#x20;

<br />

## Step 12: Update the Public Key

![](https://files.readme.io/f2af9a088fec2c07b28d2e5da608cb42dabf679fbd3a2eee7875a30e4a7e784a-12_update_public_key.png)

Click "Update key" to add a key or replace the existing one.&#x20;

1. The Update Public Key dialog expects the key in plaintext format.&#x20;
2. Paste the full value into the Public key field, including the BEGIN PUBLIC KEY and END PUBLIC KEY lines, following the reference block shown inside the dialog.&#x20;
3. Click Confirm to save the key.

<br />

## Step 13: View KYC API Keys

![](https://files.readme.io/8c8061cea9fd48b04c088f0b73cc9f37930b9d530e0fc1c8ba0e52956dfbe600-13_view_generated_kyc_api_key.png)

The KYC API Keys section manages the keys used for KYC requests across production and sandbox environments.

<br />

## Step 14: Generate a KYC API Key

![](https://files.readme.io/2d5ebeb0d7613caac862d49d833ca21096fc32db501c75677ddac999bac2d8f4-14_generate_kyc_api_key.png)

Click "Generate an API Key" inside the KYC API Keys section to open the dialog.&#x20;

1. Select Sandbox as the key type, then click Generate.

***

# Scenarios

## Scenario: Set Up a New Integration from Scratch

* Sign in, open the Developer tab, and work through each section from top to bottom
* Configure the webhook first so events arrive from the very first API call
* Generate a Sandbox key, whitelist the development server IP, and test before creating a Production key

## Scenario: Receive Real Time Event Notifications

* Configure a destination URL under Webhooks in the Developer tab
* Watch the delivery logs to confirm events arrive successfully

## Scenario: Test a KYC Flow

* Generate a Sandbox key from the KYC API Keys section
* Keep KYC keys separate from the standard API keys when configuring the integration

***

# TL;DR

* Sign in at the Reap portal and click Get started under Card Issuing to open the dashboard
* All developer setup lives in the profile menu under Account settings → Developer
* Configure a webhook destination URL to receive real time event notifications and monitor results in the delivery logs
* Choose between Standard Authorization and Real Time Authorization before creating the first sandbox API key, as the authorisation model cannot be changed afterward.
* Generate Sandbox or Production API keys and select Read All or Write All permissions at creation
* Whitelist every server IP address that will call the Reap APIs
* The public key is optional and only needed for the `/reveal` endpoint
* KYC API keys are managed in a dedicated section and currently generate as Sandbox only