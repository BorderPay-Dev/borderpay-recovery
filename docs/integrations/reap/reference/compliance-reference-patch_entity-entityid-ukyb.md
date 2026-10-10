---
updatedAt: 2026-09-15T07:19:51.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Amend a KYB payload before submission

Partially updates a KYB payload. The body is **deep-merged** into the stored payload: a provided field updates only that field at any nesting depth, leaving its siblings untouched, so you can amend one `edd` declaration without resending the other. **Arrays are replaced wholesale** — sending `uboDeclaration`, a UBO’s nested `document`, or `cardAuthorities` swaps the whole list, dropping any entry absent from the new array. Because arrays are never merged entry by entry, **each beneficial owner you send must be complete**: a partially-populated owner is rejected with every gap listed, not merged over the one already stored. Unknown top-level keys and an empty body are rejected. Because an omitted key is left alone, an optional field cannot be cleared once set. Every change is stored as a new submission, preserving history. Rejected with 409 once the KYB has been submitted and is no longer editable.

**Sending `uboDeclaration` replaces the beneficial owners.** `POST /ukyb` accepts one submission per entity, so this is the only way to change the set afterwards. The replace is destructive: the existing owners’ individual entities are retired and rebuilt, so any identity documents already uploaded against their old `entityId` values are discarded. The response carries `uboEntities` with the **new** ids — upload each owner’s documents against those. Omit `uboDeclaration` and the owners are left untouched, and `uboEntities` is absent from the response.

