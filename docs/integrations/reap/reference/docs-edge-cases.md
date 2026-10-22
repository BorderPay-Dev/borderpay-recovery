---
updatedAt: 2026-02-13T03:15:56.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Edge Cases

This page highlights a few unique transaction edge cases to consider when managing your card program.

# 1. Debit Adjustments for Sales Tax Reclaim OCTs

This edge case applies to sales tax rebate payouts issued as **Original Credit Transactions (OCTs)**, where funds may later need to be reclaimed due to regulatory or eligibility requirements. In these situations, recovery is handled through a **debit adjustment**, rather than reversing the original credit.

In some jurisdictions, VAT or sales tax rebate service providers are legally required to perform post-disbursement reviews. If a rebate is found to be ineligible or issued in error, a reclaim may be required even after the rebate has already been credited to the cardholder.

<br />

***What to Expect***

* Sales tax rebates may be paid as an Original Credit Transaction (OCT), which is a credit sent directly to a cardholder’s card account rather than a refund of a purchase.
* If the rebate later needs to be reclaimed due to regulatory or eligibility requirements, the card network may process a separate debit adjustment to recover funds. This is not a reversal of the original credit.
* The debit adjustment is typically linked to the original rebate credit for reconciliation, so related identifiers (`tid` and `lifecycle_event_id`) may appear across both events.
* The reclaimed amount may be full or partial, and it can appear days, weeks, or even months after the original rebate payout depending on local rules.

<Callout icon="❗️" theme="error">
  **Recommendation**: Design your ledgering and customer support flows to expect a delayed “take-back” event, and avoid treating it as a refund, chargeback, or transaction error.
</Callout>

<br />

***Sample Scenario***

The diagram below illustrates a typical sales tax rebate flow, including a delayed eligibility review that may result in a debit adjustment.

```mermaid
sequenceDiagram
    participant Cardholder
    participant Merchant as VAT Rebate Provider
    participant Acquirer
    participant Visa
    participant Issuer as Card Issuer (Reap)

    Cardholder->>Merchant: Makes eligible purchase
    Merchant->>Acquirer: Submit sales tax rebate request
    Acquirer->>Visa: Send rebate as Original Credit Transaction (OCT)
    Visa->>Issuer: Deliver OCT
    Issuer->>Cardholder: Credit rebate to card balance (Refund Clearing Webhook)

    Note over Cardholder,Issuer: Rebate is successfully credited and appears final to the cardholder

    Note over Cardholder,Issuer: Eligibility or regulatory review may occur days, weeks, or months later depending on local rules

    Merchant->>Acquirer: Identify regulatory or eligibility issue
    Acquirer->>Visa: Initiate debit adjustment (linked to original OCT)
    Visa->>Issuer: Deliver debit adjustment
    Issuer->>Cardholder: Debit reclaimed amount from card balance (Settlement Clearing Webhook)

    Note over Cardholder,Issuer: Debit may be full or partial and occurs as a delayed take-back event

```

<br />

***Key Takeaway***

Sales tax rebate OCTs can be followed by delayed debit adjustments due to regulatory requirements. Programs should treat these as expected recovery events and ensure systems and support processes are designed to handle them correctly.