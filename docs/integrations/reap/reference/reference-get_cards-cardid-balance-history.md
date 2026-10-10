---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Card Balance History

> ℹ️ Endpoint Access Restriction
>
> Only applicable for accounts on
>
> * **Authorisation Model:** Standard Authorisation

<br />

*Note: Card balance history is available for deposits and withdrawals made on**April 19th, 2024.** or after.*

`txnHash`is only for enduser top up wallet funding model.

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
    "/cards/{cardId}/balance-history": {
      "get": {
        "summary": "Card Balance History",
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
            "in": "path",
            "name": "cardId",
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "The unique identifier for the card for which you want to retrieve the deposit and withdrawal history."
          },
          {
            "required": false,
            "in": "query",
            "name": "page",
            "schema": {
              "type": "string"
            },
            "description": "The page number to retrieve in a paginated response. Used in combination with **limit** to specify the starting point for a subset of records."
          },
          {
            "required": false,
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "string",
              "default": 50,
              "maximum": 100
            },
            "description": "A limit on the number of objects to be returned."
          },
          {
            "required": false,
            "in": "query",
            "name": "toDate",
            "schema": {
              "type": "string",
              "format": "date",
              "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
            },
            "description": "The end date for filtering the records, formatted as **YYYY-MM-DD**. Only records up to this date will be retrieved."
          },
          {
            "required": false,
            "in": "query",
            "name": "fromDate",
            "schema": {
              "type": "string",
              "format": "date",
              "pattern": "^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$"
            },
            "description": "The start date for filtering the records, formatted as **YYYY-MM-DD**. Only records from this date onwards will be retrieved."
          },
          {
            "required": false,
            "in": "query",
            "name": "type",
            "schema": {
              "type": "string",
              "enum": [
                "DEPOSIT",
                "WITHDRAWAL"
              ]
            },
            "description": "Specifies the type of balance change to retrieve. Possible values are **DEPOSIT** or **WITHDRAWAL**. Use this parameter to filter records by transaction type."
          },
          {
            "required": false,
            "in": "query",
            "name": "txnHash",
            "schema": {
              "type": "string"
            },
            "description": "transaction hash of the crypto transaction. Only applicable to card program that opt in for cardholder managed funding model."
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
            "description": "Card transactions",
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
                            "type": "string",
                            "description": "Reap’s internal ID for the balance change record."
                          },
                          "date": {
                            "type": "string",
                            "description": "Date and time of the balance change, formatted as **YYYY-MM-DD**"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "DEPOSIT",
                              "WITHDRAWAL"
                            ],
                            "description": "Specifies the type of balance change. Possible values:\n\n**DEPOSIT**: Indicates a positive change in the card’s **availableCredit**.\n\n**WITHDRAWAL**: Indicates a negative change in the card’s **availableCredit**"
                          },
                          "source": {
                            "type": "string",
                            "enum": [
                              "EXTERNAL_CRYPTO_WALLET",
                              "MASTER_ACCOUNT_BALANCE",
                              "CARD_BALANCE"
                            ],
                            "description": "Specifies the origin of the funds contributing to this balance change. Possible values:\n\n**EXTERNAL_CRYPTO_WALLET**: From an external crypto wallet.\n\n**MASTER_ACCOUNT_BALANCE**: From the master account in your card program.\n\n**CARD_BALANCE**: From a specific card’s balance in your card program."
                          },
                          "destination": {
                            "type": "string",
                            "enum": [
                              "EXTERNAL_CRYPTO_WALLET",
                              "MASTER_ACCOUNT_BALANCE",
                              "CARD_BALANCE"
                            ],
                            "description": "Specifies where the balance change is applied.Possible values:\n\n**EXTERNAL_CRYPTO_WALLET**: From an external crypto wallet.\n\n**MASTER_ACCOUNT_BALANCE**: From the master account in your card program.\n\n**CARD_BALANCE**: From a specific card’s balance in your card program."
                          },
                          "status": {
                            "type": "string",
                            "description": "Current status of the transaction. Possible values:\n\n**PENDING**, **COMPLETED**."
                          },
                          "amount": {
                            "type": "number",
                            "format": "float",
                            "description": "The amount of the balance change."
                          },
                          "currency": {
                            "type": "string",
                            "description": "Currency of the balance change. Possible values:\n\n**HKD**, **USD**."
                          },
                          "cryptoMeta": {
                            "type": "object",
                            "properties": {
                              "currency": {
                                "type": "string",
                                "description": "Digital currency type. Possible value: **USDC**"
                              },
                              "amount": {
                                "type": "number",
                                "format": "float",
                                "description": "The digital currency type. Currently, only **USDC** is supported."
                              },
                              "network": {
                                "type": "string",
                                "description": "The cryptocurrency network used. Currently, only POLYGON is supported."
                              },
                              "wallet": {
                                "type": "string",
                                "description": "Wallet address associated with the change in balance."
                              },
                              "service_fee": {
                                "type": "string",
                                "description": "The total amount of the transaction service fee."
                              },
                              "service_fee_percentage": {
                                "type": "string",
                                "description": "Percentage of the transaction fee."
                              }
                            },
                            "required": [
                              "currency",
                              "amount",
                              "network",
                              "wallet",
                              "service_fee",
                              "service_fee_percentage"
                            ],
                            "additionalProperties": false,
                            "nullable": true,
                            "description": "Details for crypto transactions.\n\n**Note**: only if **source** or **destination** is **EXTERNAL_CRYPTO_WALLET**"
                          },
                          "txnHash": {
                            "type": "string",
                            "nullable": true,
                            "description": "Transaction hash associated with the balance change."
                          },
                          "exchangeRate": {
                            "type": "string",
                            "nullable": true,
                            "description": "Exchange rate used for converting stablecoins to fiat currency, or vice versa."
                          }
                        },
                        "required": [
                          "id",
                          "date",
                          "type",
                          "source",
                          "destination",
                          "status",
                          "amount",
                          "currency"
                        ],
                        "additionalProperties": false,
                        "description": "A list of records detailing changes in balance history."
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
          }
        }
      }
    }
  }
}
```