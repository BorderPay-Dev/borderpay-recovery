---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# October 10, 2025

# **Introducing Clearer Visibility into Fee Adjustments in Your Reports**

We’re introducing a new way to show fee adjustments in your daily and monthly transaction fees reports.

## **What’s Changing?**

Going forward, any corrections to previously charged transaction fees will be reflected as new rows labeled `ADJUSTMENT`. This change ensures transparency and simplifies invoice reconciliation.

### What you’ll see in reports:

* A new `ADJUSTMENT` channel row to reflect fee corrections made **after** an original transaction has been posted.
* A new `Transaction Date` column indicating which original transaction the adjustment applies to
* These adjustments are applied in a forward-dated manner-  they do not overwrite past data, but instead introduce a new row in the report to show the delta (difference) from the original fee.

📌 **Example**

Suppose an original transaction included a **3DS SMS Fee** of `$0.88`. Upon reconciliation, the correct fee should have been `$0.98`. An `ADJUSTMENT` row will be added to reflect this $0.10 difference.

| **Timestamp**                | **Transaction ID**                   | **Card ID**                          | **Event**     | **Channel** | **Bill Amount** | **Customer Amount** | **Is FX** | **Charge Model** | **Gross Interchange** | **Net Interchange** | **FX Revenue** | **ATM Revenue** | **Variable Visa/Thredd Settlement Fee** | **Fixed Visa/Thredd Settlement Fee** | **Visa/Thredd Authorization Fee** | **ATM Withdrawal** | **ATM PIN Change** | **ATM Balance Enquiry** | **3DS SMS Fee** | **3DS Frictionless Fee** | **3DS Forwarding Fee** | **VTS - Token Provisioning** | **VTS - Usage** | **Apple Pay POS Fee** | **Apple Pay Online Fee** | **FX Markup** | **FX Base** | **FX Total** | **ATM Markup** | **Total ATM** | **MCC Padding** | **Fraud Monitoring Fee** | **Card Present** | **Variable Settlement Fees - Visa ISA Fee** | **Variable Settlement Fees - Visa Service Fee** | **Variable Settlement Fees - Visa License Fee** | **Fixed Visa Settlement Fees** | **Fixed Processor Settlement Fees** | **Visa Authorization Fees** | **Processor Authorization Fees** | **Transaction Date**     |
| ---------------------------- | ------------------------------------ | ------------------------------------ | ------------- | ----------- | --------------- | ------------------- | --------- | ---------------- | --------------------- | ------------------- | -------------- | --------------- | --------------------------------------- | ------------------------------------ | --------------------------------- | ------------------ | ------------------ | ----------------------- | --------------- | ------------------------ | ---------------------- | ---------------------------- | --------------- | --------------------- | ------------------------ | ------------- | ----------- | ------------ | -------------- | ------------- | --------------- | ------------------------ | ---------------- | ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------ | ----------------------------------- | --------------------------- | -------------------------------- | ------------------------ |
| **2025-06-23T04:57:07.825Z** | 0123868c-9388-478d-bb67-8003d08c688e | 1806cef9-dd44-4104-83a0-2c0040149d60 | AUTHORIZATION | TRANSACTION | -39.5099775     | -40.2997949         | TRUE      | CROSS\_BORDER    | 0.1000000             | 0.2000000           | 0.3000000      | 0.4000000       | 0.5550000                               | 0.6660000                            | -0.2590000                        | 0.3300000          | 0.5500000          | 1.1000000               | 0.8800000       | 0.2222000                | 0.9900000              | 0.1110000                    | 0.2220000       | 0.3330000             | 0.4440000                | 0.3333000     | 0.3000000   | 0.4444000    | 0.5555000      | 0.6666000     | 0.7777000       | -0.0330000               | TRUE             | 0.6000000                                   | 0.7000000                                       | 0.8000000                                       | 0.9000000                      | 0.2200000                           | -0.2500000                  | -0.0090000                       | 2025-06-23T04:57:07.825Z |
| **2025-06-24T08:57:07.825Z** | 0123868c-9388-478d-bb67-8003d08c688e | 1806cef9-dd44-4104-83a0-2c0040149d60 | OTHERS        | ADJUSTMENT  | -39.5099775     | -40.2997949         | TRUE      | CROSS\_BORDER    | 0.0000000             | 0.0000000           | 0.0000000      | 0.0000000       | 0.0000000                               | 0.0000000                            | 0.0000000                         | 0.0000000          | 0.0000000          | 0.0000000               | 0.1000000       | 0.0000000                | 0.0000000              | 0.0000000                    | 0.0000000       | 0.0000000             | 0.0000000                | 0.0000000     | 0.0000000   | 0.0000000    | 0.0000000      | 0.0000000     | 0.0000000       | 0.0000000                | TRUE             | 0                                           | 0                                               | 0                                               | 0                              | 0                                   | 0                           | 0                                | 2025-06-23T04:57:07.825Z |

In the example above-

1. The first row shows the original transaction with a 3DS SMS Fee of `$0.88`
2. The second row is the `ADJUSTMENT`, reflecting the additional **`$0.10`** adjustment to the fee.

For more details on how adjustments are implemented, refer [here](https://reap.readme.io/docs/retrieve-monthly-invoice-billing-details-copy#/fee-adjustment).

> ⚠️ Reap will notify you in advance of any upcoming adjustments and indicate from which daily transaction fee file they will appear.

***

## Why is this happening?

* We want to provide **greater** **transparency and traceability** into the adjustments that are applied to transaction fees
* To ensure your **invoices fully reconcile** with both daily and monthly transaction fee reports.

***

## When is this happening?

The changes will be applied on October 16, 2025.

***

### **Need Help?**

If you have questions or need guidance, please refer to our API documentation or contact support.