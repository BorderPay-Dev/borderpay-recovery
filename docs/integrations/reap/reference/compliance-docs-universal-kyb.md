---
updatedAt: 2026-09-24T04:09:50.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Universal KYB

This guide traces the Universal KYB flow from the creation of the business entity through pack capture, document upload, and review submission to the final compliance decision. It covers request formats, response formats, and the status transitions of the compliance case.

**Purposes**: This guide follows the onboarding journey of a business entity through Universal KYB and maps each stage to its API call, request, response, and resulting case state. It covers every endpoint in the Universal KYB onboarding flow in call order and separates the one time entity creation and pack capture from the amendments and document uploads that repeat until the case closes.

***

# When to Use This

Use this guide when you need to:

* Create the business entity that a compliance case belongs to
* Store and amend the complete KYB pack, including beneficial owners, questionnaire, and enhanced diligence declarations
* Upload the required company records and the identity document of every declared beneficial owner
* Submit the assembled case for compliance review
* Receive the compliance decision through an event subscription

***

# Overview

Universal KYB builds a compliance case around a business entity and reports every status change of that case through an event subscription. The KYB pack holds the legal profile of the business, the declared beneficial owners, the due diligence questionnaire, and the enhanced diligence declarations. Each declared beneficial owner becomes an individual record that carries the identity documents for that person.

With the event subscription in place, a single onboarding starts with the creation of the business entity and the capture of the pack, continues with amendments while the case stays editable, and moves on to the upload of the supporting files. Company records attach to the business record, and identity records attach to the individual record of the owner they belong to. The case then goes to compliance review as one closed submission.

A business entity accepts one pack submission, so every later change goes through an amendment that stores a new version and preserves history. Replacing the declared owners rebuilds their individual records and discards the identity files held against the previous ones. The case stops accepting edits once it reaches compliance review, and the same event subscription delivers the decision for every case in the program.

***

# Prerequisites

1. Use a valid Reap compliance API key in every request
2. Enable Universal KYB for the program before the first production case
3. Configure the compliance base host that matches the target environment
4. Collect the beneficial owner records and the supporting files before the first call
5. Expose a destination that accepts event deliveries when the client needs the decision without contacting support

***

# Key Concepts

## Business Entity

* Business entity represents the company being onboarded and owns the KYB case
* Every KYB call addresses the entity through the path segment `entityId`
* Company documents upload against this entity rather than against an individual

## KYB Pack

* KYB pack holds the legal profile of the business together with the optional `ddq` and `edd` sections
* The pack accepts one creation call per business entity and every later change becomes an amendment
* Each stored change creates a new `submittedRequirementId` so the case keeps its history

## UBO Declaration

* `uboDeclaration` lists the beneficial owners that the client declares for the business
* Each declared owner is created as an individual entity that is returned in `uboEntities`
* Supplying the array replaces the whole set and discards the identity files held against the previous ids

## Document Requirement

* Document requirement identifies the KYB slug that a set of uploaded files satisfies
* A required slug gates the submission while an optional slug supports the review without gating it
* A company requirement appends files across uploads while `ubo-kyc` replaces the files held for the same document kind
  | Document Type                     | Required For Submission      | Upload Against    | Purpose                                                                                |
  | --------------------------------- | ---------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
  | `certificate-of-incorporation`    | Yes                          | Business entity   | Provides the certificate of incorporation or the jurisdictional equivalent             |
  | `company-profile`                 | Yes                          | Business entity   | Provides the registrar profile with registered particulars, shareholders, and officers |
  | `shareholding-chart`              | Yes                          | Business entity   | Provides the shareholding structure chart                                              |
  | `ubo-kyc`                         | Yes, for each declared owner | Individual entity | Provides the identity document of one beneficial owner                                 |
  | `register-of-directors`           | No                           | Business entity   | Provides the register of directors                                                     |
  | `business-registry`               | No                           | Business entity   | Provides the business registry extract                                                 |
  | `source-of-funds-supporting-doc`  | No                           | Business entity   | Provides an enhanced diligence attachment for source of funds                          |
  | `source-of-wealth-supporting-doc` | No                           | Business entity   | Provides an enhanced diligence attachment for source of wealth                         |
  | `ownership-structure-chart`       | No                           | Business entity   | Provides the ownership chart that `shareholding-chart` supersedes                      |
  | `board-resolution`                | No                           | Business entity   | Provides the board resolution when compliance requests it                              |

