---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# February 5, 2026

# LastName Field in KYC Object Now Optional

## What Is Changing

The `lastName` field in the KYC object is now **optional** instead of required for the following API endpoints:

* **POST /cards** (Create Card endpoint)
* **POST /cards/\{cardId}/confirm-identity** (Confirm Cardholder Identity endpoint)
* **POST /top-up-withdrawal** endpoint

**Key Changes:**`lastName` can now be an empty string (`""`) or omitted entirely

**Example KYC object with single-line name:**

json

```
{
  "firstName": "SUHARTO",
  "dob": "1990-01-15",
  "nationality": "ID"
}
```

## Why Is This Happening

This change addresses a real-world challenge with identity documents from certain countries where full names appear on a single line without separate first/last name fields.

**Specific use cases:**

* **Indonesian KTP cards** - Names appear as single-line entries
* **Bangladesh national IDs** - No first/last name separation
* Other countries with similar ID document formats

Previously, when client’s identity verification provider extracted a single-line name, it would populate only `firstName` and leave `lastName` empty, causing API validation errors that prevented card creation for legitimate users.

This change ensures global inclusivity and supports customers in markets where single-name formats are standard on government-issued IDs.

## When Is This Happening

Effective immediately: February 5, 2026

## **What does this mean for you?**

This change is **backward compatible** - existing integrations that provide both `firstName` and `lastName` will continue to work without any modifications.

* **No Breaking Changes:** Existing API requests with both `firstName` and `lastName` will continue to work normally
* This is a **relaxation of validation** - making a previously required field optional

<br />