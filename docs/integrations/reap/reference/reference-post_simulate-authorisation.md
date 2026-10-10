---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate authorisation transaction

> ℹ️ Endpoint Access Restriction
>
> Only applicable for **Sandbox** environment

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
    "/simulate/authorisation": {
      "post": {
        "summary": "Simulate authorisation transaction",
        "tags": [
          "Simulate"
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
                  "cardID": {
                    "type": "string",
                    "description": "The unique identifier of the card to be used for simulating the transaction."
                  },
                  "billAmount": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "description": "The total amount charged to the cardholder, in the card’s currency. This amount includes the transaction amount plus any applicable fees."
                  },
                  "transactionAmount": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "description": "The original amount of the transaction in the merchant’s currency, representing the base value of the purchase before fees are added.\n\n**Note**: If not specified, this defaults to the same value as **billAmount**."
                  },
                  "transactionCurrency": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 3,
                    "nullable": true,
                    "description": "The [ISO 4217 currency code](https://en.wikipedia.org/wiki/ISO_4217) for the transaction. Defaults to the card’s currency if not specified.",
                    "example": "840"
                  },
                  "transactionID": {
                    "type": "string",
                    "description": "The identifier for the transaction. It is required If you simulate incremental authorizations."
                  },
                  "simulateIncorrectCVV": {
                    "type": "boolean",
                    "description": "When set to **true**, simulates an incorrect CVV scenario."
                  },
                  "simulateIncorrectPIN": {
                    "type": "boolean",
                    "description": "When set to **true**, simulates an incorrect PIN scenario."
                  },
                  "simulateIncorrectExpiryDate": {
                    "type": "boolean",
                    "description": "When set to **true**, simulates an incorrect expiration date scenario."
                  },
                  "simulateTimeout": {
                    "type": "boolean",
                    "description": "When set to **true**, simulates a transaction timeout in the sandbox, causing the transaction to be declined and emitting a declined-transaction webhook."
                  },
                  "simulateFraud": {
                    "type": "boolean",
                    "description": "When set to **true**, triggers the fraud alert simulation flow (FRAUD_DETECTION webhook + timeout handling)."
                  },
                  "merchantName": {
                    "type": "string",
                    "description": "Override merchant name in the FRAUD_DETECTION webhook. Defaults to \"Simulated Merchant\"."
                  },
                  "merchantLocation": {
                    "type": "string",
                    "description": "Override merchant location in the FRAUD_DETECTION webhook. Defaults to \"SG\"."
                  },
                  "mcc": {
                    "type": "string",
                    "pattern": "^\\d{4}$",
                    "description": "The 4-digit Merchant Category Code (MCC). This parameter is not applicable to incremental authorizations. Default is **5732**."
                  },
                  "acquirerCountry": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 3,
                    "nullable": true,
                    "description": "The country of the acquirer. This parameter is not applicable to incremental authorizations. Default is **HKG**."
                  }
                },
                "required": [
                  "cardID",
                  "billAmount"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successfully simulated an authorisation transaction",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "lifecycleEventID": {
                      "type": "string",
                      "description": "A unique identifier for the lifecycle event."
                    },
                    "id": {
                      "type": "string",
                      "description": "A unique identifier for the transaction."
                    }
                  },
                  "required": [
                    "lifecycleEventID",
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
                            "0314001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Invalid currency code"
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
                            "0314002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Transaction is already cleared"
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
                            "0314003"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Transaction is already refunded"
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
                            "0314005"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Transaction has not authorised yet"
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
                    }
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Not found",
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
                            "0314006"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Transaction not found under business"
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
                            "1001001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "No card found for this token"
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
                            "1001001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "A card with that public token does not exist"
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
          }
        }
      }
    }
  }
}
```