## KYB Submission

* Submission checks completeness, locks the stored payload, and queues the case for compliance review

* Presence of a document is checked rather than approval of that document

## Case Status

* Case status shows where the case sits between assembly and the final compliance decision
* `PENDING_SUBMISSION` accepts pack changes and document uploads, and `UNDER_REVIEW` locks both
* `PENDING_ADDITIONAL_INFO`, `APPROVED`, `REJECTED`, and `CANCELLED_BY_CLIENT` each raise a status event

***

# Flow Overview

The event subscription runs once for the program before the first case opens, the entity creation and the pack capture run once for each business, the amendments and the document uploads repeat while the case stays editable, and the review submission runs once to close the case.

* Status notification uses `POST /notification` to register the destination that receives each decision event
* Entity creation uses `POST /entity` to create the business entity that every later call addresses
* Pack capture uses `POST /entity/entityId/ukyb` to store the complete pack and create the individual entities for the declared owners, and `PATCH /entity/entityId/ukyb` to deep merge a later change into the stored payload
* Document collection uses `POST /entity/entityId/ukyb/documents` to file each required company record against the business entity and the identity record of every declared owner against the individual entity of that owner
* Case closure uses `POST /entity/entityId/ukyb/submit` to check completeness, lock the payload, and queue the case for compliance review

***

# API Summary

| Action                         | Endpoint                          | Method | Use Case                                                                              |
| ------------------------------ | --------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| Subscribe to KYB notifications | `/notification`                   | POST   | Creates the subscription that delivers each KYB status event                          |
| Create business entity         | `/entity`                         | POST   | Creates the business entity that owns the KYB case                                    |
| Create KYB pack                | `/entity/entityId/ukyb`           | POST   | Stores the complete KYB pack and creates an individual entity for each declared owner |
| Amend KYB pack                 | `/entity/entityId/ukyb`           | PATCH  | Updates part of the stored payload while the case remains editable                    |
| Upload KYB documents           | `/entity/entityId/ukyb/documents` | POST   | Stores the files that satisfy one document requirement                                |
| Submit KYB for review          | `/entity/entityId/ukyb/submit`    | POST   | Creates the review submission that locks the case                                     |

***

# Webhook Summary

| Event                | Fired When                       | Client Action                                                  |
| -------------------- | -------------------------------- | -------------------------------------------------------------- |
| `KYB_STATUS_CHANGED` | A KYB case moves to a new status | Update the stored KYB status and take the next onboarding step |

***

# Universal KYB Onboarding&#x20;

## Step 1: Subscribe To KYB Notifications

Register the destination that receives every KYB status event. Use this step once per destination.

<br />

### Call the Subscribe To KYB Notifications Endpoint

Use [POST /notification](https://reap-ra.readme.io/reference/post_notification) to register the destination that receives each KYB status event.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/notification \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "notificationChannel": "WEBHOOK",
    "notificationTypes": ["kyb_status_change"],
    "webhookUrl": "https://example.com/webhooks/reap"
  }'
```

### Key Input

| **Parameter Name**    | **Type** | **Description**                                     |
| --------------------- | -------- | --------------------------------------------------- |
| `notificationChannel` | string   | Specifies the delivery channel for the subscription |
| `notificationTypes`   | array    | Lists the event types that the destination receives |
| `webhookUrl`          | string   | Provides the destination that receives each event   |

<br />

### Sample Response

```json
{
  "notificationChannel": "WEBHOOK",
  "notificationTypes": ["kyb_status_change"],
  "webhookUrl": "https://example.com/webhooks/reap"
}
```

### Key Output

| **Parameter Name**  | **Type** | **Description**                                          |
| ------------------- | -------- | -------------------------------------------------------- |
| `notificationTypes` | array    | Lists the event types that the subscription now delivers |
| `webhookUrl`        | string   | Shows the destination stored for the subscription        |

<br />

### Sample Webhook Payload

```json
{
  "eventType": "kyb_status_change",
  "eventName": "kyb_status_changed",
  "data": {
    "eventId": "<string>",
    "message": "KYB approved",
    "entityId": "<string>",
    "status": "APPROVED",
    "cardIssuanceEnabled": true,
    "timestamp": "2026-01-01T00:00:00Z",
    "occurredAt": "2026-01-01T00:00:00Z",
    "sequence": 1,
    "schemaVersion": 1
  }
}
```

<br />

## Step 2: Create Business Entity

Create the record that the compliance case belongs to. Use this step once for each business, because every later call in the flow addresses the identifier that it returns.

<br />

### Call the Create Business Entity Endpoint

Use [POST /entity](https://reap-ra.readme.io/reference/post_entity) to create the business entity that owns the KYB case.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/entity \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "externalId": "<string>",
    "type": "BUSINESS"
  }'
```

