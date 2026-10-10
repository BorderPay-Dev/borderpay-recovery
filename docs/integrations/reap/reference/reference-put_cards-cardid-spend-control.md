---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Update spend control of a card

Spend controls allow you to set how much users can spend within a given window of time.

## Spend Control Updates & Reset Timings

When you update a card’s spend control via the `PUT /cards/{cardId}/spend-control` endpoint:

* `availableCredit` is updated immediately.
* Spend tracking limits (dailySpent, weeklySpent, etc.) reset automatically at the following times (all in HKT / UTC+8):

| Limit Type     | Reset Time (HKT)                  | Reset Time (UTC)                   |
| :------------- | :-------------------------------- | :--------------------------------- |
| `dailySpent`   | 12:00 AM every day                | 4:00 PM previous day               |
| `weeklySpent`  | 12:00 AM every Monday             | 4:00 PM Sunday                     |
| `monthlySpent` | 12:00 AM on the 1st of each month | 4:00 PM last day of previous month |
| `yearlySpent`  | 12:00 AM on the 1st of January    | 4:00 PM on the 31st December       |

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
    "/cards/{cardId}/spend-control": {
      "put": {
        "summary": "Update spend control of a card",
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
            "description": "The unique identifier for the specific card on which you want to apply the spend limit."
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
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "transactionLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount per transaction."
                  },
                  "dailyLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount per day."
                  },
                  "weeklyLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount per week."
                  },
                  "monthlyLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount per month."
                  },
                  "yearlyLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount per year."
                  },
                  "allTimeLimit": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 999999999.99,
                    "description": "Maximum available transaction amount over the card’s lifetime."
                  }
                },
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated spend control",
            "content": {
              "application/json": {
                "schema": {
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
                }
              }
            }
          },
          "400": {
            "description": "Bad Request",
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
                            "0106001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Invalid spend control value"
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
          "401": {
            "description": "Unauthorized",
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
                            "0302401"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Unsafe operation for protected information"
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
                  ]
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