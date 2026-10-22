---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# March 30, 2026

# **ZONE Field Enforcement for Card Shipping**

The `ZONE` field validation for card shipping is now enforced in production for all customers (excluding KAST).

<br />

## 🌍 Supported Countries

`ZONE` field is now required when shipping cards to:

* Canada (CA)
* United States (US)
* India (IN)
* Mexico (MX)
* United Arab Emirates (AE)

<br />

## 🔧 Affected Endpoints

Requests to the following endpoints will be rejected if the `ZONE` field is missing or invalid:

1. `POST /cards/{cardId}/ship`
2. `POST /cards/bulk-ship`

<br />

## 📅 Enforcement Timeline

1. Now → 8 March 2026: Grace period for integration updates
2. 9 March 2026: Enforcement began

<br />

## ⚠️ Important Notes

1. `ZONE` must be a valid state/province code (e.g., FedEx standard) for supported countries
2. Requests with missing or invalid `ZONE` values will return an error
3. `ZONE` remains optional for other countries
4. `ZONE` will be validated against ISO standards (1–3 characters) if provided for optional countries,