### Key Input

| **Parameter Name** | **Type** | **Description**                                    |
| ------------------ | -------- | -------------------------------------------------- |
| `externalId`       | string   | Identifies the business inside the client system   |
| `type`             | string   | Specifies the kind of entity that the call creates |

<br />

### Sample Response

```json Response Status 201
{
  "id": "<string>",
  "externalId": "<string>",
  "businessId": "<string>",
  "type": "BUSINESS"
}
```

### Key Output

| **Parameter Name** | **Type** | **Description**                                        |
| ------------------ | -------- | ------------------------------------------------------ |
| `id`               | string   | Identifies the business entity for the KYB pack call   |
| `businessId`       | string   | Identifies the managing business that holds the entity |
| `type`             | string   | Shows the kind of entity that the call created         |

<br />

## Step 3: Create KYB Pack

Store the complete KYB pack for the business entity in a single call. Use this step once per business entity to open the case and to create an individual record for every declared beneficial owner.

<br />

### Call the Create KYB Pack Endpoint

Use [POST /entity/entityId/ukyb](https://reap-ra.readme.io/reference/post_entity-entityid-ukyb) to store the complete KYB pack for a business entity.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/entity/entityId/ukyb \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "legalBusinessName": "<string>",
    "legalFormOfCompany": "PRIVATE_LIMITED",
    "businessRegistrationNumber": "<string>",
    "uboDeclaration": [
      {
        "externalUserId": "<string>",
        "ownershipPct": 100,
        "identity": {
          "firstName": "<string>",
          "middleName": "<string>",
          "lastName": "<string>",
          "fullName": "<string>",
          "dob": "1992-04-15",
          "nationality": "MEX"
        },
        "document": [
          {
            "documentCategory": "IDV",
            "type": "PASSPORT",
            "number": "A12345678",
            "country": "MEX",
            "issuingDate": "2020-01-10",
            "expiryDate": "2030-01-09"
          }
        ],
        "address": {
          "country": "MEX",
          "postCode": "01000",
          "town": "<string>",
          "street": "<string>",
          "state": "<string>",
          "buildingNumber": "<string>",
          "formattedAddress": "<string>"
        }
      }
    ],
    "registeredAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "principalPlaceOfBusinessAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "businessWebsiteUrl": "https://example.com",
    "validEmailDomains": ["example.com"],
    "lineOfBusiness": "PROFESSIONAL_SERVICES",
    "dateOfIncorporation": "2015-06-01",
    "ddq": {
      "cardAuthorities": [
        {
          "fullName": "<string>",
          "role": "<string>"
        }
      ],
      "expectedSpendProfile": {
        "spendBuckets": [
          {
            "name": "<string>",
            "expectedSpendUsd": 25000,
            "jurisdictionIso": "<string>",
            "txnPattern": {
              "frequency": "monthly",
              "avgTicketUsd": 2000,
              "peakDays": ["MON"]
            }
          }
        ]
      },
      "numberOfEmployees": 100
    },
    "edd": {
      "sourceOfFundsDeclaration": "<string>",
      "sourceOfWealthDeclaration": "<string>"
    }
  }'