**`registeredAddress` and `principalPlaceOfBusinessAddress` are merged field by field, not replaced.** Sending `{ "registeredAddress": { "country": "USA" } }` updates only `country` and leaves `line1`, `city` and any other already-stored fields as they were — so changing a country without also resending the fields that depend on it (e.g. `postalCode`, `state`) can leave the stored address internally inconsistent. Send the complete address object when changing anything about it.

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Reap Compliance API",
    "version": "1.0.1",
    "description": "Compliance API",
    "contact": {
      "name": "Reap Engineers",
      "email": "reap-card-engineers@reap.hk"
    }
  },
  "servers": [
    {
      "url": "https://sandbox-compliance.api.reap.global",
      "description": "Sandbox server"
    },
    {
      "url": "https://compliance.api.reap.global",
      "description": "Production server - Allowlist only"
    },
    {
      "url": "https://staging-compliance.api.reap.global",
      "description": "Staging server"
    }
  ],
  "tags": [
    {
      "name": "Universal KYB",
      "description": "Submit KYB Pack data for business entities"
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
    "/entity/{entityId}/ukyb": {
      "patch": {
        "summary": "Amend a KYB payload before submission",
        "description": "Partially updates a KYB payload. The body is **deep-merged** into the stored payload: a provided field updates only that field at any nesting depth, leaving its siblings untouched, so you can amend one `edd` declaration without resending the other. **Arrays are replaced wholesale** — sending `uboDeclaration`, a UBO’s nested `document`, or `cardAuthorities` swaps the whole list, dropping any entry absent from the new array. Because arrays are never merged entry by entry, **each beneficial owner you send must be complete**: a partially-populated owner is rejected with every gap listed, not merged over the one already stored. Unknown top-level keys and an empty body are rejected. Because an omitted key is left alone, an optional field cannot be cleared once set. Every change is stored as a new submission, preserving history. Rejected with 409 once the KYB has been submitted and is no longer editable.\n\n**Sending `uboDeclaration` replaces the beneficial owners.** `POST /ukyb` accepts one submission per entity, so this is the only way to change the set afterwards. The replace is destructive: the existing owners’ individual entities are retired and rebuilt, so any identity documents already uploaded against their old `entityId` values are discarded. The response carries `uboEntities` with the **new** ids — upload each owner’s documents against those. Omit `uboDeclaration` and the owners are left untouched, and `uboEntities` is absent from the response.\n\n**`registeredAddress` and `principalPlaceOfBusinessAddress` are merged field by field, not replaced.** Sending `{ \"registeredAddress\": { \"country\": \"USA\" } }` updates only `country` and leaves `line1`, `city` and any other already-stored fields as they were — so changing a country without also resending the fields that depend on it (e.g. `postalCode`, `state`) can leave the stored address internally inconsistent. Send the complete address object when changing anything about it.",
        "tags": [
          "Universal KYB"
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
            "name": "entityId",
            "in": "path",
            "required": true,
            "description": "The unique identifier (UUID) of the business entity.",
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "requestBody": {
          "description": "Any subset of the KYB payload. At least one key is required.",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "minProperties": 1,
                "additionalProperties": false,
                "properties": {
                  "legalBusinessName": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 200,
                    "example": "Acme Trading Pte. Ltd.",
                    "description": "Full legal registered name, exactly as shown on the Certificate of Incorporation."
                  },
                  "legalFormOfCompany": {
                    "type": "string",
                    "enum": [
                      "PRIVATE_LIMITED",
                      "PUBLIC_LIMITED",
                      "LLC",
                      "LLP",
                      "PARTNERSHIP",
                      "SOLE_PROPRIETORSHIP",
                      "TRUST",
                      "CORPORATE",
                      "OTHER"
                    ],
                    "example": "PRIVATE_LIMITED",
                    "description": "Controlled list of legal entity forms."
                  },
                  "businessRegistrationNumber": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100,
                    "example": "201912345Z",
                    "description": "Government-issued business registration number."
                  },
                  "uboDeclaration": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 50,
                    "items": {
                      "type": "object",
                      "required": [
                        "externalUserId",
                        "ownershipPct",
                        "identity",
                        "document",
                        "address"
                      ],
                      "description": "An Ultimate Beneficial Owner of the business, carrying full KYC. **Every field is required** — a partially-populated owner is rejected, with all gaps reported together. Each declared owner is created as its own individual entity; the returned `uboEntities[].entityId` is what identity documents for that person must be uploaded against. Submitting this array **replaces the entire previously declared set**: every owner is recreated with a new `entityId`, and any documents previously uploaded against the old ids are removed. Re-upload after every submission that includes this field.",
                      "properties": {
                        "externalUserId": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 100,
                          "example": "user-ext-12345",
                          "description": "Required. Your own identifier for this person. Echoed back in the response so you can correlate owners without relying on array order."
                        },
                        "ownershipPct": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 100,
                          "example": 60,
                          "description": "Ownership percentage as a decimal between 0 and 100. Represented as a percentage (60 = 60%), not a fraction. Stored to two decimal places."
                        },
                        "identity": {
                          "type": "object",
                          "required": [
                            "firstName",
                            "lastName",
                            "fullName",
                            "dob",
                            "nationality"
                          ],
                          "properties": {
                            "firstName": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Jose"
                            },
                            "middleName": {
                              "type": "string",
                              "maxLength": 100,
                              "example": "Luis"
                            },
                            "lastName": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Garcia"
                            },
                            "fullName": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 200,
                              "example": "Jose Luis Garcia"
                            },
                            "dob": {
                              "type": "string",
                              "format": "date",
                              "example": "1992-04-15",
                              "description": "Date of birth (YYYY-MM-DD). The owner must be at least 18 years old."
                            },
                            "nationality": {
                              "type": "string",
                              "minLength": 3,
                              "maxLength": 3,
                              "example": "MEX",
                              "description": "ISO 3166-1 alpha-3 country code."
                            }
                          },
                          "description": "Every field is required for every declared owner. `middleName` is the only optional field."
                        },
                        "document": {
                          "type": "array",
                          "minItems": 1,
                          "maxItems": 3,
                          "items": {
                            "type": "object",
                            "required": [
                              "documentCategory",
                              "type",
                              "number",
                              "country"
                            ],
                            "properties": {
                              "documentCategory": {
                                "type": "string",
                                "enum": [
                                  "IDV"
                                ],
                                "example": "IDV",
                                "description": "Always `IDV` — a beneficial owner’s document establishes identity, not address."
                              },
                              "type": {
                                "type": "string",
                                "enum": [
                                  "PASSPORT",
                                  "ID_CARD",
                                  "DRIVERS_LICENCE"
                                ],
                                "example": "PASSPORT",
                                "description": "The kind of identity document. Must equal the `uboDocumentType` sent when this owner’s document is uploaded — submission compares the two."
                              },
                              "number": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 50,
                                "example": "A12345678"
                              },
                              "country": {
                                "type": "string",
                                "minLength": 3,
                                "maxLength": 3,
                                "example": "MEX"
                              },
                              "issuingDate": {
                                "type": "string",
                                "format": "date",
                                "example": "2020-01-10"
                              },
                              "expiryDate": {
                                "type": "string",
                                "format": "date",
                                "example": "2030-01-09"
                              }
                            }
                          },
                          "description": "Required. Between 1 and 3 identity documents per owner. Replaced wholesale on `PATCH`, never merged entry by entry."
                        },
                        "address": {
                          "type": "object",
                          "required": [
                            "country",
                            "formattedAddress"
                          ],
                          "properties": {
                            "country": {
                              "type": "string",
                              "minLength": 3,
                              "maxLength": 3,
                              "example": "MEX"
                            },
                            "postCode": {
                              "type": "string",
                              "maxLength": 20,
                              "example": "01000"
                            },
                            "town": {
                              "type": "string",
                              "maxLength": 100,
                              "example": "Ciudad de Mexico"
                            },
                            "street": {
                              "type": "string",
                              "maxLength": 200,
                              "example": "Av. Reforma"
                            },
                            "subStreet": {
                              "type": "string",
                              "maxLength": 200,
                              "example": "Col. Juarez"
                            },
                            "state": {
                              "type": "string",
                              "maxLength": 100,
                              "example": "CDMX"
                            },
                            "buildingName": {
                              "type": "string",
                              "maxLength": 100,
                              "example": "Torre Reforma"
                            },
                            "flatNumber": {
                              "type": "string",
                              "maxLength": 20,
                              "example": "12A"
                            },
                            "buildingNumber": {
                              "type": "string",
                              "maxLength": 20,
                              "example": "100"
                            },
                            "formattedAddress": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 500,
                              "example": "Av. Reforma 100, Col. Juarez, Ciudad de Mexico, CDMX, 01000, MEX"
                            }
                          }
                        }
                      }
                    },
                    "description": "Ultimate Beneficial Owners with 25%+ ownership or control. At least one entry is required — an empty array is rejected. Supplying this field replaces the whole set; omit it on a PATCH to leave the existing owners untouched."
                  },
                  "registeredAddress": {
                    "type": "object",
                    "required": [
                      "line1",
                      "city",
                      "country"
                    ],
                    "properties": {
                      "line1": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 200,
                        "example": "10 Anson Road"
                      },
                      "line2": {
                        "type": "string",
                        "maxLength": 200,
                        "example": "#12-01",
                        "description": "Optional second line of the street address."
                      },
                      "city": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "example": "Singapore"
                      },
                      "state": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "Optional state, province or region."
                      },
                      "postalCode": {
                        "type": "string",
                        "maxLength": 20,
                        "example": "079903",
                        "description": "Optional postal code."
                      },
                      "country": {
                        "type": "string",
                        "minLength": 3,
                        "maxLength": 3,
                        "example": "SGP",
                        "description": "ISO 3166-1 alpha-3 country code."
                      }
                    },
                    "description": "The address on record with the company registrar (the Certificate of Incorporation address)."
                  },
                  "principalPlaceOfBusinessAddress": {
                    "type": "object",
                    "required": [
                      "line1",
                      "city",
                      "country"
                    ],
                    "properties": {
                      "line1": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 200,
                        "example": "10 Anson Road"
                      },
                      "line2": {
                        "type": "string",
                        "maxLength": 200,
                        "example": "#12-01",
                        "description": "Optional second line of the street address."
                      },
                      "city": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 100,
                        "example": "Singapore"
                      },
                      "state": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "Optional state, province or region."
                      },
                      "postalCode": {
                        "type": "string",
                        "maxLength": 20,
                        "example": "079903",
                        "description": "Optional postal code."
                      },
                      "country": {
                        "type": "string",
                        "minLength": 3,
                        "maxLength": 3,
                        "example": "SGP",
                        "description": "ISO 3166-1 alpha-3 country code."
                      }
                    },
                    "description": "Where the business actually trades. May differ from `registeredAddress`."
                  },
                  "businessWebsiteUrl": {
                    "type": "string",
                    "format": "uri",
                    "maxLength": 500,
                    "example": "https://acme.example",
                    "description": "Optional business website URL."
                  },
                  "validEmailDomains": {
                    "type": "array",
                    "minItems": 1,
                    "maxItems": 10,
                    "items": {
                      "type": "string",
                      "example": "acme.example"
                    },
                    "example": [
                      "acme.example",
                      "acme.co.uk"
                    ],
                    "description": "Email domains whose employees may be issued cards for this business. Required — at least one, at most 10. Each entry must be a bare domain name such as `acme.example`: no scheme, path, `@` or whitespace. Values are normalised (lowercased, a leading `www.` removed) and de-duplicated, so the stored list may be shorter than the one submitted. Supplying this field replaces the whole list."
                  },
                  "lineOfBusiness": {
                    "type": "string",
                    "enum": [
                      "PROFESSIONAL_SERVICES",
                      "CONSULTING_SERVICES",
                      "HUMAN_RESOURCES_RECRUITMENT",
                      "BUSINESS_PROCESS_OUTSOURCING",
                      "RESEARCH_DEVELOPMENT",
                      "INFORMATION_TECHNOLOGY_SOFTWARE",
                      "TELECOMMUNICATIONS",
                      "RETAIL_TRADE",
                      "WHOLESALE_TRADE",
                      "E_COMMERCE",
                      "MANUFACTURING",
                      "CONSTRUCTION_ENGINEERING",
                      "LOGISTICS_TRANSPORTATION",
                      "HEALTHCARE_SERVICES",
                      "EDUCATION_TRAINING",
                      "REAL_ESTATE_SERVICES",
                      "HOSPITALITY_TOURISM",
                      "MEDIA_ADVERTISING",
                      "AGRICULTURE_FARMING",
                      "FINTECH",
                      "PAYMENT_SERVICE_PROVIDER",
                      "MONEY_SERVICES_BUSINESS_REMITTANCE",
                      "FOREIGN_EXCHANGE_SERVICES",
                      "INSURANCE",
                      "LENDING_CREDIT_SERVICES",
                      "INVESTMENT_ASSET_MANAGEMENT",
                      "REGULATED_FINANCIAL_SERVICES_LICENSE_REQUIRED",
                      "VIRTUAL_ASSET_SERVICE_PROVIDER",
                      "CRYPTOCURRENCY_EXCHANGE",
                      "BLOCKCHAIN_INFRASTRUCTURE",
                      "DIGITAL_ASSET_CUSTODY",
                      "DECENTRALISED_FINANCE",
                      "GOVERNMENT_ENTITY",
                      "STATE_OWNED_ENTERPRISE",
                      "INTERNATIONAL_ORGANISATION",
                      "NON_PROFIT_ORGANISATION",
                      "CHARITY_FOUNDATION",
                      "GAMING_GAMBLING",
                      "ADULT_ENTERTAINMENT",
                      "PRECIOUS_METALS_STONES",
                      "AUCTION_HOUSE_ART_DEALER",
                      "CASH_INTENSIVE_BUSINESS",
                      "POLITICALLY_EXPOSED_ORGANISATION",
                      "TRUST_COMPANY_SERVICE_PROVIDER",
                      "HOLDING_COMPANY",
                      "FAMILY_OFFICE",
                      "CONGLOMERATE",
                      "OTHER"
                    ],
                    "example": "INFORMATION_TECHNOLOGY_SOFTWARE",
                    "description": "Controlled business-classification code."
                  },
                  "dateOfIncorporation": {
                    "type": "string",
                    "format": "date",
                    "example": "2015-06-01",
                    "description": "Date the business was incorporated (YYYY-MM-DD). Must not be in the future."
                  },
                  "ddq": {
                    "type": "object",
                    "required": [
                      "cardAuthorities",
                      "expectedSpendProfile"
                    ],
                    "properties": {
                      "cardAuthorities": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 50,
                        "items": {
                          "type": "object",
                          "required": [
                            "fullName",
                            "role"
                          ],
                          "properties": {
                            "fullName": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Jordan Lee"
                            },
                            "role": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Admin"
                            }
                          }
                        },
                        "description": "Card program authority matrix — who can operate on the cards."
                      },
                      "expectedSpendProfile": {
                        "type": "object",
                        "required": [
                          "spendBuckets"
                        ],
                        "properties": {
                          "spendBuckets": {
                            "type": "array",
                            "minItems": 1,
                            "maxItems": 50,
                            "items": {
                              "type": "object",
                              "required": [
                                "name",
                                "expectedSpendUsd"
                              ],
                              "properties": {
                                "name": {
                                  "type": "string",
                                  "minLength": 1,
                                  "maxLength": 200,
                                  "example": "Marketing"
                                },
                                "expectedSpendUsd": {
                                  "type": "number",
                                  "minimum": 0,
                                  "example": 25000,
                                  "description": "Expected spend in USD."
                                },
                                "jurisdictionIso": {
                                  "type": "string",
                                  "minLength": 3,
                                  "maxLength": 3,
                                  "example": "SGP",
                                  "description": "Optional ISO 3166-1 alpha-3 country code where services are consumed or billed."
                                },
                                "txnPattern": {
                                  "type": "object",
                                  "properties": {
                                    "frequency": {
                                      "type": "string",
                                      "minLength": 1,
                                      "maxLength": 50,
                                      "example": "monthly",
                                      "description": "Optional. Free-form transaction frequency descriptor (e.g. daily, weekly, monthly)."
                                    },
                                    "avgTicketUsd": {
                                      "type": "number",
                                      "minimum": 0,
                                      "example": 2000,
                                      "description": "Optional. Average ticket size in USD."
                                    },
                                    "peakDays": {
                                      "type": "array",
                                      "maxItems": 7,
                                      "items": {
                                        "type": "string",
                                        "enum": [
                                          "MON",
                                          "TUE",
                                          "WED",
                                          "THU",
                                          "FRI",
                                          "SAT",
                                          "SUN"
                                        ],
                                        "example": "MON",
                                        "description": "3-letter day-of-week code. Lowercase input is uppercased."
                                      },
                                      "description": "Optional. Up to 7 day-of-week codes (MON–SUN)."
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      "numberOfEmployees": {
                        "type": "integer",
                        "minimum": 0,
                        "example": 100,
                        "description": "Total headcount of the business at time of submission."
                      }
                    },
                    "description": "Optional Due Diligence Questionnaire, submitted in the same call."
                  },
                  "edd": {
                    "type": "object",
                    "required": [
                      "sourceOfFundsDeclaration",
                      "sourceOfWealthDeclaration"
                    ],
                    "properties": {
                      "sourceOfFundsDeclaration": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 5000,
                        "example": "Revenue from subscription payments received from customers.",
                        "description": "Free-form declaration describing the source of funds. Required."
                      },
                      "sourceOfWealthDeclaration": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 5000,
                        "example": "Founder capital injection and retained earnings from prior-year operations.",
                        "description": "Free-form declaration describing the source of wealth. Required."
                      }
                    },
                    "description": "Optional Enhanced Due Diligence declarations, submitted in the same call."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The amendment was applied. Responds with the full merged payload, plus `uboEntities` when the request replaced the beneficial owners.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "submittedRequirementId",
                    "payload"
                  ],
                  "properties": {
                    "submittedRequirementId": {
                      "type": "string",
                      "format": "uuid",
                      "description": "UUID of the submission this call created. Every change creates a new one, preserving history."
                    },
                    "payload": {
                      "type": "object",
                      "description": "The complete KYB payload exactly as stored. Values are returned post-validation, so country codes are upper-cased, strings trimmed and unknown fields removed — compare against this rather than against what you sent.",
                      "properties": {
                        "legalBusinessName": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 200,
                          "example": "Acme Trading Pte. Ltd.",
                          "description": "Full legal registered name, exactly as shown on the Certificate of Incorporation."
                        },
                        "legalFormOfCompany": {
                          "type": "string",
                          "enum": [
                            "PRIVATE_LIMITED",
                            "PUBLIC_LIMITED",
                            "LLC",
                            "LLP",
                            "PARTNERSHIP",
                            "SOLE_PROPRIETORSHIP",
                            "TRUST",
                            "CORPORATE",
                            "OTHER"
                          ],
                          "example": "PRIVATE_LIMITED",
                          "description": "Controlled list of legal entity forms."
                        },
                        "businessRegistrationNumber": {
                          "type": "string",
                          "minLength": 1,
                          "maxLength": 100,
                          "example": "201912345Z",
                          "description": "Government-issued business registration number."
                        },
                        "uboDeclaration": {
                          "type": "array",
                          "minItems": 1,
                          "maxItems": 50,
                          "items": {
                            "type": "object",
                            "required": [
                              "externalUserId",
                              "ownershipPct",
                              "identity",
                              "document",
                              "address"
                            ],
                            "description": "An Ultimate Beneficial Owner of the business, carrying full KYC. **Every field is required** — a partially-populated owner is rejected, with all gaps reported together. Each declared owner is created as its own individual entity; the returned `uboEntities[].entityId` is what identity documents for that person must be uploaded against. Submitting this array **replaces the entire previously declared set**: every owner is recreated with a new `entityId`, and any documents previously uploaded against the old ids are removed. Re-upload after every submission that includes this field.",
                            "properties": {
                              "externalUserId": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 100,
                                "example": "user-ext-12345",
                                "description": "Required. Your own identifier for this person. Echoed back in the response so you can correlate owners without relying on array order."
                              },
                              "ownershipPct": {
                                "type": "number",
                                "minimum": 0,
                                "maximum": 100,
                                "example": 60,
                                "description": "Ownership percentage as a decimal between 0 and 100. Represented as a percentage (60 = 60%), not a fraction. Stored to two decimal places."
                              },
                              "identity": {
                                "type": "object",
                                "required": [
                                  "firstName",
                                  "lastName",
                                  "fullName",
                                  "dob",
                                  "nationality"
                                ],
                                "properties": {
                                  "firstName": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 100,
                                    "example": "Jose"
                                  },
                                  "middleName": {
                                    "type": "string",
                                    "maxLength": 100,
                                    "example": "Luis"
                                  },
                                  "lastName": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 100,
                                    "example": "Garcia"
                                  },
                                  "fullName": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 200,
                                    "example": "Jose Luis Garcia"
                                  },
                                  "dob": {
                                    "type": "string",
                                    "format": "date",
                                    "example": "1992-04-15",
                                    "description": "Date of birth (YYYY-MM-DD). The owner must be at least 18 years old."
                                  },
                                  "nationality": {
                                    "type": "string",
                                    "minLength": 3,
                                    "maxLength": 3,
                                    "example": "MEX",
                                    "description": "ISO 3166-1 alpha-3 country code."
                                  }
                                },
                                "description": "Every field is required for every declared owner. `middleName` is the only optional field."
                              },
                              "document": {
                                "type": "array",
                                "minItems": 1,
                                "maxItems": 3,
                                "items": {
                                  "type": "object",
                                  "required": [
                                    "documentCategory",
                                    "type",
                                    "number",
                                    "country"
                                  ],
                                  "properties": {
                                    "documentCategory": {
                                      "type": "string",
                                      "enum": [
                                        "IDV"
                                      ],
                                      "example": "IDV",
                                      "description": "Always `IDV` — a beneficial owner’s document establishes identity, not address."
                                    },
                                    "type": {
                                      "type": "string",
                                      "enum": [
                                        "PASSPORT",
                                        "ID_CARD",
                                        "DRIVERS_LICENCE"
                                      ],
                                      "example": "PASSPORT",
                                      "description": "The kind of identity document. Must equal the `uboDocumentType` sent when this owner’s document is uploaded — submission compares the two."
                                    },
                                    "number": {
                                      "type": "string",
                                      "minLength": 1,
                                      "maxLength": 50,
                                      "example": "A12345678"
                                    },
                                    "country": {
                                      "type": "string",
                                      "minLength": 3,
                                      "maxLength": 3,
                                      "example": "MEX"
                                    },
                                    "issuingDate": {
                                      "type": "string",
                                      "format": "date",
                                      "example": "2020-01-10"
                                    },
                                    "expiryDate": {
                                      "type": "string",
                                      "format": "date",
                                      "example": "2030-01-09"
                                    }
                                  }
                                },
                                "description": "Required. Between 1 and 3 identity documents per owner. Replaced wholesale on `PATCH`, never merged entry by entry."
                              },
                              "address": {
                                "type": "object",
                                "required": [
                                  "country",
                                  "formattedAddress"
                                ],
                                "properties": {
                                  "country": {
                                    "type": "string",
                                    "minLength": 3,
                                    "maxLength": 3,
                                    "example": "MEX"
                                  },
                                  "postCode": {
                                    "type": "string",
                                    "maxLength": 20,
                                    "example": "01000"
                                  },
                                  "town": {
                                    "type": "string",
                                    "maxLength": 100,
                                    "example": "Ciudad de Mexico"
                                  },
                                  "street": {
                                    "type": "string",
                                    "maxLength": 200,
                                    "example": "Av. Reforma"
                                  },
                                  "subStreet": {
                                    "type": "string",
                                    "maxLength": 200,
                                    "example": "Col. Juarez"
                                  },
                                  "state": {
                                    "type": "string",
                                    "maxLength": 100,
                                    "example": "CDMX"
                                  },
                                  "buildingName": {
                                    "type": "string",
                                    "maxLength": 100,
                                    "example": "Torre Reforma"
                                  },
                                  "flatNumber": {
                                    "type": "string",
                                    "maxLength": 20,
                                    "example": "12A"
                                  },
                                  "buildingNumber": {
                                    "type": "string",
                                    "maxLength": 20,
                                    "example": "100"
                                  },
                                  "formattedAddress": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 500,
                                    "example": "Av. Reforma 100, Col. Juarez, Ciudad de Mexico, CDMX, 01000, MEX"
                                  }
                                }
                              }
                            }
                          },
                          "description": "Ultimate Beneficial Owners with 25%+ ownership or control. At least one entry is required — an empty array is rejected. Supplying this field replaces the whole set; omit it on a PATCH to leave the existing owners untouched."
                        },
                        "registeredAddress": {
                          "type": "object",
                          "required": [
                            "line1",
                            "city",
                            "country"
                          ],
                          "properties": {
                            "line1": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 200,
                              "example": "10 Anson Road"
                            },
                            "line2": {
                              "type": "string",
                              "maxLength": 200,
                              "example": "#12-01",
                              "description": "Optional second line of the street address."
                            },
                            "city": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Singapore"
                            },
                            "state": {
                              "type": "string",
                              "maxLength": 100,
                              "description": "Optional state, province or region."
                            },
                            "postalCode": {
                              "type": "string",
                              "maxLength": 20,
                              "example": "079903",
                              "description": "Optional postal code."
                            },
                            "country": {
                              "type": "string",
                              "minLength": 3,
                              "maxLength": 3,
                              "example": "SGP",
                              "description": "ISO 3166-1 alpha-3 country code."
                            }
                          },
                          "description": "The address on record with the company registrar (the Certificate of Incorporation address)."
                        },
                        "principalPlaceOfBusinessAddress": {
                          "type": "object",
                          "required": [
                            "line1",
                            "city",
                            "country"
                          ],
                          "properties": {
                            "line1": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 200,
                              "example": "10 Anson Road"
                            },
                            "line2": {
                              "type": "string",
                              "maxLength": 200,
                              "example": "#12-01",
                              "description": "Optional second line of the street address."
                            },
                            "city": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 100,
                              "example": "Singapore"
                            },
                            "state": {
                              "type": "string",
                              "maxLength": 100,
                              "description": "Optional state, province or region."
                            },
                            "postalCode": {
                              "type": "string",
                              "maxLength": 20,
                              "example": "079903",
                              "description": "Optional postal code."
                            },
                            "country": {
                              "type": "string",
                              "minLength": 3,
                              "maxLength": 3,
                              "example": "SGP",
                              "description": "ISO 3166-1 alpha-3 country code."
                            }
                          },
                          "description": "Where the business actually trades. May differ from `registeredAddress`."
                        },
                        "businessWebsiteUrl": {
                          "type": "string",
                          "format": "uri",
                          "maxLength": 500,
                          "example": "https://acme.example",
                          "description": "Optional business website URL."
                        },
                        "validEmailDomains": {
                          "type": "array",
                          "minItems": 1,
                          "maxItems": 10,
                          "items": {
                            "type": "string",
                            "example": "acme.example"
                          },
                          "example": [
                            "acme.example",
                            "acme.co.uk"
                          ],
                          "description": "Email domains whose employees may be issued cards for this business. Required — at least one, at most 10. Each entry must be a bare domain name such as `acme.example`: no scheme, path, `@` or whitespace. Values are normalised (lowercased, a leading `www.` removed) and de-duplicated, so the stored list may be shorter than the one submitted. Supplying this field replaces the whole list."
                        },
                        "lineOfBusiness": {
                          "type": "string",
                          "enum": [
                            "PROFESSIONAL_SERVICES",
                            "CONSULTING_SERVICES",
                            "HUMAN_RESOURCES_RECRUITMENT",
                            "BUSINESS_PROCESS_OUTSOURCING",
                            "RESEARCH_DEVELOPMENT",
                            "INFORMATION_TECHNOLOGY_SOFTWARE",
                            "TELECOMMUNICATIONS",
                            "RETAIL_TRADE",
                            "WHOLESALE_TRADE",
                            "E_COMMERCE",
                            "MANUFACTURING",
                            "CONSTRUCTION_ENGINEERING",
                            "LOGISTICS_TRANSPORTATION",
                            "HEALTHCARE_SERVICES",
                            "EDUCATION_TRAINING",
                            "REAL_ESTATE_SERVICES",
                            "HOSPITALITY_TOURISM",
                            "MEDIA_ADVERTISING",
                            "AGRICULTURE_FARMING",
                            "FINTECH",
                            "PAYMENT_SERVICE_PROVIDER",
                            "MONEY_SERVICES_BUSINESS_REMITTANCE",
                            "FOREIGN_EXCHANGE_SERVICES",
                            "INSURANCE",
                            "LENDING_CREDIT_SERVICES",
                            "INVESTMENT_ASSET_MANAGEMENT",
                            "REGULATED_FINANCIAL_SERVICES_LICENSE_REQUIRED",
                            "VIRTUAL_ASSET_SERVICE_PROVIDER",
                            "CRYPTOCURRENCY_EXCHANGE",
                            "BLOCKCHAIN_INFRASTRUCTURE",
                            "DIGITAL_ASSET_CUSTODY",
                            "DECENTRALISED_FINANCE",
                            "GOVERNMENT_ENTITY",
                            "STATE_OWNED_ENTERPRISE",
                            "INTERNATIONAL_ORGANISATION",
                            "NON_PROFIT_ORGANISATION",
                            "CHARITY_FOUNDATION",
                            "GAMING_GAMBLING",
                            "ADULT_ENTERTAINMENT",
                            "PRECIOUS_METALS_STONES",
                            "AUCTION_HOUSE_ART_DEALER",
                            "CASH_INTENSIVE_BUSINESS",
                            "POLITICALLY_EXPOSED_ORGANISATION",
                            "TRUST_COMPANY_SERVICE_PROVIDER",
                            "HOLDING_COMPANY",
                            "FAMILY_OFFICE",
                            "CONGLOMERATE",
                            "OTHER"
                          ],
                          "example": "INFORMATION_TECHNOLOGY_SOFTWARE",
                          "description": "Controlled business-classification code."
                        },
                        "dateOfIncorporation": {
                          "type": "string",
                          "format": "date",
                          "example": "2015-06-01",
                          "description": "Date the business was incorporated (YYYY-MM-DD). Must not be in the future."
                        },
                        "ddq": {
                          "type": "object",
                          "required": [
                            "cardAuthorities",
                            "expectedSpendProfile"
                          ],
                          "properties": {
                            "cardAuthorities": {
                              "type": "array",
                              "minItems": 1,
                              "maxItems": 50,
                              "items": {
                                "type": "object",
                                "required": [
                                  "fullName",
                                  "role"
                                ],
                                "properties": {
                                  "fullName": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 100,
                                    "example": "Jordan Lee"
                                  },
                                  "role": {
                                    "type": "string",
                                    "minLength": 1,
                                    "maxLength": 100,
                                    "example": "Admin"
                                  }
                                }
                              },
                              "description": "Card program authority matrix — who can operate on the cards."
                            },
                            "expectedSpendProfile": {
                              "type": "object",
                              "required": [
                                "spendBuckets"
                              ],
                              "properties": {
                                "spendBuckets": {
                                  "type": "array",
                                  "minItems": 1,
                                  "maxItems": 50,
                                  "items": {
                                    "type": "object",
                                    "required": [
                                      "name",
                                      "expectedSpendUsd"
                                    ],
                                    "properties": {
                                      "name": {
                                        "type": "string",
                                        "minLength": 1,
                                        "maxLength": 200,
                                        "example": "Marketing"
                                      },
                                      "expectedSpendUsd": {
                                        "type": "number",
                                        "minimum": 0,
                                        "example": 25000,
                                        "description": "Expected spend in USD."
                                      },
                                      "jurisdictionIso": {
                                        "type": "string",
                                        "minLength": 3,
                                        "maxLength": 3,
                                        "example": "SGP",
                                        "description": "Optional ISO 3166-1 alpha-3 country code where services are consumed or billed."
                                      },
                                      "txnPattern": {
                                        "type": "object",
                                        "properties": {
                                          "frequency": {
                                            "type": "string",
                                            "minLength": 1,
                                            "maxLength": 50,
                                            "example": "monthly",
                                            "description": "Optional. Free-form transaction frequency descriptor (e.g. daily, weekly, monthly)."
                                          },
                                          "avgTicketUsd": {
                                            "type": "number",
                                            "minimum": 0,
                                            "example": 2000,
                                            "description": "Optional. Average ticket size in USD."
                                          },
                                          "peakDays": {
                                            "type": "array",
                                            "maxItems": 7,
                                            "items": {
                                              "type": "string",
                                              "enum": [
                                                "MON",
                                                "TUE",
                                                "WED",
                                                "THU",
                                                "FRI",
                                                "SAT",
                                                "SUN"
                                              ],
                                              "example": "MON",
                                              "description": "3-letter day-of-week code. Lowercase input is uppercased."
                                            },
                                            "description": "Optional. Up to 7 day-of-week codes (MON–SUN)."
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            "numberOfEmployees": {
                              "type": "integer",
                              "minimum": 0,
                              "example": 100,
                              "description": "Total headcount of the business at time of submission."
                            }
                          },
                          "description": "Optional Due Diligence Questionnaire, submitted in the same call."
                        },
                        "edd": {
                          "type": "object",
                          "required": [
                            "sourceOfFundsDeclaration",
                            "sourceOfWealthDeclaration"
                          ],
                          "properties": {
                            "sourceOfFundsDeclaration": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 5000,
                              "example": "Revenue from subscription payments received from customers.",
                              "description": "Free-form declaration describing the source of funds. Required."
                            },
                            "sourceOfWealthDeclaration": {
                              "type": "string",
                              "minLength": 1,
                              "maxLength": 5000,
                              "example": "Founder capital injection and retained earnings from prior-year operations.",
                              "description": "Free-form declaration describing the source of wealth. Required."
                            }
                          },
                          "description": "Optional Enhanced Due Diligence declarations, submitted in the same call."
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "The payload was rejected. Every problem found across the pack, questionnaire and enhanced-diligence sections is listed together, so a client can fix them in one pass rather than resubmitting to discover the next.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "code",
                    "missing",
                    "invalid"
                  ],
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "INCOMPLETE_KYB"
                      ]
                    },
                    "missing": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Requirement slugs with no value at all.",
                      "example": []
                    },
                    "invalid": {
                      "type": "array",
                      "description": "Requirement slugs whose value was present but did not validate.",
                      "items": {
                        "type": "object",
                        "required": [
                          "slug",
                          "issues"
                        ],
                        "properties": {
                          "slug": {
                            "type": "string",
                            "example": "ukyb-pack"
                          },
                          "issues": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "required": [
                                "path",
                                "message"
                              ],
                              "properties": {
                                "path": {
                                  "type": "string",
                                  "example": "uboDeclaration"
                                },
                                "message": {
                                  "type": "string",
                                  "example": "Array must contain at least 1 element(s)"
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden | Missing authentication",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "statusCode": {
                      "type": "integer"
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "code",
                    "message",
                    "statusCode"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string"
                    },
                    "message": {
                      "type": "string"
                    },
                    "statusCode": {
                      "type": "integer"
                    },
                    "parameter": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "code",
                    "message",
                    "statusCode"
                  ],
                  "additionalProperties": false
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