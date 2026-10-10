---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate authorisation refund transaction

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
    "/simulate/{transactionID}/refund": {
      "post": {
        "summary": "Simulate authorisation refund transaction",
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
            "in": "path",
            "name": "transactionID",
            "schema": {
              "type": "string"
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
        "requestBody": {
          "description": "\n      if no bill amount is provided, full refund will be simulated\n    ",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "billAmount": {
                    "type": "number",
                    "format": "float",
                    "minimum": 1,
                    "description": "The amount to be billed to the cardholder. You can simulate either a full reversal or a partial reversal:\n\n**Full reversal**: Leave this field empty to process a full reversal.\n\n**Partial reversal**: Set this field to a positive value to indicate a partial reversal.\n\nThe reversal amount is calculated as: **transactionAmount - billAmount**."
                  },
                  "transactionAmount": {
                    "type": "number",
                    "format": "float",
                    "minimum": 1,
                    "description": "The amount of the transaction being authorized."
                  },
                  "unrelated": {
                    "type": "boolean",
                    "description": "when set to true, simulate a refund that is unrelated to a previous clearing transaction.",
                    "example": false
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
        "responses": {
          "201": {
            "description": "Successfully simulated an refund transaction",
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
                            "0314008"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Transaction is not cleared"
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