---
updatedAt: 2026-05-28T07:31:49.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Retrieve all cards

| Status                      | Definition                                             |
| --------------------------- | ------------------------------------------------------ |
| `NOT_PHYSICAL_CARD`         | The card is not a physical card.                       |
| `CARD_NOT_ORDERED`          | Card production has not been initiated.                |
| `CARD_PRODUCTION_REQUESTED` | A card production request was submitted. (Thales only) |
| `CARD_IN_PRODUCTION`        | Card personalization has started.                      |
| `CARD_PRODUCTION_COMPLETED` | Card has been personalized and is ready for shipment.  |
| `CARD_ACTIVATED`            | Card has been activated by the cardholder.             |
| `CARD_PRODUCTION_CANCELED`  | Production was canceled by the issuer. (Thales only)   |
| `CARD_PRODUCTION_ONHOLD`    | Production is on hold. (Thales only)                   |

`availableCredit`: The maximum amount allowed to spend during standard authorization. Does not impact real-time authorization.

Please refer to our [Idemia](https://reap.readme.io/docs/tracking-physical-card-production-and-shipping-process) and [Thales](https://reap.readme.io/docs/track-card-production-and-shipping-status) guides for more details about the card status.

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
      "get": {
        "summary": "Retrieve all cards",
        "tags": [
          "Card",
          "Swipe"
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
            "in": "query",
            "name": "page",
            "schema": {
              "type": "number",
              "format": "float",
              "default": 1
            }
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "number",
              "format": "float",
              "maximum": 100,
              "default": 10
            }
          },
          {
            "in": "query",
            "name": "status",
            "schema": {
              "type": "string",
              "description": "Comma-separated list of card statuses [ex: ACTIVE,FROZEN,DELETED,EXPIRED,BLOCKED,INACTIVE,INTERNAL_REVIEW_FAILED]"
            }
          },
          {
            "in": "query",
            "name": "metadataId",
            "schema": {
              "type": "string",
              "description": "Comma-separated list of card metadata IDs"
            }
          },
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
        "responses": {
          "200": {
            "description": "Return cards list for the user",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "cardName": {
                            "type": "string"
                          },
                          "secondaryCardName": {
                            "type": "string"
                          },
                          "cardType": {
                            "type": "string"
                          },
                          "last4": {
                            "type": "string"
                          },
                          "availableCredit": {
                            "type": "string"
                          },
                          "status": {
                            "type": "string",
                            "enum": [
                              "ACTIVE",
                              "DELETED",
                              "EXPIRED",
                              "FROZEN",
                              "INACTIVE",
                              "BLOCKED",
                              "INTERNAL_REVIEW_FAILED"
                            ]
                          },
                          "freezeReason": {
                            "type": "string"
                          },
                          "statusReason": {
                            "type": "string"
                          },
                          "physicalCardStatus": {
                            "type": "string",
                            "enum": [
                              "NOT_PHYSICAL_CARD",
                              "CARD_NOT_ORDERED",
                              "CARD_PRODUCTION_REQUESTED",
                              "CARD_IN_PRODUCTION",
                              "CARD_PRODUCTION_COMPLETED",
                              "CARD_ACTIVATED",
                              "CARD_PRODUCTION_CANCELED",
                              "CARD_PRODUCTION_ONHOLD"
                            ]
                          },
                          "shippingAddress": {
                            "type": "object",
                            "properties": {
                              "line1": {
                                "type": "string",
                                "maxLength": 50,
                                "description": "Address line 1 (e.g. flat, floor, building name)."
                              },
                              "line2": {
                                "type": "string",
                                "maxLength": 50,
                                "nullable": true,
                                "description": "Address line 2 (e.g. street, district)."
                              },
                              "zone": {
                                "type": "string",
                                "maxLength": 50,
                                "nullable": true,
                                "description": "State, county, province, or region."
                              },
                              "city": {
                                "type": "string",
                                "maxLength": 50,
                                "description": "City, district, or town of the delivery address."
                              },
                              "postalCode": {
                                "type": "string",
                                "maxLength": 10,
                                "description": "Postal code of the address. Only Arabic numerals **0-9**, Latin letters (A-Z, a-z), spaces, and hyphens (**-**) are allowed."
                              },
                              "country": {
                                "type": "string",
                                "minLength": 2,
                                "maxLength": 2,
                                "description": "Two-letter country code ([ISO 3166-1 Alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)).",
                                "example": "HK"
                              }
                            },
                            "required": [
                              "line1",
                              "city",
                              "postalCode",
                              "country"
                            ],
                            "additionalProperties": false,
                            "description": "A delivery address."
                          },
                          "spendControl": {
                            "type": "object",
                            "properties": {
                              "spendControlCap": {
                                "type": "object",
                                "properties": {
                                  "transactionLimit": {
                                    "type": "string",
                                    "description": "The updated maximum amount allowed per transaction."
                                  },
                                  "dailyLimit": {
                                    "type": "string",
                                    "description": "The updated total spend limit allowed per day."
                                  },
                                  "weeklyLimit": {
                                    "type": "string",
                                    "description": "The updated total spend limit allowed per week."
                                  },
                                  "monthlyLimit": {
                                    "type": "string",
                                    "description": "The updated total spend limit allowed per month."
                                  },
                                  "yearlyLimit": {
                                    "type": "string",
                                    "description": "The updated total spend limit allowed per year."
                                  },
                                  "allTimeLimit": {
                                    "type": "string",
                                    "description": "The updated total spend limit allowed over the card’s lifetime."
                                  }
                                },
                                "additionalProperties": false
                              },
                              "spendControlAmount": {
                                "type": "object",
                                "properties": {
                                  "dailySpent": {
                                    "type": "string"
                                  },
                                  "weeklySpent": {
                                    "type": "string"
                                  },
                                  "monthlySpent": {
                                    "type": "string"
                                  },
                                  "yearlySpent": {
                                    "type": "string"
                                  },
                                  "allTimeSpent": {
                                    "type": "string"
                                  }
                                },
                                "additionalProperties": false
                              },
                              "atmControl": {
                                "type": "object",
                                "properties": {
                                  "dailyFrequency": {
                                    "type": "string"
                                  },
                                  "dailyWithdrawal": {
                                    "type": "string"
                                  },
                                  "monthlyFrequency": {
                                    "type": "string"
                                  },
                                  "monthlyWithdrawal": {
                                    "type": "string"
                                  },
                                  "yearlyFrequency": {
                                    "type": "string"
                                  },
                                  "yearlyWithdrawal": {
                                    "type": "string"
                                  }
                                },
                                "additionalProperties": false
                              }
                            },
                            "additionalProperties": false
                          },
                          "threeDSForwarding": {
                            "type": "boolean"
                          },
                          "cardDesign": {
                            "type": "string",
                            "format": "uuid"
                          },
                          "bulkShippingId": {
                            "type": "string"
                          },
                          "meta": {
                            "type": "object",
                            "properties": {
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
                              },
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
                              }
                            },
                            "required": [
                              "id",
                              "otpPhoneNumber"
                            ],
                            "additionalProperties": false,
                            "description": "Any supplementary data about the cardholder, used to identify the user in Reap’s system. Examples include the cardholder’s type or preferences. A phone number and a client ID are required in this field."
                          }
                        },
                        "required": [
                          "id",
                          "cardName",
                          "cardType",
                          "last4",
                          "availableCredit",
                          "status",
                          "physicalCardStatus",
                          "shippingAddress"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "itemCount": {
                          "type": "number",
                          "format": "float",
                          "description": "The number of items returned on the current page."
                        },
                        "totalItems": {
                          "type": "number",
                          "format": "float",
                          "description": "The total number of items across all pages."
                        },
                        "itemsPerPage": {
                          "type": "number",
                          "format": "float",
                          "description": "The maximum number of items that can be returned per page."
                        },
                        "totalPages": {
                          "type": "number",
                          "format": "float",
                          "description": "The total number of pages available based on the **itemsPerPage** and **totalItems**."
                        },
                        "currentPage": {
                          "type": "number",
                          "format": "float",
                          "description": "The current page number in the paginated response."
                        }
                      },
                      "required": [
                        "itemCount",
                        "totalItems",
                        "itemsPerPage",
                        "totalPages",
                        "currentPage"
                      ],
                      "additionalProperties": false,
                      "description": "Pagination metadata for the response."
                    }
                  }
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
            "description": "Account not found",
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