```

### Key Input

| **Parameter Name**             | **Type** | **Description**                                                      |
| ------------------------------ | -------- | -------------------------------------------------------------------- |
| `entityId`                     | uuid     | Identifies the business entity that receives the KYB pack            |
| `uboDeclaration`               | array    | Lists the beneficial owners declared for the business                |
| `uboDeclaration.document.type` | string   | Specifies the identity document kind that the upload call must match |
| `lineOfBusiness`               | string   | Specifies the business classification code                           |

<br />

### Sample Response

```json Response Status 200
{
  "submittedRequirementId": "<string>",
  "payload": {
    "legalBusinessName": "<string>",
    "legalFormOfCompany": "PRIVATE_LIMITED",
    "businessRegistrationNumber": "<string>",
    "uboDeclaration": [
      {
        "externalUserId": "<string>",
        "ownershipPct": 100,
        "identity": {
          "firstName": "<string>",
          "middleName": "<string>",
          "lastName": "<string>",
          "fullName": "<string>",
          "dob": "1992-04-15",
          "nationality": "MEX"
        },
        "document": [
          {
            "documentCategory": "IDV",
            "type": "PASSPORT",
            "number": "A12345678",
            "country": "MEX",
            "issuingDate": "2020-01-10",
            "expiryDate": "2030-01-09"
          }
        ],
        "address": {
          "country": "MEX",
          "postCode": "01000",
          "town": "<string>",
          "street": "<string>",
          "state": "<string>",
          "buildingNumber": "<string>",
          "formattedAddress": "<string>"
        }
      }
    ],
    "registeredAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "principalPlaceOfBusinessAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "businessWebsiteUrl": "https://example.com",
    "validEmailDomains": ["example.com"],
    "lineOfBusiness": "PROFESSIONAL_SERVICES",
    "dateOfIncorporation": "2015-06-01",
    "ddq": {
      "cardAuthorities": [
        {
          "fullName": "<string>",
          "role": "<string>"
        }
      ],
      "expectedSpendProfile": {
        "spendBuckets": [
          {
            "name": "<string>",
            "expectedSpendUsd": 25000,
            "jurisdictionIso": "<string>",
            "txnPattern": {
              "frequency": "monthly",
              "avgTicketUsd": 2000,
              "peakDays": ["MON"]
            }
          }
        ]
      },
      "numberOfEmployees": 100
    },
    "edd": {
      "sourceOfFundsDeclaration": "<string>",
      "sourceOfWealthDeclaration": "<string>"
    }
  },
  "uboEntities": [
    {
      "externalUserId": "<string>",
      "entityId": "<uuid>",
      "ownershipPct": 100
    }
  ]
}
```

### Key Output

| **Parameter Name**           | **Type** | **Description**                                               |
| ---------------------------- | -------- | ------------------------------------------------------------- |
| `submittedRequirementId`     | string   | Identifies the submission record created by this call         |
| `payload`                    | object   | Shows the stored KYB payload after validation                 |
| `uboEntities.entityId`       | uuid     | Identifies the individual entity for the document upload call |
| `uboEntities.externalUserId` | string   | Identifies the owner through the client supplied reference    |

<br />

## Step 4: Amend KYB Pack

Amend the stored KYB payload while the case remains editable. Use this step to correct a stored value.

<br />

### Call the Amend KYB Pack Endpoint

Use [PATCH /entity/entityId/ukyb](https://reap-ra.readme.io/reference/patch_entity-entityid-ukyb) to update part of the stored KYB payload.

<br />

### Sample Request (cURL)

```curl
curl --request PATCH \
  --url https://sandbox-compliance.api.reap.global/entity/entityId/ukyb \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '{
    "edd": {
      "sourceOfFundsDeclaration": "<string>"
    }
  }'
