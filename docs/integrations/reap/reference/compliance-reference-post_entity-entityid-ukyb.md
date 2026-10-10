---
updatedAt: 2026-05-07T09:07:48.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Submit KYB Pack for a business entity

Submits the complete KYB for a business entity: the base pack (legal name, legal form, registration number, UBO declaration, registered address, principal place of business address, optional website, line of business, optional date of incorporation), with the due-diligence questionnaire and enhanced-diligence declarations optionally nested under `ddq` and `edd`. Use `PATCH` to amend an existing payload before submission.

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
      "post": {
        "summary": "Submit KYB Pack for a business entity",
        "description": "Submits the complete KYB for a business entity: the base pack (legal name, legal form, registration number, UBO declaration, registered address, principal place of business address, optional website, line of business, optional date of incorporation), with the due-diligence questionnaire and enhanced-diligence declarations optionally nested under `ddq` and `edd`. Use `PATCH` to amend an existing payload before submission.",
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
          "description": "Structured KYB Pack payload. The questionnaire and enhanced-diligence sections may be nested under `ddq` and `edd` to submit everything in one call.",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "legalBusinessName",
                  "legalFormOfCompany",
                  "businessRegistrationNumber",
                  "uboDeclaration",
                  "registeredAddress",
                  "principalPlaceOfBusinessAddress",
                  "validEmailDomains",
                  "lineOfBusiness",
                  "dateOfIncorporation"
                ],
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
            "description": "The KYB Pack has been successfully submitted for the entity.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "submittedRequirementId",
                    "payload",
                    "uboEntities"
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
                    },
                    "uboEntities": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": [
                          "externalUserId",
                          "entityId",
                          "ownershipPct"
                        ],
                        "properties": {
                          "externalUserId": {
                            "type": "string",
                            "example": "user-ext-12345",
                            "description": "Echoed from the declaration's `externalUserId`; always present. The one stable key for correlating an owner across `POST`, `PATCH` and `GET /ukyb` — `entityId` is reissued whenever `uboDeclaration` is replaced."
                          },
                          "entityId": {
                            "type": "string",
                            "format": "uuid",
                            "description": "The individual entity for this beneficial owner. Upload identity documents against it."
                          },
                          "ownershipPct": {
                            "type": "number",
                            "example": 60
                          }
                        }
                      },
                      "description": "The individual entities created for the declared beneficial owners, in the order they were submitted. Upload each owner’s identity document against their `entityId`. This endpoint accepts one submission per entity — a repeat returns `409` — so these ids are stable once returned, and amendments go through `PATCH /ukyb`."
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
          "409": {
            "description": "A KYB Pack has already been submitted for this entity. Use `PATCH /ukyb` to amend it. ",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string",
                      "example": "0301005409"
                    }
                  }
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