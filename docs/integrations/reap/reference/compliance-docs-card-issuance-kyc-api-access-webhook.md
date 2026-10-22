---
updatedAt: 2026-09-10T06:53:53.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Card Issuance KYC API Access Webhook 

Reference specification for the `card_issuance_api_access_updated` webhook event delivered by Reap's Compliance Notifications API, describing the payload schema, status semantics, rejection reasons, conditional fields, and consumer handling for changes to an entity's Card Issuance KYC API access.

| Field       | Value                              |
| :---------- | :--------------------------------- |
| `eventType` | `account_status_change`            |
| `eventName` | `card_issuance_api_access_updated` |

This event tells you whether an entity may have a card. It is emitted for KYCaaS, Verified Token Sharing, and Universal KYC.&#x20;

To register an endpoint and verify deliveries, see [Webhook Setup](https://reap-ra.readme.io/v2.0.6/update/docs/webhook-setup).

***

# Overview

The Card Issuance KYC API access notification is sent when an entity's compliance status changes in a way that affects access to card issuance functionality. The event is delivered through Reap's consolidated notification system, which automatically determines the appropriate event details and message based on the entity's compliance state at the time the change occurs.

Notifications are emitted at two distinct granularities. **Requirement-level rejections** are sent for individual requirements that fail verification so the integrator knows exactly what needs to be fixed. **Feature-level access changes** are sent when overall access to the Card Issuance KYC API is granted, updated, or revoked. Individual requirement approvals are intentionally not sent — notifications are only emitted when the entire feature becomes ready to use, which keeps the notification volume low.

The `status` field is always present and uses the `RequirementStatus` enum, allowing consumers to switch on a single field to determine handling. Optional fields (`moderationComment`, `reviewRejectType`, `rejectLabels`, `requirementId`, `slug`) provide additional context depending on the type of event being delivered.

***

# Event Identification

<Table>
  <thead>
    <tr>
      <th>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </th>

      <th>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </td>

      <td>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </td>
    </tr>

    <tr>
      <td>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </td>

      <td>
        \| Field       | Value                              |

        \| :---------- | :--------------------------------- |

        \| \`eventType\` | \`account_status_change\`            |

        \| \`eventName\` | \`card_issuance_api_access_updated\` |
      </td>
    </tr>
  </tbody>
</Table>

<br />

***

# Webhook Payload Structure

When an entity's Card Issuance KYC API access status changes, Reap delivers a `POST` request to the registered webhook endpoint with the following payload shape.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API access updated",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "APPROVED",
    "moderationComment": "Identity verification approved by compliance team",
    "reviewRejectType": "RETRY",
    "rejectLabels": ["DOCUMENT_QUALITY"],
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

***

# Payload Field Reference

## Top-Level Fields

| Field       | Type   | Present | Description                               | Example                              |
| :---------- | :----- | :------ | :---------------------------------------- | :----------------------------------- |
| `eventType` | string | always  | Always `account_status_change`            | `"account_status_change"`            |
| `eventName` | string | always  | Always `card_issuance_api_access_updated` | `"card_issuance_api_access_updated"` |
| `data`      | object | always  | Event-specific payload object             | See `data` fields below              |

## `data` (object)

| Field               | Type      | Present  | Description                                                                                             | Example                                               |
| :------------------ | :-------- | :------- | :------------------------------------------------------------------------------------------------------ | :---------------------------------------------------- |
| eventId             | string    | always   | Unique per notification. Deduplicate on this                                                            | `"b610f044-6a99-4803-84c0-78ea79912929"`              |
| `message`           | string    | always   | Human-readable summary. For logs and support — do not branch on it, the wording is not stable           | `"Card Issuance KYC API access granted"`              |
| `entityId`          | string    | always   | The entity whose status changed                                                                         | `"ent_123e4567-e89b-12d3-a456-426614174000"`          |
| `status`            | string    | always   | APPROVED, REJECTED, or PENDING. Branch on this field                                                    | `"APPROVED"`, `"PENDING"`, or `"REJECTED"`            |
| `timestamp`         | string    | always   | When the decision was made                                                                              | `"2024-03-20T10:00:00Z"`                              |
| `moderationComment` | string    | REJECTED | Reviewer's explanation. Safe to surface to the cardholder                                               | `"Identity verification approved by compliance team"` |
| `reviewRejectType`  | string    | REJECTED | FINAL or RETRY. Determines whether the entity can be resubmitted                                        | `"FINAL"` or `"RETRY"`                                |
| `rejectLabels`      | string\[] | REJECTED | Machine-readable reasons                                                                                | `["DOCUMENT_QUALITY", "EXPIRED_DOCUMENT"]`            |
| `requirementId`     | string    | REJECTED | UUID of the specific requirement that was rejected (only present for individual requirement rejections) | `"req_456e7890-f12c-34d5-b678-901234567890"`          |
| `slug`              | string    | REJECTED | The requirement that failed, where the rejection is scoped to one                                       | `"individual-verification-identity"`                  |

***

# Conditional Field Presence

The optional fields in the `data` object are populated according to the type of event being delivered. The table below summarises which fields to expect in each case.

| Event Variant                    | `status`   | `moderationComment` | `reviewRejectType` | `rejectLabels` | `requirementId` | `slug`      |
| :------------------------------- | :--------- | :------------------ | :----------------- | :------------- | :-------------- | :---------- |
| Access granted (auto-enabled)    | `APPROVED` | Optional            | Absent             | Absent         | Absent          | Absent      |
| Access granted (manual approval) | `APPROVED` | Typically present   | Absent             | Absent         | Absent          | Absent      |
| Pending review                   | `PENDING`  | Optional            | Absent             | Absent         | Absent          | Absent      |
| Individual requirement rejected  | `REJECTED` | Typically present   | Present            | Present        | **Present**     | **Present** |
| Feature access revoked           | `REJECTED` | Typically present   | Present            | Present        | Absent          | Absent      |

<Callout icon="ℹ️" theme="info">
  The presence of `requirementId` and `slug` is the canonical way to distinguish an individual **requirement rejection** from a full **feature access revocation**. Consumers should branch on these fields when handling `REJECTED` status.
</Callout>

***

# Handling the Decision

Branch on data.status

| Status     | reviewRejectType | **What it means**                                                           | **What to do**                                                                        |
| :--------- | ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `APPROVED` | -                | The entity passed Reap's checks                                             | Proceed to card issuance. For standard card issuance, fetch the signed payload first  |
| `PENDING`  | -                | Submitted, decision not yet made                                            | Show an in-progress state. Do not gate your integration on receiving this event       |
| `REJECTED` | RETRY            | Correctable — bad document image, incomplete data, wrong verification level | Surface moderationComment to the cardholder, collect a corrected submission, resubmit |
| `REJECTED` | FINAL            | The entity failed Reap's checks                                             | Route escalations/appeals through your customer support contact                       |

##

## Common Reject Labels

When a requirement is rejected, the `rejectLabels` array may contain one or more of the following values.

| Label                         | Meaning                                                                  |
| :---------------------------- | :----------------------------------------------------------------------- |
| `DOCUMENT_QUALITY`            | Image quality insufficient                                               |
| `EXPIRED_DOCUMENT`            | Document has expired                                                     |
| `DOCUMENT_NOT_SUPPORTED`      | Document type not accepted                                               |
| `FACE_MISMATCH`               | Selfie does not match the document photo                                 |
| `RESTRICTED_PERSON`           | Person appears on restricted lists                                       |
| `INVALID_DATA`                | Submitted data contains errors                                           |
| `INCOMPLETE_SUBMISSION`       | Required information missing                                             |
| `COMPLIANCE_SCREENING_FAILED` | AML screening failed during KYC                                          |
| `SCREENSHOTS`                 | Selfie does not match document photo (SumSub)                            |
| `LEVEL_ENFORCED_MISMATCH`     | Verified against the wrong SumSub Partner Level (Verified Token Sharing) |

<Callout icon="ℹ️" theme="info">
  For the complete list of rejection labels, see the [SumSub documentation on receiving and interpreting results](https://docs.sumsub.com/docs/receive-and-interpret-results-via-api#understand-rejection).
</Callout>

***

# Notification Scenarios

The following payload examples illustrate each event variant the integrator should expect to handle.

## Scenario: Individual Requirement Rejected

Emitted when a single requirement within the entity's KYC submission fails verification. The presence of `requirementId` and `slug` identifies the specific requirement.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API requirement rejected",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "REJECTED",
    "moderationComment": "Identity document image quality is insufficient. Please resubmit with clearer images",
    "reviewRejectType": "RETRY",
    "rejectLabels": ["DOCUMENT_QUALITY"],
    "requirementId": "req_456e7890-f12c-34d5-b678-901234567890",
    "slug": "individual-verification-identity",
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

## Scenario: Access Granted (Auto-Enabled)

Emitted when the entity meets all requirements and feature access is granted automatically without manual compliance review.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API access auto-granted - Card Issuance KYC API",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "APPROVED",
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

## Scenario: Access Granted (Manual Approval)

Emitted when the compliance team manually approves access after reviewing the entity's submission. The `moderationComment` typically records the reviewer's rationale.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API access granted",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "APPROVED",
    "moderationComment": "Identity verification and business documents approved by compliance team",
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

## Scenario: Access Revoked — Final Rejection

Emitted when overall feature access is revoked with no further attempts allowed. The integrator should disable card issuance functionality and direct the user to support.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API access revoked",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "REJECTED",
    "moderationComment": "Business registration documents do not meet compliance standards",
    "reviewRejectType": "FINAL",
    "rejectLabels": ["DOCUMENT_NOT_SUPPORTED", "INVALID_DATA"],
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

## Scenario: Access Revoked — Retry Allowed

Emitted when overall feature access is revoked but the entity is permitted to resubmit corrected documentation. The integrator should disable card issuance functionality and prompt the user to resubmit.

```json
{
  "eventType": "account_status_change",
  "eventName": "card_issuance_api_access_updated",
  "data": {
    "message": "Card Issuance KYC API access revoked",
    "entityId": "ent_123e4567-e89b-12d3-a456-426614174000",
    "status": "REJECTED",
    "moderationComment": "Identity document image quality is insufficient. Please resubmit with clearer images",
    "reviewRejectType": "RETRY",
    "rejectLabels": ["DOCUMENT_QUALITY"],
    "timestamp": "2024-03-20T10:00:00Z"
  }
}
```

***

# Webhook Details

## KYCaaS

KYCaaS verifies a single Card Issuance KYC requirement in one submission that results in either access granted or rejected.

<br />

### Approved Flow

**Verification submitted**

```json
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "b610f044-6a99-4803-84c0-78ea79912929",
    "message": "Card Issuance KYC API requirement pending",
    "entityId": "",
    "status": "PENDING",
    "rejectLabels": [],
    "timestamp": "2026-05-14T13:32:20.636Z"
  }
}
```

**Access granted**

```json
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "bbd2441d-5adb-4eef-a6fe-545307b2a1a1",
    "message": "Card Issuance KYC API access granted",
    "entityId": "",
    "status": "APPROVED",
    "timestamp": "2026-05-14T13:45:01.000Z"
  }
}
```

<br />

### Rejected Flow

The flow begins with the same `PENDING` webhooks as the approved flow, one for each requirement under review. It then diverges with a `REJECTED` webhook instead of an `APPROVED` one, and no `APPROVED` notification follows.

**Verification rejected**

```json Internal Errors
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "542a1573-bba2-4fdf-b639-d379dbd2f9b2",
    "message": "Card Issuance KYC API requirement rejected",
    "entityId": "",
    "status": "REJECTED",
    "rejectLabels": ["COMPLIANCE_SCREENING_FAILED"],
    "moderationComment": "We are unable to provide services to you at this time. If you believe this is an error, please contact support.",
    "reviewRejectType": "FINAL",
    "timestamp": "2026-05-14T13:45:00.000Z"
  }
}
```

<br />

### SUMSUB Related Errors (TBA)

```json SUMSUB Errors
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "542a1573-bba2-4fdf-b639-d379dbd2f9b2",
    "message": "Card Issuance KYC API requirement rejected",
    "entityId": "",
    "rejectLabels": ["SCREENSHOTS"],
    "reviewRejectType": "RETRY",
    "moderationComment": "Your selfie does not match your document photo. Please retake.",
    "reviewRejectType": "RETRY",
    "timestamp": "2026-05-14T13:45:00.000Z"
  }
}
```

<br />

## Universal KYC

Universal KYC verifies multiple requirements with steps 1 and 2 repeating for each one before access is granted.

<br />

### Approved Flow

**Requirement submitted**

```json
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "b610f044-6a99-4803-84c0-78ea79912929",
    "message": "Universal KYC requirement pending",
    "entityId": "",
    "status": "PENDING",
    "rejectLabels": [],
    "timestamp": "2026-05-15T04:00:00.000Z"
  }
}
```

**Access granted**

```json
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "30f138e1-0941-41a7-ac42-8e2d1b222a55",
    "message": "User profile approved - card generation enabled",
    "entityId": "",
    "status": "APPROVED",
    "timestamp": "2026-05-15T04:14:57.000Z"
  }
}
```

<br />

### Rejected Flow

The flow begins with the same `PENDING` webhooks as the approved flow, one for each requirement under review. It then diverges with a `REJECTED` webhook instead of an `APPROVED` one, and no `APPROVED` notification follows.

**Requirement rejected**

```json
{
  "eventName": "card_issuance_api_access_updated",
  "eventType": "account_status_change",
  "data": {
    "eventId": "542a1573-bba2-4fdf-b639-d379dbd2f9b2",
    "message": "Universal KYC requirement rejected",
    "entityId": "",
    "status": "REJECTED",
    "rejectLabels": ["COMPLIANCE_SCREENING_FAILED"],
    "moderationComment": "We are unable to provide services to you at this time. If you believe this is an error, please contact support.",
    "reviewRejectType": "FINAL",
    "timestamp": "2026-05-15T04:14:57.000Z"
  }
}
```

***

# Webhook Handler Implementation

The following Express.js handler demonstrates a complete consumer implementation. It verifies the request signature, branches on the `status` enum value, and distinguishes individual requirement rejections from feature access revocations using the presence of `requirementId` and `slug`.

```javascript
// Express.js webhook handler
app.post('/webhooks/reap', (req, res) => {
  const notification = req.body;
 
  // Verify webhook signature (see https://reap-ra.readme.io/docs/webhook-setup for implementation)
  if (!verifyWebhookSignature(req.body, req.headers['reap-signature'])) {
    return res.status(401).send('Invalid signature');
  }
 
  if (notification.eventName === 'card_issuance_api_access_updated') {
    const {
      entityId,
      status,
      moderationComment,
      reviewRejectType,
      rejectLabels,
      requirementId,
      slug,
    } = notification.data;
 
    // Handle status-based notifications using RequirementStatus enum values
    // Status is always present and uses enum values: APPROVED, PENDING, REJECTED
    switch (status) {
      case 'APPROVED':
        console.log(`✅ Entity ${entityId} now has Card Issuance KYC API access`);
        if (moderationComment) {
          console.log(`Compliance comment: ${moderationComment}`);
        }
        enableCardIssuanceFeatures(entityId);
        break;
 
      case 'PENDING':
        console.log(`⏳ Entity ${entityId} KYC is under review`);
        if (moderationComment) {
          console.log(`Compliance comment: ${moderationComment}`);
        }
        showPendingStatus(entityId, moderationComment);
        break;
 
      case 'REJECTED':
        // Check if this is a requirement rejection or feature access revocation
        if (requirementId && slug) {
          // Individual requirement rejected - user needs to fix specific issue
          console.log(`❌ Entity ${entityId} requirement '${slug}' was rejected`);
          if (moderationComment) {
            console.log(`Compliance comment: ${moderationComment}`);
          }
 
          if (rejectLabels && rejectLabels.length > 0) {
            console.log(`Rejection reasons: ${rejectLabels.join(', ')}`);
          }
 
          if (reviewRejectType === 'RETRY') {
            console.log(`💡 You can resubmit your documents after addressing the issues`);
            showRequirementRetryOption(entityId, slug, moderationComment, rejectLabels);
          } else if (reviewRejectType === 'FINAL') {
            console.log(`🚫 This is a final rejection. Please contact support for assistance`);
            showSupportContact(entityId);
          }
        } else {
          // Feature access revoked - entire access removed
          console.log(`❌ Entity ${entityId} Card Issuance KYC API access was revoked`);
          if (moderationComment) {
            console.log(`Compliance comment: ${moderationComment}`);
          }
          disableCardIssuanceFeatures(entityId);
        }
        break;
    }
  }
 
  res.status(200).send('OK');
});
 
// Helper functions (implement according to your application needs)
function enableCardIssuanceFeatures(entityId) {
  // Enable card issuance functionality for this entity
  // Update your application state, enable UI features, etc.
}
 
function disableCardIssuanceFeatures(entityId) {
  // Disable card issuance functionality for this entity
  // Update your application state, disable UI features, etc.
}
 
function showPendingStatus(entityId, comment) {
  // Show pending status to user with optional comment
}
 
function showRequirementRetryOption(entityId, requirementSlug, comment, rejectLabels) {
  // Show retry option for specific requirement with guidance based on rejection reasons
  // Focus user on fixing the specific requirement that was rejected
}
 
function showSupportContact(entityId) {
  // Show support contact information for final rejections
}
```

<br />

***

# Support

<Callout icon="📘" theme="info">
  Contact your **Reap Implementation Manager** about unexpected labels, status transitions, or `FINAL` rejections. Include the `entityId`, the `eventId`, the environment, and the full payload received.
</Callout>

***