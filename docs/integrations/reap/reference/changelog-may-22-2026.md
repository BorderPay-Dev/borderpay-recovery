---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# May 22, 2026

# **New `preferredCardName` validation for Create Card API**

Starting **Monday, 1 June 2026**, we will introduce validation on the Create Card API (`POST /caas/api/cards`) to check whether `preferredCardName` reasonably matches the cardholder’s `firstName` and `lastName` in the KYC process.

Previously, `preferredCardName` was only validated for length and format. With this update, the validation will apply to all versions of the Create Card endpoint, for both physical and virtual card issuance.

Card creation requests where the submitted name does not sufficiently match the cardholder’s KYC name will be rejected with an error message:

`preferredCardName does not match the cardholder's name`

## **Company cardholders**

Company cardholders (`entityType: Company`) are not affected.

## **For cardholders with Latin-script KYC names**

Ensure `preferredCardName` reflects the cardholder’s name as provided in the KYC process.

Accepted formats include full name, reversed order, and initial + surname. Unrelated nicknames, aliases, company names, or names belonging to another person may be rejected.

✅ `JOHN DOE` → KYC: `John Doe`

❌ `BOB SMITH` → KYC: `Robert Smith` — nickname does not match the KYC name

## **For cardholders with non-Latin KYC names**

For Chinese, Korean, Arabic, Thai, and other non-Latin KYC names, the system will attempt to match `preferredCardName` against romanized variants generated from the KYC name.

Common romanization formats may be accepted, but acceptance depends on the generated match result.

✅ `ZHANG WEI` → KYC: `张伟`

✅ `KIM MINJUN` → KYC: `민俊 김`

## **What you need to do**

Review your card creation flows and ensure `preferredCardName` reflects the cardholder’s name as provided in the KYC process.

If your system allows cardholders to freely input a preferred name, consider adding guidance on your end to help avoid rejections.

Thank you!

*Team Reap*