```

| **Parameter Name**             | **Type** | **Description**                                              |
| ------------------------------ | -------- | ------------------------------------------------------------ |
| `entityId`                     | string   | Identifies the business entity that holds the stored payload |
| `edd.sourceOfFundsDeclaration` | string   | Defines the updated source of funds statement                |

<br />

### Sample Response

```json Response Status 200
{
  "submittedRequirementId": "<string>",
  "payload": {
    "legalBusinessName": "<string>",
    "legalFormOfCompany": "PRIVATE_LIMITED",
    "businessRegistrationNumber": "<string>",
    "uboDeclaration": [
      {
        "externalUserId": "<string>",
        "ownershipPct": 100,
        "identity": {
          "firstName": "<string>",
          "middleName": "<string>",
          "lastName": "<string>",
          "fullName": "<string>",
          "dob": "1992-04-15",
          "nationality": "MEX"
        },
        "document": [
          {
            "documentCategory": "IDV",
            "type": "PASSPORT",
            "number": "A12345678",
            "country": "MEX",
            "issuingDate": "2020-01-10",
            "expiryDate": "2030-01-09"
          }
        ],
        "address": {
          "country": "MEX",
          "postCode": "01000",
          "town": "<string>",
          "street": "<string>",
          "state": "<string>",
          "buildingNumber": "<string>",
          "formattedAddress": "<string>"
        }
      }
    ],
    "registeredAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "principalPlaceOfBusinessAddress": {
      "line1": "<string>",
      "line2": "<string>",
      "city": "<string>",
      "postalCode": "01000",
      "country": "MEX"
    },
    "businessWebsiteUrl": "https://example.com",
    "validEmailDomains": ["example.com"],
    "lineOfBusiness": "PROFESSIONAL_SERVICES",
    "dateOfIncorporation": "2015-06-01",
    "ddq": {
      "cardAuthorities": [
        {
          "fullName": "<string>",
          "role": "<string>"
        }
      ],
      "expectedSpendProfile": {
        "spendBuckets": [
          {
            "name": "<string>",
            "expectedSpendUsd": 25000,
            "jurisdictionIso": "<string>",
            "txnPattern": {
              "frequency": "monthly",
              "avgTicketUsd": 2000,
              "peakDays": ["MON"]
            }
          }
        ]
      },
      "numberOfEmployees": 100
    },
    "edd": {
      "sourceOfFundsDeclaration": "<string>",
      "sourceOfWealthDeclaration": "<string>"
    }
  },
  "uboEntities": [
    {
      "externalUserId": "<string>",
      "entityId": "<uuid>",
      "ownershipPct": 100
    }
  ]
}
```

### Key Output

| **Parameter Name**       | **Type** | **Description**                                            |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `submittedRequirementId` | string   | Identifies the submission record created by this amendment |
| `payload`                | object   | Shows the complete stored payload after the merge          |

<br />

## Step 5: Upload KYB Documents

Upload the files that each required document requirement expects. Use this step once for every required record, because one call carries one requirement.

<br />

### Call the Upload KYB Documents Endpoint

Use [POST /entity/entityId/ukyb/documents](https://reap-ra.readme.io/reference/post_entity-entityid-ukyb-documents) to store the files that satisfy one document requirement.

<br />

### i) Sample Request (cURL): Company Document

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/entity/entityId/ukyb/documents \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --form 'documentType=certificate-of-incorporation' \
  --form 'files=@/path/to/certificate-of-incorporation.pdf'
```

### Key Input

| **Parameter Name** | **Type** | **Description**                                                   |
| ------------------ | -------- | ----------------------------------------------------------------- |
| `entityId`         | string   | Identifies the business entity that the company record belongs to |
| `documentType`     | string   | Specifies the one company requirement that the files satisfy      |
| `files`            | array    | Provides the files stored against the requirement                 |

<br />

### i) Sample Response

```json Response Status 201
{
  "submittedRequirementId": "<string>",
  "documentType": "certificate-of-incorporation",
  "files": [
    {
      "fileId": "<string>",
      "fileName": "certificate-of-incorporation.pdf"
    }
  ]
}
```

### Key Output

| **Parameter Name**       | **Type** | **Description**                                           |
| ------------------------ | -------- | --------------------------------------------------------- |
| `submittedRequirementId` | string   | Identifies the submission record that now holds the files |
| `documentType`           | string   | Shows the requirement that the files were filed under     |
| `files.fileId`           | string   | Identifies each stored file                               |

<Callout icon="ℹ️" theme="info">
  The same request repeats for `company-profile` and `shareholding-chart`, because one call carries one `documentType`. A company requirement appends across uploads, so a later call adds files rather than replacing the stored set.
</Callout>

<br />

### ii) Sample Request (cURL): Beneficial Owner Identity Document

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/entity/entityId/ukyb/documents \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --form 'documentType=ubo-kyc' \
  --form 'uboDocumentType=PASSPORT' \
  --form 'files=@/path/to/passport-front.jpg'
