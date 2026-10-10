---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# June 2, 2026

# **Dispute Intake via DocuSign & Dispute API**

We are introducing two new ways for clients to submit cardholder disputes — a guided **<Anchor label="DocuSign Web Form" target="_blank" href="https://apps.docusign.com/webforms/eu/942ee26005b2058db5b2784045b202f4">DocuSign Web Form</Anchor>** for cases that require a signed dispute form, and a new **[Dispute API](https://reap.readme.io/reference/get_disputes)** for direct, programmatic submission (including bulk). Both flows feed into the same internal dispute platform, so cases land in Ops automatically with structured data and a unified status lifecycle.

These replace the previous PDF-via-email intake process.

***

## Key Components

### **Single Dispute Intake API** — `POST /disputes`

Submit a dispute for a single transaction. Request fields include:

* Reap Transaction ID
* Reap Card ID
* Transaction Currency and Amount
* Dispute Currency and Amount
* Cardholder Registered Full Name and Email
* Dispute Reason (enum - refer to [Dispute Guide](\[]\(https://reap.readme.io/docs/dispute-guide\)) for details)

Response behavior depends on the Dispute Reason:

* If no cardholder signature is required (Authorization and Processing Error reasons), the dispute is created with status `RECEIVED`.
* If a cardholder signature **is** required (Fraud and Consumer reasons), the dispute is created with status `REQUIRE_ACTION` and the response includes a **prefilled DocuSign WebForm URL** for the cardholder to sign. Once signed, the existing dispute record advances automatically — no duplicate record is created.

### **Bulk Dispute Intake API** — `POST /disputes/bulk`

Submit up to **100 disputes** in a single request. Payload includes total count, total amount, and an array of `{ Transaction ID, Dispute Reason }`. Bulk intake supports only dispute reasons that do **not** require a cardholder signature (Authorization, Processing Error). Requests containing signature-required reasons are rejected.

### **Sign Dispute Endpoint** — `POST /disputes/{id}/sign`

For disputes in `REQUIRE_ACTION` state, this endpoint returns or refreshes the prefilled DocuSign WebForm URL so the cardholder can complete signature.

### **Dispute Intake via DocuSign (Manual Fallback)**

For clients not yet integrated with the API, cardholders can complete a standalone DocuSign Web Form. The form is requested by raising a ticket with Reap Support; once signed, the form data and all attachments are auto-captured into the same Dispute record pipeline (no manual re-typing by Ops). Duplicate Transaction IDs are accepted but flagged for Ops; unmatched Transaction IDs are flagged for follow-up.

### **Dispute Status API** — `GET /disputes`

* `GET /disputes` — Returns the list of disputes. By default, includes all open disputes plus disputes that reached a final status within the last 30 days (configurable). Supports filtering by status, Card ID, and date range. Paginated by default (100/page), with an opt-in unpaginated mode for result sets under 5,000 records.
* `GET /disputes/{id}` — Returns the full detail of a single dispute record.

### **Dispute Status Update Webhook** — `dispute.status_update`

A webhook is fired whenever a dispute's status changes. Payload mirrors the `GET /disputes/{id}` response so clients can ingest updates directly without polling.

***

## Implementation Timeline

Live in production for CaaS programs (on VISA HK BINs only) as of May 22, 2026.

Existing PDF email submissions will be phased out soon, and clients are encouraged to migrate to either the Dispute API or the fallback Dispute DocuSign Web Form.

## Required Actions

Clients integrating the Dispute API should:

* Register a webhook endpoint to receive `dispute.status_update` events.
* Update internal systems to recognise the full status lifecycle (`RECEIVED`, `REQUIRE_ACTION`, `REVIEWING`, `SUBMITTED`, `WON`, `LOST`, `DECLINED`, `CANCELED`, `REFUNDED`) and to handle the prefilled DocuSign WebForm URL returned when signature is required.
* Map their internal dispute reasons to Reap's reason enum.

## Optional Capabilities

* Use the DocuSign Web Form flow (by raising a ticket with Reap Support) for ad-hoc, low-volume disputes with no integration work required.
* Use the Single Dispute API for real-time, per-transaction submission.
* Use the Bulk Dispute API for batch submission of up to 100 disputes (signature-not-required reasons only).
* Poll `GET /disputes` for status, or subscribe to the webhook for push-based updates.

## Resources

* Refer to **Dispute Guide** for full request/response schemas, supported dispute reason code mappings, dispute status lifecycle, examples: <https://reap.readme.io/docs/dispute-guide>
* Reach out to your Implementation Manager or Reap Support with any questions.