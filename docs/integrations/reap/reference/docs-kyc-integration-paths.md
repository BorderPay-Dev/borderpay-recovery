---
updatedAt: 2026-07-30T07:25:25.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# KYC Integration Paths

This section provides a structured overview of Reap’s KYC integration models, including fully managed KYCaaS, Universal KYC frameworks and Sumsub KYC sharing.

# KYC Frameworks in Reap CaaS

Reap’s KYC infrastructure is designed to support API-based verification. Each model integrates into the broader CaaS ecosystem and ultimately enables compliant card issuance.

<br />

## 1. KYCaaS

KYCaaS is Reap’s fully managed, API-driven KYC infrastructure. It centralises compliance workflows within Reap’s infrastructure and seamlessly connects verified users to cardholder creation and issuance services. **Reap owns and controls the approval of KYC and subsequent card creation** that ensure regulatory compliance and streamlined issuance without additional compliance overhead for the organisation under this model.

[👉 KYCaaS Integration Guide](https://reap-ra.readme.io/docs/kycaas-integration-guide)  - Step-by-step implementation guide to onboard and verify users, enabling access to downstream services such as Card Issuance.

<br />

## 2. Universal KYC

Universal KYC delivers a complete end-to-end identity verification workflow through a unified API, while enabling identity reuse across multiple programs, entities, and product environments within the Reap ecosystem.

This supports a single verified identity to be reused across different issuing entities or card programs within the Reap ecosystem, eliminating duplicate verification across programs. Importantly, **Reap retains control over the final approval of card creation**which support regulatory alignment and compliance oversight within the issuing framework.

[👉 Universal KYC](https://reap-ra.readme.io/docs/universal-kyc) - A unified API that handles end-to-end KYC verification for seamless cardholder identity validation and instant card issuance approval

<br />

## 3. Sumsub KYC Sharing

Leverage Sumsub’s Reusable KYC product through the Copy Applicant method to securely share externally verified applicant data with Reap in bulk. This allows an organisation to transfer multiple pre-verified users in a single operation for streamlined card issuance. Platforms can securely share verified applicant data with Reap at scale through the Sumsub KYC model. Verified applicant profiles can be transferred to Reap in bulk without requiring re-verification by using Sumsub-generated share tokens.

It also enables seamless reuse of KYC data within Reap’s card issuance framework while maintaining regulatory compliance and data-sharing controls defined by Sumsub. **Reap does not own the original KYC approval process** as verification is conducted externally by Sumsub. Therefore, additional compliance reviews, documentation requirements, and operational checks may be required before card issuance can proceed.

[👉 Sumsub KYC Sharing Guide](https://reap-ra.readme.io/docs/token-sharing-reliance) - Step-by-step instructions for generating share tokens, securing transferring verified applicants, and adding them into Reap’s system.