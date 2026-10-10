---
updatedAt: 2026-07-27T01:07:47.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Scoped Tokens (API Keys Permission)

Enables fine-grained access control for API keys by assigning scoped permissions that restrict access to specific API endpoints. Permissions are managed exclusively through the CaaS Dashboard.

**Purpose**: Manage and enforce fine-grained API key permissions to control access to specific API endpoints, supporting the principle of least privilege.

***

# When to Use This

Use this guide when you need to:

* Restrict API key access to specific endpoints (read-only vs write)
* Implement a least-privilege security model
* Control read/write capabilities per integration or team
* Sandbox third-party vendors with limited blast radius
* Audit and manage API key permissions
* Debug `403 Forbidden` errors caused by missing permissions

***

# Overview

API Key Permissions (Scoped Tokens) allow API keys to carry explicit permissions that control access to specific API routes. API keys must be assigned the appropriate permissions to perform actions instead of granting full access by default. This enhances security, enforces least-privilege access, and ensures better control over API usage.

All permission assignment is done through the CaaS Dashboard under Developer Settings → API Keys.

All existing API keys have been automatically backfilled with `READ_ALL` and `WRITE_ALL`  so no action is required for current integrations to continue working.

***

# Prerequisites

1. Access to the CaaS Dashboard with permission to view Developer Settings

***

# Key Concepts

## Scoped Token (Permission)

Permission attached to an API key that defines allowed actions.

## Permission Types

Defines the available permission levels for API keys.

### Available Permissions

| Value       | Description                          | Typical Use Case                            |
| :---------- | :----------------------------------- | :------------------------------------------ |
| `READ_ALL`  | Grants read access to all resources  | Analytics, BI tools, reporting integrations |
| `WRITE_ALL` | Grants write access to all resources | Card issuance, activation, management flows |

## Additive-Only Permissions (Current Limitation)

* Permissions can be **granted** to an existing key but **cannot currently be removed**
* To issue a key without certain permissions, generate a new API key instead
* The ability to remove permissions from an existing key will be supported in a future release

## Permission Enforcement

* Enforcement is live and API keys must have the required permissions to access protected endpoints
* Requests made using API keys without the necessary permissions will be rejected with a `403 Forbidden` response
* Keys with no permissions assigned will receive `403 Forbidden` on all protected endpoints

***

# Flow Overview

1. Navigate to Developer Settings → API Keys in the CaaS Dashboard
2. Click the edit icon on the target key
3. Select `READ_ALL`, `WRITE_ALL`, or both
4. Save and the change takes effect immediately
5. API enforces permissions on each request to protected endpoints

***

# Manage Permissions via the CaaS Dashboard

The CaaS Dashboard is the interface for assigning permissions.

<br />

### Step 1: Navigate to API Keys

Go to **Developer Settings** and **API Keys** in the CaaS Dashboard where both Production and Sandbox keys are listed.

<br />

### Step 2: Open the Permission Editor

<Image src="https://files.readme.io/ab407f9ddf149f1bf7573b9baea23aebba374070c67389a6b7d9e24a3d40abc7-manageScopedTokenFlow.png" align="center" width="500px" />

Click the ✏️ pencil icon on the right side of the key row to open the permission editor.

<br />

### Step 3: Assign Permissions

Select `READ_ALL`, `WRITE_ALL`, or both and save for the change to take effect immediately.

<br />

### Step 4: Test in Sandbox First

Make a call to a `/cards` or `/transactions` endpoint using the scoped key.

* A `READ_ALL` key should succeed on `GET` requests and return `403` on `POST/PUT/DELETE`
* A `WRITE_ALL` key should succeed on write operations

<br />

### Remove Permissions by Regenerating the Key

Permissions cannot be removed directly, so downgrading the scope of a key requires clicking Generate API Key and selecting only the desired permissions before confirming.

* Generating a new key will not deactivate the old key
* There is currently no limit on the number of Sandbox keys that can be active at the same time
* There is currently no limit on the number of Production keys that can be active at the same time
* Update integrations to use the new key before generating

<br />

# Scenarios

## Scenario: Enable Read-Only Access for a BI Tool

* Assign `READ_ALL` only via the dashboard
* The key can pull card and transaction data but cannot create or modify records

## Scenario: Enable Full Access for an Internal Service

* Assign both `READ_ALL` and `WRITE_ALL` via the dashboard
* The key can perform all card and transaction operations

## Scenario: Debug 403 Errors

* Check assigned permissions on the API Keys page in the dashboard
* Verify the HTTP method requires a permission the key holds

## Scenario: Need to Remove a Permission

* Removal is not currently supported on existing keys
* Generate a new API key with only the desired permissions

***

# Common Errors

| Error           | Cause                                               | Resolution                                            |
| :-------------- | :-------------------------------------------------- | :---------------------------------------------------- |
| `403 Forbidden` | Missing required permission for the endpoint        | Assign the correct permission via the dashboard       |
| `403 Forbidden` | API key has no permissions assigned                 | Grant `READ_ALL` and/or `WRITE_ALL` via the dashboard |
| `403 Forbidden` | Key has `READ_ALL` but request is `POST/PUT/DELETE` | Add `WRITE_ALL` or use a different key                |

***

# Affected Endpoints

The following endpoints require an explicit permission to be set on the API key. Keys with no permissions will receive a `403 Forbidden`.

<br />

## Cards APIs (v1 & v2)

1. `POST /cards`
2. `GET /cards`
3. `GET /cards/cardId`
4. `POST /cards/cardId/ship`
5. `GET /cards/cardId/orders`
6. `POST /cards/bulk-ship`
7. `GET /cards/bulkshipId/bulkship`
8. `POST /cards/cardId/activate`
9. `PUT /cards/cardId/replace`
10. `DELETE /cards/cardId`

<br />

## Transactions APIs (v1)

1. `GET /transactions`
2. `GET /transactions/cardId`

<br />

### Required Permission by HTTP Method

| HTTP Method       | Required Permission |
| :---------------- | :------------------ |
| `GET`             | `READ_ALL`          |
| `POST/PUT/DELETE` | `WRITE_ALL`         |

***

# TL;DR

* Manage permissions via the **CaaS Dashboard** only (Developer Settings → API Keys → ✏️)
* Two permissions available: `READ_ALL`, `WRITE_ALL`
* API keys require explicit permissions (no default access)
* Existing keys are automatically backfilled with `READ_ALL` and `WRITE_ALL`  so no breaking changes are introduced
* Permissions are additive only (removal not yet supported)
* Missing permissions return `403 Forbidden`

<br />