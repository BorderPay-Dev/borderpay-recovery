---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate authorisation clearing transaction

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
    "/simulate/{transactionID}/clearing": {
      "post": {
        "summary": "Simulate authorisation clearing transaction",
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
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "transactionAmount": {
                    "type": "number",
                    "format": "float",
                    "minimum": 1,
                    "description": "The amount for the transaction. If not provided, it defaults to the **billAmount**."
                  },
                  "transactionCurrency": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 3,
                    "nullable": true,
                    "description": "The [ISO 4217 currency code](https://en.wikipedia.org/wiki/ISO_4217) (e.g., 840 for USD). If not provided, it defaults to the card currency.",
                    "example": "840"
                  },
                  "simulateOfflineTxn": {
                    "type": "boolean",
                    "description": "Indicates whether to simulate an offline transaction. Possible values:\n\n**true**: Simulates a transaction type that clears directly without a previously authorized amount (offline transaction).\n\n**false**: Simulates a transaction type that clears a previously authorized transaction.\n\n**Note**: When set to true, the transactionID in the path parameter can be any value."
                  },
                  "billAmount": {
                    "oneOf": [
                      {
                        "type": "number",
                        "format": "float",
                        "minimum": 1,
                        "description": "Required when **simulateOfflineTxn** is true.",
                        "x-required": true
                      },
                      {
                        "type": "number",
                        "format": "float",
                        "minimum": 1,
                        "description": "If **simulateOfflineTxn** is **false**, this parameter can be left empty."
                      }
                    ]
                  },
                  "cardID": {
                    "oneOf": [
                      {
                        "type": "string",
                        "description": "Required when **simulateOfflineTxn** is true.",
                        "x-required": true
                      },
                      {
                        "type": "string",
                        "description": " If **simulateOfflineTxn** is false, this parameter can be left empty."
                      }
                    ]
                  },
                  "acquirerCountry": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 3,
                    "nullable": true,
                    "description": "The country of the acquirer. This parameter is not applicable to incremental authorizations. Default is **HKG**."
                  }
                },
                "additionalProperties": false
              }
            }
          }
        },
        "parameters": [
          {
            "required": true,
            "in": "path",
            "name": "transactionID",
            "schema": {
              "type": "string"
            },
            "description": "The unique identifier for the transaction.\n\nThis field should be included in the response body after simulating a transaction of type authorization using the **POST /simulate/authorization** endpoint. If simulating an offline transaction, this field can be left empty."
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
          "201": {
            "description": "Successfully simulated an authorisation clearing transaction",
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
            "description": "Bad request",
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