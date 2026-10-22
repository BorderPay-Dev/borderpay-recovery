---
updatedAt: 2026-05-28T07:31:38.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Create Card

> 📘 Retrieve Card Sensitive Data
>
> Card numbers, cvv and expiration will be available immediately upon creation for both virtual and physical cards. See more at [Show Card PAN](https://reap.readme.io/reference/post_cards-cardid-reveal) or [Show Card PAN HTML](https://reap.readme.io/reference/post_cards-cardid-reveal-html#/)

> 🚧 Rate Limit
>
> This endpoint has a rate limit of **10 requests** per second to ensure optimal user experience, prevent system slowdowns, and protect against potential attacks and abuse.

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Reap API",
    "version": "2.0",
    "description": "Reap CAAS Service",
    "contact": {
      "name": "Reap CAAS Engineering",
      "email": "reap-card-engineers@reap.hk"
    }
  },
  "servers": [
    {
      "url": "https://sandbox.api.caas.reap.global",
      "description": "Sandbox server"
    },
    {
      "url": "https://prod.api.caas.reap.global",
      "description": "Production server - Allowlist only"
    }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "x-reap-api-key"
      }
    }
  },
  "paths": {
    "/cards": {
      "post": {
        "summary": "Create Card",
        "tags": [
          "Card"
        ],
        "security": [
          {
            "ApiKeyAuth": [
              ""
            ]
          }
        ],
        "parameters": [
          {
            "required": true,
            "in": "header",
            "name": "Accept-Version",
            "schema": {
              "type": "string",
              "default": "v2.0",
              "description": "Specifies the API version to use for this request."
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "cardType": {
                    "type": "string",
                    "enum": [
                      "Virtual",
                      "Physical"
                    ],
                    "description": "Specifies the type of card to create. Possible values:\n\n**physical**: Select if you plan to use this card to create a physical form later.\n\n**virtual**: Select if the card will remain digital-only.\n\n**Note**: Selecting **physical** does not immediately produce a physical card; it must be requested separately via the shipping endpoint. Once set to **virtual**, the card type cannot be changed to physical. This choice is final and determines future options."
                  },
                  "spendLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "description": "Sets the maximum spending limit for this card at the time of creation by allocating funds from the **availableToAllocate** amount in the master account balance.\n\n**Note**: Only relevant for clients using the standard authorization model. Clients in this model **must** use **spendLimit** to define and monitor each card’s maximum spending capacity."
                  },
                  "customerType": {
                    "type": "string",
                    "enum": [
                      "Business",
                      "Consumer"
                    ],
                    "description": "Specifies whether the cardholder is an individual or a business. Possible values:\n\n**Business**: For corporate customers, aligned with Commercial BIN products.\n\n**Consumer** : For personal customers, aligned with Retail BIN products."
                  },
                  "kyc": {
                    "oneOf": [
                      {
                        "title": "Consumer",
                        "description": "Follow this schema if the **customerType** is **Consumer**.",
                        "type": "object",
                        "properties": {
                          "firstName": {
                            "type": "string",
                            "description": "The cardholder’s first name."
                          },
                          "lastName": {
                            "type": "string",
                            "nullable": true,
                            "description": "The cardholder’s last name."
                          },
                          "dob": {
                            "type": "string",
                            "description": "The cardholder’s date of birth. Must be in **YYYY-MM-DD** format, cannot be in the future, and the cardholder must be at least 18 years of age.",
                            "example": "1990-08-08"
                          },
                          "nationality": {
                            "type": "string",
                            "description": "The nationality of the cardholder. Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                            "example": "HKG"
                          },
                          "residentialAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 1 (e.g. flat, floor, building name)."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 2 (e.g. street, district)."
                              },
                              "line3": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 3."
                              },
                              "line4": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 4."
                              },
                              "line5": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 5."
                              },
                              "country": {
                                "type": "string",
                                "maxLength": 3,
                                "minLength": 3,
                                "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                "example": "HKG"
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Postal code of the address."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "City, district, or town of the address."
                              },
                              "state": {
                                "oneOf": [
                                  {
                                    "type": "string",
                                    "minLength": 2,
                                    "maxLength": 2
                                  },
                                  {
                                    "type": "string",
                                    "maxLength": 255
                                  }
                                ],
                                "nullable": true,
                                "description": "State, province or region. Must be the two-letter code for US addresses."
                              }
                            },
                            "required": [
                              "line1",
                              "line2",
                              "country",
                              "city"
                            ],
                            "additionalProperties": false,
                            "description": "The cardholder’s registered residential address."
                          },
                          "idDocumentType": {
                            "type": "string",
                            "enum": [
                              "Passport",
                              "Health",
                              "NationalID",
                              "TaxIDNumber",
                              "SocialService",
                              "DriversLicense"
                            ],
                            "description": "Type of government-issued ID used to verify the cardholder. Possible values: **passport**, **health**, **national ID**, **Tax id number**, **social security number** or **drivers license**."
                          },
                          "idDocumentNumber": {
                            "type": "string",
                            "maxLength": 255,
                            "description": "The ID number corresponding to the government-issued document."
                          },
                          "signature": {
                            "type": "string",
                            "description": "Cryptographic signature for verifying payload integrity and authenticity.\n\nOnly applicable to clients who have opted into the [KYC-as-a-Service API product](https://reap-ra.readme.io/docs/getting-started).\nReturned in the response of the [`GET /entity/{entityId}/signed-payload` endpoint](https://reap-ra.readme.io/reference/get_entity-entityid-signed-payload)."
                          },
                          "providerId": {
                            "type": "string",
                            "description": "The KYC provider ID if the cardholder has completed KYC with the provider before."
                          },
                          "issuerCustomerId": {
                            "type": "string",
                            "maxLength": 25,
                            "description": "Optional cardholder reference required by certain card programs. When present, this value is attached to the card so the issuer can link it to the cardholder on their side. Maximum 25 characters."
                          },
                          "expiresAt": {
                            "type": "string",
                            "format": "date-time",
                            "description": "In ISO 8601 format. Indicates when the signed payload expires.\n\nOnly applicable to clients who have opted into the [KYC-as-a-Service API product](https://reap-ra.readme.io/docs/getting-started).\nReturned in the response of the [`GET /entity/{entityId}/signed-payload` endpoint](https://reap-ra.readme.io/reference/get_entity-entityid-signed-payload)."
                          }
                        },
                        "required": [
                          "firstName",
                          "dob",
                          "residentialAddress",
                          "idDocumentType",
                          "idDocumentNumber"
                        ],
                        "additionalProperties": false
                      },
                      {
                        "title": "Business",
                        "description": "Follow this schema if the **customerType** is **Business** and the card is issued for your own business.",
                        "type": "object",
                        "properties": {
                          "fullName": {
                            "type": "string",
                            "description": "The card program owner’s entity full legal name. The following characters are not supported: **,;:!?<>~\\\\%^@{}|[]”_`**.\n\nWhen **entityId** is provided, this is the sub-client’s full legal name."
                          },
                          "entityType": {
                            "type": "string",
                            "enum": [
                              "Person",
                              "Company"
                            ],
                            "description": "The type of entity. Possible values:\n\n**personal**: The cardholder is an individual representing a company.\n\n**company**: The cardholder is the company itself, not tied to an individual.\n\nUse `Company` when **entityId** is provided — a sub-client card is issued against a business."
                          },
                          "registeredAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 1. (e.g. company name, PO box, suite, floor, building name)."
                              },
                              "line3": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 3."
                              },
                              "line4": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 4."
                              },
                              "line5": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 5."
                              },
                              "country": {
                                "type": "string",
                                "maxLength": 3,
                                "minLength": 3,
                                "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                "example": "HKG"
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Postal code of the address."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "City, district or town of the address."
                              },
                              "state": {
                                "oneOf": [
                                  {
                                    "type": "string",
                                    "minLength": 2,
                                    "maxLength": 2
                                  },
                                  {
                                    "type": "string",
                                    "maxLength": 255
                                  }
                                ],
                                "nullable": true,
                                "description": "State, province or region. Must be the two-letter code for US addresses."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 2. (e.g. The street, district)."
                              }
                            },
                            "required": [
                              "line1",
                              "country",
                              "city"
                            ],
                            "additionalProperties": false,
                            "description": "The registered address of the legal entity. When **entityId** is provided, this is the sub-client’s registered address."
                          },
                          "businessName": {
                            "type": "string",
                            "description": "The legal business or company name of the card program owner. When **entityId** is provided, this is the sub-client’s legal business name."
                          },
                          "businessRegistrationNumber": {
                            "type": "string",
                            "maxLength": 255,
                            "description": "The legal entity’s business registration number. When **entityId** is provided, this is the sub-client’s business registration number."
                          },
                          "businessOperationAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 1. (e.g. company name, PO box, suite, floor, building name)."
                              },
                              "line3": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 3."
                              },
                              "line4": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 4."
                              },
                              "line5": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 5."
                              },
                              "country": {
                                "type": "string",
                                "maxLength": 3,
                                "minLength": 3,
                                "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                "example": "HKG"
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Postal code of the address."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "City, district or town of the address."
                              },
                              "state": {
                                "oneOf": [
                                  {
                                    "type": "string",
                                    "minLength": 2,
                                    "maxLength": 2
                                  },
                                  {
                                    "type": "string",
                                    "maxLength": 255
                                  }
                                ],
                                "nullable": true,
                                "description": "State, province or region. Must be the two-letter code for US addresses."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 2. (e.g. The street, district)."
                              }
                            },
                            "required": [
                              "line1",
                              "country",
                              "city"
                            ],
                            "additionalProperties": false,
                            "description": "The address where the business operates. When **entityId** is provided, this is the address where the sub-client operates."
                          },
                          "cardholder": {
                            "oneOf": [
                              {
                                "type": "object",
                                "properties": {
                                  "firstName": {
                                    "type": "string",
                                    "description": "The cardholder’s first name."
                                  },
                                  "lastName": {
                                    "type": "string",
                                    "nullable": true,
                                    "description": "The cardholder’s last name."
                                  },
                                  "dob": {
                                    "type": "string",
                                    "description": "The cardholder’s date of birth. Must be in **YYYY-MM-DD** format, cannot be in the future, and the cardholder must be at least 18 years of age.",
                                    "example": "1990-08-08"
                                  },
                                  "nationality": {
                                    "type": "string",
                                    "description": "The nationality of the cardholder. Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                    "example": "HKG"
                                  },
                                  "residentialAddress": {
                                    "type": "object",
                                    "properties": {
                                      "line1": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "description": "Address line 1 (e.g. flat, floor, building name)."
                                      },
                                      "line2": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "description": "Address line 2 (e.g. street, district)."
                                      },
                                      "line3": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "nullable": true,
                                        "description": "Address line 3."
                                      },
                                      "line4": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "nullable": true,
                                        "description": "Address line 4."
                                      },
                                      "line5": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "nullable": true,
                                        "description": "Address line 5."
                                      },
                                      "country": {
                                        "type": "string",
                                        "maxLength": 3,
                                        "minLength": 3,
                                        "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                        "example": "HKG"
                                      },
                                      "postalCode": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "nullable": true,
                                        "description": "Postal code of the address."
                                      },
                                      "city": {
                                        "type": "string",
                                        "maxLength": 255,
                                        "description": "City, district, or town of the address."
                                      },
                                      "state": {
                                        "oneOf": [
                                          {
                                            "type": "string",
                                            "minLength": 2,
                                            "maxLength": 2
                                          },
                                          {
                                            "type": "string",
                                            "maxLength": 255
                                          }
                                        ],
                                        "nullable": true,
                                        "description": "State, province or region. Must be the two-letter code for US addresses."
                                      }
                                    },
                                    "required": [
                                      "line1",
                                      "line2",
                                      "country",
                                      "city"
                                    ],
                                    "additionalProperties": false,
                                    "description": "The cardholder’s registered residential address."
                                  },
                                  "idDocumentType": {
                                    "type": "string",
                                    "enum": [
                                      "Passport",
                                      "Health",
                                      "NationalID",
                                      "TaxIDNumber",
                                      "SocialService",
                                      "DriversLicense"
                                    ],
                                    "description": "Type of government-issued ID used to verify the cardholder. Possible values: **passport**, **health**, **national ID**, **Tax id number**, **social security number** or **drivers license**."
                                  },
                                  "idDocumentNumber": {
                                    "type": "string",
                                    "maxLength": 255,
                                    "description": "The ID number corresponding to the government-issued document."
                                  },
                                  "signature": {
                                    "type": "string",
                                    "description": "Cryptographic signature for verifying payload integrity and authenticity.\n\nOnly applicable to clients who have opted into the [KYC-as-a-Service API product](https://reap-ra.readme.io/docs/getting-started).\nReturned in the response of the [`GET /entity/{entityId}/signed-payload` endpoint](https://reap-ra.readme.io/reference/get_entity-entityid-signed-payload)."
                                  },
                                  "providerId": {
                                    "type": "string",
                                    "description": "The KYC provider ID if the cardholder has completed KYC with the provider before."
                                  },
                                  "issuerCustomerId": {
                                    "type": "string",
                                    "maxLength": 25,
                                    "description": "Optional cardholder reference required by certain card programs. When present, this value is attached to the card so the issuer can link it to the cardholder on their side. Maximum 25 characters."
                                  },
                                  "expiresAt": {
                                    "type": "string",
                                    "format": "date-time",
                                    "description": "In ISO 8601 format. Indicates when the signed payload expires.\n\nOnly applicable to clients who have opted into the [KYC-as-a-Service API product](https://reap-ra.readme.io/docs/getting-started).\nReturned in the response of the [`GET /entity/{entityId}/signed-payload` endpoint](https://reap-ra.readme.io/reference/get_entity-entityid-signed-payload)."
                                  }
                                },
                                "required": [
                                  "firstName",
                                  "dob",
                                  "residentialAddress",
                                  "idDocumentType",
                                  "idDocumentNumber"
                                ],
                                "additionalProperties": false,
                                "x-required": true
                              },
                              {
                                "type": "object",
                                "properties": {},
                                "additionalProperties": false
                              }
                            ],
                            "description": "This field is required when the entityType is Person."
                          },
                          "issuerCustomerId": {
                            "type": "string",
                            "maxLength": 25,
                            "description": "Optional business reference required by certain card programs. When present, this value is attached to the card so the issuer can link it to the business on their side. Maximum 25 characters."
                          },
                          "entityId": {
                            "type": "string",
                            "description": "The sub-client’s entity ID, returned when the sub-client completed KYB with Reap.\n\nProvide it to issue a card on behalf of a KYB-approved sub-client instead of your own business. When it is present, **cardholder** is required and the business fields on this object describe the **sub-client**, not your own business. Set **entityType** to `Company`.\n\nOmit it to issue cards for your own business — that flow is unchanged.\n\nCard creation is rejected if the sub-client cannot be confirmed as KYB-approved and enabled for card issuance under your business, including when the check itself cannot be completed. No card is created in that case.\n\n`entity_not_found` and `entity_not_approved` keep failing until the sub-client’s KYB progresses; `http_timeout` and `http_error` mean the check did not complete and the request can be retried unchanged."
                          }
                        },
                        "required": [
                          "fullName",
                          "entityType",
                          "registeredAddress",
                          "businessName",
                          "businessRegistrationNumber",
                          "businessOperationAddress"
                        ],
                        "additionalProperties": false
                      },
                      {
                        "title": "Business — sub-client",
                        "description": "Follow this schema if the **customerType** is **Business** and the card is issued on behalf of a KYB-approved sub-client, identified by **entityId**.",
                        "type": "object",
                        "properties": {
                          "fullName": {
                            "type": "string",
                            "description": "The card program owner’s entity full legal name. The following characters are not supported: **,;:!?<>~\\\\%^@{}|[]”_`**.\n\nWhen **entityId** is provided, this is the sub-client’s full legal name."
                          },
                          "entityType": {
                            "type": "string",
                            "enum": [
                              "Person",
                              "Company"
                            ],
                            "description": "The type of entity. Possible values:\n\n**personal**: The cardholder is an individual representing a company.\n\n**company**: The cardholder is the company itself, not tied to an individual.\n\nUse `Company` when **entityId** is provided — a sub-client card is issued against a business."
                          },
                          "registeredAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 1. (e.g. company name, PO box, suite, floor, building name)."
                              },
                              "line3": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 3."
                              },
                              "line4": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 4."
                              },
                              "line5": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 5."
                              },
                              "country": {
                                "type": "string",
                                "maxLength": 3,
                                "minLength": 3,
                                "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                "example": "HKG"
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Postal code of the address."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "City, district or town of the address."
                              },
                              "state": {
                                "oneOf": [
                                  {
                                    "type": "string",
                                    "minLength": 2,
                                    "maxLength": 2
                                  },
                                  {
                                    "type": "string",
                                    "maxLength": 255
                                  }
                                ],
                                "nullable": true,
                                "description": "State, province or region. Must be the two-letter code for US addresses."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 2. (e.g. The street, district)."
                              }
                            },
                            "required": [
                              "line1",
                              "country",
                              "city"
                            ],
                            "additionalProperties": false,
                            "description": "The registered address of the legal entity. When **entityId** is provided, this is the sub-client’s registered address."
                          },
                          "businessName": {
                            "type": "string",
                            "description": "The legal business or company name of the card program owner. When **entityId** is provided, this is the sub-client’s legal business name."
                          },
                          "businessRegistrationNumber": {
                            "type": "string",
                            "maxLength": 255,
                            "description": "The legal entity’s business registration number. When **entityId** is provided, this is the sub-client’s business registration number."
                          },
                          "businessOperationAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "Address line 1. (e.g. company name, PO box, suite, floor, building name)."
                              },
                              "line3": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 3."
                              },
                              "line4": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 4."
                              },
                              "line5": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 5."
                              },
                              "country": {
                                "type": "string",
                                "maxLength": 3,
                                "minLength": 3,
                                "description": "Three-letter country code ([ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3)).",
                                "example": "HKG"
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Postal code of the address."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 255,
                                "description": "City, district or town of the address."
                              },
                              "state": {
                                "oneOf": [
                                  {
                                    "type": "string",
                                    "minLength": 2,
                                    "maxLength": 2
                                  },
                                  {
                                    "type": "string",
                                    "maxLength": 255
                                  }
                                ],
                                "nullable": true,
                                "description": "State, province or region. Must be the two-letter code for US addresses."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 255,
                                "nullable": true,
                                "description": "Address line 2. (e.g. The street, district)."
                              }
                            },
                            "required": [
                              "line1",
                              "country",
                              "city"
                            ],
                            "additionalProperties": false,
                            "description": "The address where the business operates. When **entityId** is provided, this is the address where the sub-client operates."
                          },
                          "issuerCustomerId": {
                            "type": "string",
                            "maxLength": 25,
                            "description": "Optional business reference required by certain card programs. When present, this value is attached to the card so the issuer can link it to the business on their side. Maximum 25 characters."
                          },
                          "cardholder": {
                            "type": "object",
                            "properties": {
                              "firstName": {
                                "type": "string",
                                "description": "The cardholder’s first name."
                              },
                              "lastName": {
                                "type": "string",
                                "description": "The cardholder’s last name."
                              },
                              "email": {
                                "type": "string",
                                "format": "email",
                                "description": "The cardholder’s company email address.\n\nIt must be on one of the email domains validated for the sub-client during KYB. The domain is matched exactly, so a subdomain is accepted only if it was validated in its own right.\n\nThis is separate from **meta.email**, which is the address used for 3DS and mobile wallet verification."
                              },
                              "dob": {
                                "type": "string",
                                "description": "The cardholder’s date of birth. Must be in **YYYY-MM-DD** format, cannot be in the future, and the cardholder must be at least 18 years of age.",
                                "example": "1990-08-08"
                              },
                              "nationalityOfEmployee": {
                                "type": "string",
                                "description": "The nationality of the cardholder.",
                                "example": "CAN"
                              },
                              "nationality": {},
                              "placeOfBirth": {
                                "type": "string",
                                "description": "The place of birth of the cardholder.",
                                "example": "Toronto"
                              },
                              "countryOfBirth": {
                                "type": "string",
                                "description": "The country of birth of the cardholder.",
                                "example": "FRA"
                              },
                              "countryOfResidence": {
                                "type": "string",
                                "description": "The country of residence of the cardholder.",
                                "example": "CAN"
                              }
                            },
                            "required": [
                              "firstName",
                              "lastName",
                              "email"
                            ],
                            "additionalProperties": false,
                            "description": "Required when **entityId** is provided.\n\nOnly the fields listed here are accepted. A sub-client cardholder does not go through KYC, so no residential address, ID document, signature or signed payload is collected, and any other field is rejected.\n\n**firstName**, **lastName** and **email** are required; the remaining fields are optional."
                          },
                          "entityId": {
                            "type": "string",
                            "description": "The sub-client’s entity ID, returned when the sub-client completed KYB with Reap.\n\nThe business fields on this object describe the **sub-client**, not your own business.\n\nCard creation is rejected if the sub-client cannot be confirmed as KYB-approved and enabled for card issuance under your business, including when the check itself cannot be completed. No card is created in that case.\n\n`entity_not_found` and `entity_not_approved` keep failing until the sub-client’s KYB progresses; `http_timeout` and `http_error` mean the check did not complete and the request can be retried unchanged."
                          }
                        },
                        "required": [
                          "fullName",
                          "entityType",
                          "registeredAddress",
                          "businessName",
                          "businessRegistrationNumber",
                          "businessOperationAddress",
                          "cardholder",
                          "entityId"
                        ],
                        "additionalProperties": false
                      }
                    ]
                  },
                  "expiryDate": {
                    "type": "string",
                    "format": "date",
                    "nullable": true,
                    "description": "Specifies the expiry date of the card in the format **YYYY-MM-DD**. This must be at least 1 month from the date of creation. If not specified, the expiry date defaults to 3 years from the creation date.",
                    "example": "2025-08-08"
                  },
                  "preferredCardName": {
                    "type": "string",
                    "maxLength": 27,
                    "description": "The name to be printed on the physical card, displayed in uppercase. Allowed characters: letters (A-Z, a-z), digits (0-9), non-English letters (äöüÄÖÜ), space, and / - ^ . apostrophe and right parenthesis."
                  },
                  "secondaryCardName": {
                    "type": "string",
                    "maxLength": 27,
                    "description": "The name to be printed on the physical card, displayed in uppercase. Unsupported characters: **;:!?<>~\\\\%^@{}|[]”_**.\n\n**Note**: If you wish to print a physical card with the **secondaryCardName**, please communicate with your relationship manager. This is an additional feature that must be activated during the card design approval process."
                  },
                  "meta": {
                    "type": "object",
                    "properties": {
                      "otpPhoneNumber": {
                        "type": "object",
                        "properties": {
                          "dialCode": {
                            "type": "number",
                            "format": "float",
                            "description": "The [country dial-in code](https://en.wikipedia.org/wiki/List_of_country_calling_codes#Alphabetical_order). for the cardholder’s phone number. The ‘+’ sign is not needed. "
                          },
                          "phoneNumber": {
                            "type": "string",
                            "description": "The cardholder’s phone number, including the area code."
                          }
                        },
                        "required": [
                          "dialCode",
                          "phoneNumber"
                        ],
                        "additionalProperties": false,
                        "description": "The cardholder’s phone number, used for receiving SMS notifications related to authentication (e.g., 3DS checkout, mobile wallet verification)."
                      },
                      "id": {
                        "type": "string",
                        "description": "A unique identifier for the cardholder in your system."
                      },
                      "email": {
                        "type": "string",
                        "format": "email",
                        "maxLength": 50,
                        "nullable": true,
                        "description": "The cardholder’s email, used as a communication channel for authentication during various occasions (e.g., 3DS checkout, mobile wallet verification). It is highly recommended to provide this field to ensure a seamless authentication experience."
                      }
                    },
                    "required": [
                      "otpPhoneNumber",
                      "id"
                    ],
                    "description": "Any supplementary data about the cardholder, used to identify the user in Reap’s system. Examples include the cardholder’s type or preferences. A phone number and a client ID are required in this field."
                  },
                  "cardDesign": {
                    "type": "string",
                    "format": "uuid",
                    "description": "The ID of the card design artwork approved by Visa. You can retrieve this ID using the [GET /card-design/](https://reap.readme.io/reference/get_card-design) endpoint."
                  },
                  "topUpWallet": {
                    "type": "object",
                    "properties": {
                      "currency": {
                        "type": "string",
                        "enum": [
                          "USDC"
                        ],
                        "description": "Specifies the currency used for the top-up wallet. The only accepted currency is USDC, with the smart contract address **0x3c499c542cef5e3811e1192ce70d8cc03d5c3359**."
                      }
                    },
                    "additionalProperties": false,
                    "description": "Applicable for clients who opt for the cardholder-managed funding only."
                  },
                  "programType": {
                    "type": "string",
                    "enum": [
                      "commercial",
                      "retail"
                    ],
                    "description": "The card’s program type. Valid values:\n\n**commercial**: business/commercial spend.\n\n**retail**: retail/consumer use.\n\nThis, together with **scheme** and the cardholder’s country, determines which BIN range the card is issued from and its interchange category.\n\n**When to pass them**: For ARP-enabled clients, both **programType** and **scheme** are required on every create-card request. Omitting either returns a 400 validation error. For non-ARP businesses, both fields are optional and ignored — the card is issued on the existing BIN exactly as today, with no change in behavior. Simple rule: if you’re on ARP, always send both **programType** and **scheme**; if you’re not, you can leave them out."
                  },
                  "scheme": {
                    "type": "string",
                    "enum": [
                      "visa"
                    ],
                    "description": "The card network the card is issued on. Valid values:\n\n**visa**: Visa network.\n\n**When to pass them**: For ARP-enabled clients, both **programType** and **scheme** are required on every create-card request. Omitting either returns a 400 validation error. For non-ARP businesses, both fields are optional and ignored — the card is issued on the existing BIN exactly as today, with no change in behavior. Simple rule: if you’re on ARP, always send both **programType** and **scheme**; if you’re not, you can leave them out."
                  }
                },
                "required": [
                  "cardType",
                  "customerType",
                  "kyc",
                  "preferredCardName",
                  "meta"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successfully created a card",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "id"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Invalid inputs",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302008"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Invalid card expiry date"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302005"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Invalid card expiry date"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302009"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Invalid phone number"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302012"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Spend limit is required"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0321002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Cryptocurrency is required for withdrawal wallet card"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302007"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Insufficient balance"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0315001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "We currently cannot issue cards for residents of this country"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302019"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Secondary card name is not supported for virtual card"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0309007"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card design does not support secondary card name"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0401001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Insufficient credit to create sub budget"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302040"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Preferred card name does not sufficiently match the KYC name"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "entity_not_found"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Entity is not linked to this business"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string",
                          "enum": [
                            "primaryClientBusinessUuid"
                          ]
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "entity_not_approved"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "entityId is not approved"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string",
                          "enum": [
                            "entityId"
                          ]
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "input_invalid"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "kyc.cardholder.email is not a validated domain"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string",
                          "enum": [
                            "kyc.cardholder.email"
                          ]
                        }
                      },
                      "additionalProperties": false
                    }
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "0321001"
                      ]
                    },
                    "message": {
                      "type": "string",
                      "enum": [
                        "Withdrawal wallet is not enabled"
                      ]
                    },
                    "statusCode": {
                      "type": "number",
                      "format": "float",
                      "enum": [
                        401
                      ]
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "additionalProperties": false
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "insufficient_permissions"
                      ]
                    },
                    "message": {
                      "type": "string",
                      "enum": [
                        "Insufficient permissions"
                      ]
                    },
                    "statusCode": {
                      "type": "number",
                      "format": "float",
                      "enum": [
                        403
                      ]
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "additionalProperties": false
                }
              }
            }
          },
          "404": {
            "description": "Record not found",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302006"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Root budget not found"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            404
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0309002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card design cannot be found"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            404
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  ]
                }
              }
            }
          },
          "406": {
            "description": "Not Acceptable",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "0302020"
                      ]
                    },
                    "message": {
                      "type": "string",
                      "enum": [
                        "Cannot create card under this business"
                      ]
                    },
                    "statusCode": {
                      "type": "number",
                      "format": "float",
                      "enum": [
                        406
                      ]
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "additionalProperties": false
                }
              }
            }
          },
          "500": {
            "description": "Internal Server Error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "http_error"
                      ]
                    },
                    "message": {
                      "type": "string",
                      "enum": [
                        "Failed to fetch entity"
                      ]
                    },
                    "statusCode": {
                      "type": "number",
                      "format": "float",
                      "enum": [
                        500
                      ]
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "additionalProperties": false
                }
              }
            }
          },
          "503": {
            "description": "Service Unavailable",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0302010"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Service has been paused due to system maintenance"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            503
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "http_timeout"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Request to fetch entity timed out"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            503
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
```