```

### Key Input

| **Parameter Name** | **Type** | **Description**                                           |
| ------------------ | -------- | --------------------------------------------------------- |
| `entityId`         | string   | Identifies the individual entity                          |
| `documentType`     | string   | Specifies the identity requirement that the files satisfy |
| `uboDocumentType`  | string   | Specifies the kind of identity document being uploaded    |
| `files`            | array    | Provides the identity files in front and back order       |

<br />

### Sample Response

```json
{
  "submittedRequirementId": "<string>",
  "documentType": "ubo-kyc",
  "files": [
    {
      "fileId": "<string>",
      "fileName": "passport-front.jpg"
    }
  ]
}
```

### Key Output

| **Parameter Name**       | **Type** | **Description**                                                    |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `submittedRequirementId` | string   | Identifies the submission record that now holds the identity files |
| `documentType`           | string   | Shows the requirement that the files were filed under              |
| `files.fileId`           | string   | Identifies each stored file in upload order                        |

<br />

## Step 6: Submit KYB For Review

Close the case and send it to compliance review. Use this step once the stored payload and the required documents are complete.

<br />

### Call the Submit KYB For Review Endpoint

Use [POST /entity/entityId/ukyb/submit](https://reap-ra.readme.io/reference/post_entity-entityid-ukyb-submit) to close the case and queue it for compliance review.

<Callout icon="ℹ️" theme="info">
  The call carries no body because the pack and the documents are already stored. Completeness checks the presence of each required requirement rather than the approval of any document.
</Callout>

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox-compliance.api.reap.global/entity/entityId/ukyb/submit \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
```

### Key Input

| **Parameter Name** | **Type** | **Description**                                        |
| ------------------ | -------- | ------------------------------------------------------ |
| `entityId`         | string   | Identifies the business entity whose case is submitted |

<br />

### Sample Response

```json
{
  "entityId": "<string>",
  "submittedAt": "2026-01-01T00:00:00Z"
}
```

### Key Output

| **Parameter Name** | **Type** | **Description**                                        |
| ------------------ | -------- | ------------------------------------------------------ |
| `entityId`         | string   | Identifies the business entity whose KYB was submitted |
| `submittedAt`      | string   | Shows when the submission was accepted                 |

<Callout icon="⚠️" theme="info">
  The payload is locked from this point, so further pack and document calls are rejected. To resubmit the case, the client contacts the program manager.
</Callout>

***

# Scenarios

## Scenario: Straight Through Onboarding

* The client registers the destination with `POST /notification` before it opens the first case
* The client creates the record that owns the case with `POST /entity` and keeps the returned identifier for every later call
* The client stores the complete pack with `POST /entity/entityId/ukyb` and keeps the individual entity returned for each declared owner
* The client files the three company records against the business entity with three calls to `POST /entity/entityId/ukyb/documents`
* The client files the identity document of each declared owner against the individual entity of that owner with `POST /entity/entityId/ukyb/documents`
* The client confirms that every required requirement holds a file and closes the case with `POST /entity/entityId/ukyb/submit`
* The client verifies the signature on the delivered event and records the reported status against the business entity

## Scenario: Case Amendment Before Submission

* The client corrects a stored value with `PATCH /entity/entityId/ukyb` and compares the returned payload against the intended values
* The client uploads the identity document of every owner again with `POST /entity/entityId/ukyb/documents` against the new individual entity
* The client confirms that the case still accepts edits and closes it with `POST /entity/entityId/ukyb/submit`
* The client verifies the signature on the delivered event and records the reported status against the business entity

## Scenario: Incomplete File Uploads

* The client uploads part of the required files with `POST /entity/entityId/ukyb/documents`
* The client calls `POST /entity/entityId/ukyb/submit`&#x20;
* The client verifies the signature on the delivered event and records the reported status against the business entity

***

# Common Errors

| **Error**        | **Cause**                                                                            | **Resolution**                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `INCOMPLETE_KYB` | The case reaches submission while a required value or a required document is missing | The stored pack and every required document are in place before the case closes |

***

# TL;DR

* Step 1 covers the status feed, where `POST /notification` registers the destination that receives each decision event
* Step 2 opens the case record, where `POST /entity` creates the business entity that every later call addresses
* Steps 3 to 4 cover the KYB pack, where `POST /entity/entityId/ukyb` stores the complete pack and creates an individual entity for each declared owner and `PATCH /entity/entityId/ukyb` amends the stored payload while the case remains editable
* Step 5 covers document collection, where `POST /entity/entityId/ukyb/documents` files the three required company records against the business entity and one required identity record against the individual entity of each declared owner
* Step 6 covers case closure, where `POST /entity/entityId/ukyb/submit` checks completeness, locks the stored payload, and queues the case for compliance review