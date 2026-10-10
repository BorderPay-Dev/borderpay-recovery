---
updatedAt: 2026-09-16T02:45:03.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Create Card 

Learn how to effortlessly create both virtual and physical cards using the Cards API as part of Reap's card issuance program.

**Purposes:** Create a new card using the POST /cards endpoint. It is immediately ready for transactions, including transaction simulations in the sandbox environment once a card is created.

***

# When to Use This

Use this guide when you need to:

* Create a virtual or physical card
* Issue a card to an individual (consumer)
* Issue a card to a corporate customer (business)
* Create a card that is immediately ready for transactions, including transaction simulations in the sandbox environment

***

# Overview

Creating a new card is straightforward. This guide outlines the essential information required before calling the POST /cards endpoint and highlights key considerations for building a card program effectively, helping ensure a seamless card creation process.

***

# Prerequisites

1. Decide the card's form and cardholder type (`cardType` and `customerType`) before creation as these values are irreversible after a card is created
2. Collect the required KYC/KYB information based on the `customerType` for compliance purposes
3. Have the cardholder's contact information ready in the `meta` object where `meta.otpPhoneNumber.dialCode` and `meta.otpPhoneNumber.phoneNumber` are required and `meta.email is recommended`

***

# Key Concepts

## Card Form

* Specifies whether the card is physical or virtual
* Set via the `cardType` field

<br />

## Cardholder Type

* Identifies the target user segment for the card: consumer or business
* Set via the `customerType` field

<br />

## KYC/KYB Information

* Cardholder's personal or entity information collected for compliance purposes
* Required in the `kyc` object based on the `customerType`

<br />

## Card Design

* Visa-approved design applied to physical and virtual cards
* Set via the `cardDesign` field

***

# Flow Overview

1. Configure the card type with `cardType` and `customerType`, and set spending controls with `spendLimit` and `expiryDate`
2. Prepare the cardholder's `kyc` information based on the `customerType` and the contact details in the `meta` object
3. Optionally customise the card using `preferredCardName`, `secondaryCardName`, and `cardDesign`
4. Create the card by calling POST /cards with the configured payload

***

# API Summary

| Action      | Endpoint | Method | Use Case                              |
| ----------- | -------- | ------ | :------------------------------------ |
| Create card | `/cards` | POST   | Create a new virtual or physical card |

***

# Creating a Consumer Card

## Create a Card

Create a new virtual or physical card in a single step. A single request includes the card form, spending power settings, and cardholder information.

<br />

### Call the Create Card Endpoint

Use [POST /cards](https://reap.readme.io/reference/post_cards) to create a new card. It is immediately ready for transactions, including transaction simulations in the sandbox environment once a card is created,

<Callout icon="⚠️" theme="warn">
  `cardType` and `customerType` are irreversible after a card is created.
</Callout>

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox.api.caas.reap.global/cards \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '
{
  "cardType": "Virtual",
  "spendLimit": "1000",
  "customerType": "Consumer",
  "kyc": {
    "firstName": "John",
    "lastName": "Doe",
    "dob": "2000-07-22",
    "residentialAddress": {
      "line1": "75 Test",
      "line2": "Test Street",
      "city": "Victoria City",
      "country": "HKG"
    },
    "idDocumentType": "Passport",
    "idDocumentNumber": "1234567"
  },
  "preferredCardName": "John Doe",
  "meta": {
    "otpPhoneNumber": {
      "dialCode": 60,
      "phoneNumber": "123456789"
    },
    "id": "1"
    },
    "programType": "retail",
    "scheme": "visa"
}
'
```

### Key Input

| Parameter Name      | Type   | Description                                                                                                                         |
| :------------------ | :----- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `cardType`          | string | Type of card to create                                                                                                              |
| `customerType`      | string | Type of cardholder                                                                                                                  |
| `kyc`               | object | KYC information for the cardholder with required fields determined by the `customerType`                                            |
| `preferredCardName` | string | Name displayed on the card and must be derived from the cardholder's KYC name as described in [Name on the Card](#name-on-the-card) |
| `meta`              | object | Additional metadata associated with the card including OTP phone number and merchant-defined identifier                             |
| `programType`       | string | Card program type where `commercial` is for business spend and `retail` is for consumer use                                         |
| `scheme`            | string | Card network scheme where valid values are `visa` and `mastercard`                                                                  |

<Callout icon="ℹ️" theme="info">
  `programType` and `scheme` are conditionally required. These fields determine the BIN range used for card issuance together with the cardholder country.

  Both fields are required on every request for businesses enabled for Account Range Processing and excluding either field results in a 400 validation error.

  Both fields are optional and ignored for businesses without Account Range Processing and card issuance continues on the existing BIN with no change in behaviour.
</Callout>

<br />

### Sample Response

```json Response Status 201
{
  "id": "0afcff92-7683-4dd5-b8e1-31bffab25df9"
}
```

### Key Output

| Parameter Name | Type   | Description                                        |
| :------------- | :----- | :------------------------------------------------- |
| `id`           | String | Unique identifier of the successfully created card |

***

# Creating a Business Card

## Create a Card

Create a new virtual or physical business card in a single step. A single request includes the card form, spending power settings, and cardholder information.

<br />

### Call the Create Card Endpoint

Use [POST /cards](https://reap.readme.io/reference/post_cards) to create a new card. It is immediately ready for transactions, including transaction simulations in the sandbox environment once a card is created.

<br />

### Sample Request (cURL)

```curl
curl --request POST \
  --url https://sandbox.api.caas.reap.global/cards \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header 'x-reap-api-key: ********' \
  --data '
{
  "cardType": "Virtual",
  "spendLimit": 1000,
  "customerType": "Business",
  "kyc": {
    "fullName": "ABC Company Limited",
    "entityType": "Company",
    "registeredAddress": {
      "line1": "Flat A on 1/F",
      "line2": "123 Penny Lane",
      "country": "HKG",
      "city": "Hong Kong"
    },
    "businessName": "ABC Company Limited",
    "businessRegistrationNumber": "ABC123456",
    "businessOperationAddress": {
      "line1": "Flat A on 1/F",
      "line2": "123 Penny Lane",
      "country": "HKG",
      "city": "Hong Kong"
    }
  },
  "preferredCardName": "ABC Company Limited",
  "meta": {
    "otpPhoneNumber": {
      "dialCode": "852",
      "phoneNumber": "98576167"
    },
    "id": "123456"
    },
    "programType": "commercial",
    "scheme": "visa"
}
'
```

### Key Input

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Parameter Name
      </th>

      <th>
        Type
      </th>

      <th>
        Description
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        `cardType`
      </td>

      <td>
        string
      </td>

      <td>
        Type of card to create.
      </td>
    </tr>

    <tr>
      <td>
        `customerType`
      </td>

      <td>
        string
      </td>

      <td>
        Use `Business` as the cardholder type when creating a business card
      </td>
    </tr>

    <tr>
      <td>
        `kyc`
      </td>

      <td>
        object
      </td>

      <td>
        Business KYC information for the cardholder.
      </td>
    </tr>

    <tr>
      <td>
        `preferredCardName`
      </td>

      <td>
        string
      </td>

      <td>
        Name displayed on the card.

        - The name must be derived from the cardholder's personal KYC name (`kyc.cardholder.firstName` + `kyc.cardholder.lastName`) as described in [Name on the Card](#name-on-the-card).
        - No name validation is applied for a business card issued to the company itself (`entityType: Company`).
      </td>
    </tr>

    <tr>
      <td>
        `meta`
      </td>

      <td>
        object
      </td>

      <td>
        Additional metadata associated with the card, including OTP phone number and merchant-defined identifier.
      </td>
    </tr>

    <tr>
      <td>
        `programType`
      </td>

      <td>
        string
      </td>

      <td>
        Card program type where `commercial` is for business spend and `retail` is for consumer use
      </td>
    </tr>

    <tr>
      <td>
        `scheme`
      </td>

      <td>
        string
      </td>

      <td>
        Card network scheme where valid values are `visa` and `mastercard`
      </td>
    </tr>
  </tbody>
</Table>

<Callout icon="ℹ️" theme="info">
  `programType` and `scheme` are conditionally required. These fields determine the BIN range used for card issuance together with the cardholder country.

  Both fields are required on every request for businesses enabled for Account Range Processing and excluding either field results in a 400 validation error.

  Both fields are optional and ignored for businesses without Account Range Processing and card issuance continues on the existing BIN with no change in behaviour.
</Callout>

<br />

### Sample Response

```json Response Status 201
{
  "id": "0afcff92-7683-4dd5-b8e1-31bffab25df9"
}
```

### Key Output

| Parameter Name | Type   | Description                                        |
| :------------- | :----- | :------------------------------------------------- |
| `id`           | String | Unique identifier of the successfully created card |

***

# Creating a Commercial Card for an End-Business Employee

Use this flow when you issue cards to employees of your own business customers (end-businesses). The end-business must first be KYB-approved through Reap; on approval you receive an `entityId` for that business.

Sample request:

```json
{
  "cardType": "Virtual",
  "spendLimit": 1000,
  "customerType": "Business",
  "kyc": {
    "fullName": "Acme Pte Ltd",
    "entityType": "Company",
    "entityId": "ent_xxxxxxxxxxxx",
    "registeredAddress": { "line1": "...", "city": "...", "country": "SGP" },
    "businessName": "Acme Pte Ltd",
    "businessRegistrationNumber": "ACRA123456",
    "businessOperationAddress": { "line1": "...", "city": "...", "country": "SGP" },
    "cardholder": {
      "firstName": "Jane",
      "lastName": "Tan",
      "email": "jane.tan@acme.com"
    }
  },
  "preferredCardName": "Jane Tan",
  "meta": {
    "otpPhoneNumber": { "dialCode": "65", "phoneNumber": "91234567" },
    "id": "123456"
  },
  "programType": "commercial",
  "scheme": "visa"
}
```

Key points to state in the guide text:

* `entityId` identifies the KYB-approved end-business. `businessName` and `businessRegistrationNumber` must match the KYB record.
* The `cardholder` object requires only `firstName`, `lastName`, and a company `email`. No DOB, residential address, or ID documents required. `dob`, `nationality`, `placeOfBirth`, `countryOfBirth`, `residentialCountry` accepted as optional.
* The `email` must be on the end-business's declared company domain. Personal email domains are rejected.
* Card creation is validated in real time against the end-business's KYB status. Not approved, or KYB check unavailable: request rejected (fail closed, retryable).
* **If you do not pass&#x20;**`entityId`**, nothing changes.** Existing business card flows behave exactly as before.

##

## Scenario: Creating a Consumer Card

* Set `customerType` to `Consumer`
* Provide the individual's details in the `kyc` object: `firstName`, `lastName`, `dob`, `residentialAddress`, `idDocumentType`, `idDocumentNumber`

<br />

## Scenario: Creating a Business Card

* Set `customerType` to `Business`
* Provide the entity details in the `kyc` object: `fullName`, `entityType`, `registeredAddress`, `businessRegistrationNumber`, `businessOperationAddress`
* Set `kyc.entityType` to reflect who the card is issued to, as this determines `preferredCardName` validation:
  * `Company`: The card is issued to the company itself. `preferredCardName` is not validated against any name
  * `Person`: The card is issued to a named individual. Provide that individual's personal name in the nested `kyc.cardholder` object (`cardholder.firstName`, `cardholder.lastName`). `preferredCardName` is validated against it using the same rules as a consumer card

<br />

## Scenario: Creating a Commercial Card for an End-Business Employee\*\*

* Set `customerType` to `Business` and `entityType` to `Company`

* Pass the `entityId` of the KYB-approved end-business

* Provide the employee's name and company email in the nested `kyc.cardholder` object (`firstName`, `lastName`, `email`)

* `preferredCardName` is validated against `cardholder.firstName + cardholder.lastName`

<br />

## Scenario: Shipping a Physical Card

* Set `cardType` to `Physical`
* Pass the `cardDesign` field

***

# Common Errors

| Error            | Cause           | Resolution                        |
| ---------------- | --------------- | --------------------------------- |
| 401 Unauthorized | Invalid API key | Check the `x-reap-api-key` header |

***

# Name on the Card

| Parameter                                  | Description                                        |
| ------------------------------------------ | -------------------------------------------------- |
| `preferredCardName`                        | Primary cardholder name displayed on the card      |
| `secondaryCardName`                        | Optional secondary name displayed on the card      |
| Business (entityType: Company  • entityId) | kyc.cardholder.firstName + kyc.cardholder.lastName |

<br />

## Validation Rules for `preferredCardName`

Whether `preferredCardName` is validated, and which name it is checked against, depends on the `customerType` and, for business cards, the `kyc.entityType`.

When validation applies, it is performed when POST /cards is called. The `preferredCardName` is then compared against the cardholder's KYC name.

| Cardholder Type                | Validation | KYC Name Used for Validation                                  |
| ------------------------------ | ---------- | ------------------------------------------------------------- |
| Consumer                       | Always run | `kyc.firstName` + `kyc.lastName`                              |
| Business (entityType: Person)  | Run        | `kyc.cardholder.firstName` + `kyc.cardholder.lastName`        |
| Business (entityType: Company) | Skipped    | No validation is performed against the registered entity name |

The registered legal entity name (`kyc.fullName` or `kyc.businessName`) is never used for validation.

`preferredCardName` is validated against that individual's personal name using the same rules as a consumer card for a business card issued to a named individual (`entityType: Person`).

No name validation is performed and any `preferredCardName` is accepted for a business card issued to the company itself (`entityType: Company`).

The same Normalization, Word Matching, and Acceptance rules described below apply whenever validation runs. That is, they apply to all consumer cards and to `Person` business cards.

The request is rejected with the below error if `preferredCardName` is not derived from the KYC name when validation runs:

| Error                                                    |
| -------------------------------------------------------- |
| `preferredCardName does not match the cardholder's name` |

<Callout icon="ℹ️" theme="info">
  There is no standalone endpoint to validate a name before calling POST /cards.
</Callout>

<br />

## Validation Logic

<Table>
  <thead>
    <tr>
      <th>
        Step
      </th>

      <th>
        Rule
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        1. Normalization
      </td>

      <td>
        Both `preferredCardName` and the KYC name are normalised before comparison
      </td>
    </tr>

    <tr>
      <td>
        2. Word Matching
      </td>

      <td>
        The normalized name is compared against the normalised KYC name
      </td>
    </tr>

    <tr>
      <td>
        3. Acceptance
      </td>

      <td>
        The name is accepted if it is clearly derived from the KYC name
      </td>
    </tr>
  </tbody>
</Table>

<br />

## Normalization Rules

| Rule                                        | Example                              |
| ------------------------------------------- | ------------------------------------ |
| Convert to uppercase                        | `John Doe` → `JOHN DOE`              |
| Remove accents                              | `José` → `JOSE`, `Müller` → `MULLER` |
| Convert punctuation to spaces               | `Al-bilal` → `AL BILAL`              |
| Convert apostrophes to spaces               | `O'Connor` → `O CONNOR`              |
| Convert multiple-part surnames consistently | `Müller-Schmidt` → `MULLER SCHMIDT`  |
| Ignore leading honorifics                   | `Dr John Doe` → `JOHN DOE`           |

<Callout icon="ℹ️" theme="info">
  Hyphens and apostrophes are treated as separators and are not removed.

  - `Al-bilal` becomes `AL BILAL`, not `ALBILAL`

  - `O'Connor` becomes `O CONNOR`, not `OCONNOR`

  - Straight apostrophes (`'`) and curly apostrophes (`’`) produce the same result
</Callout>

<br />

## Word Matching Rules

The following are accepted:

| Rule                         | Example      |
| ---------------------------- | ------------ |
| Any word order               | `DOE JOHN`   |
| Any subset of KYC name words | `JOHN DOE`   |
| Omission of middle names     | `JOHN SOUSA` |
| Initial instead of full name | `J DOE`      |

<br />

## Acceptance Criteria

| Result   | Description                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------ |
| Accepted | Clearly derived from the cardholder's KYC name                                                   |
| Rejected | Does not sufficiently resemble the KYC name, or is made up of unrelated words, numbers, or codes |

<br />

## Examples

**KYC Name**

| Field       | Value                |
| ----------- | -------------------- |
| `firstName` | `John Michael Doe`   |
| `lastName`  | `Champagne De Sousa` |

| `preferredCardName`                   | Result | Reason                                      |
| ------------------------------------- | ------ | ------------------------------------------- |
| `John Michael Doe Champagne De Sousa` | ✅ Pass | Full KYC name                               |
| `DOE CHAMPAGNE`                       | ✅ Pass | Subset of KYC name words in different order |
| `JOHN DE SOUSA`                       | ✅ Pass | Subset of KYC name words                    |
| `SOUSA JOHN`                          | ✅ Pass | Subset of KYC name words in different order |
| `John Sousa`                          | ✅ Pass | First-name word and surname word            |
| `John Champagne`                      | ✅ Pass | First-name word and surname word            |
| `J Champagne`                         | ✅ Pass | Initial and surname word                    |
| `J Sousa`                             | ✅ Pass | Initial and surname word                    |
| `Jane Smith`                          | ❌ Fail | Not derived from the KYC name               |
| `1234 5678`                           | ❌ Fail | Numbers/codes rather than a name            |

***

# Customize Card Aesthetic & Design

Define how the physical card will appear where applicable.

<br />

## Card Design

All physical and virtual cards must use a Visa-approved design. Providing the `cardDesign` field during card creation is optional when a default design has been configured. The `cardDesign` field is required when issuing physical cards for shipment.

More details: [Physical Card Shipping](https://reap.readme.io/docs/physical-card-shipping)

***

# TL;DR

* Use POST /cards to create a virtual or physical card in a single request
* Define the card using cardType and customerType as both values cannot be changed after card creation.
* Include the optional `programType` and `scheme` fields in every request for ARP enabled businesses, while non ARP businesses ignore these fields
* Set spending power and validity with `spendLimit` and `expiryDate`
* Provide KYC/KYB information in the `kyc` object based on the `customerType`
* Provide contact information in the `meta` object where `meta.otpPhoneNumber.dialCode` and `meta.otpPhoneNumber.phoneNumber` are required and `meta.email` is recommended

***

**Related Materials**

⚙️ API Reference/ [Create Card](https://reap.readme.io/reference/post_cards#/)

📖 Guide/ [KYC and KYB Requirements for Card Issuance](https://reap.readme.io/docs/kyc-and-kyb-requirements-for-card-issuance)

📖 Guide/ [Update Cardholder's Contact Information](https://reap.readme.io/docs/update-cardholder-contact-information)