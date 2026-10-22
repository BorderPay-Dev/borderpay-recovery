---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Adjust Card Balance

> ℹ️ Endpoint Access Restriction
>
> Only applicable for accounts on
>
> * **Authorisation Model:** Standard Authorisation
> * **Funding Model**: Master Account Balance

For cards using standard authorization and funding model: master account balance, each card will need to be funded with an amount to allow proper authorization.

To credit the card balance, include a positive integer in the `adjustment` field.

To debit the card balance, include a negative integer in the `adjustment` field.

More details in our [guides](https://reap.readme.io/docs/standard-authorization).

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
    "/cards/{cardId}/credit": {
      "put": {
        "summary": "Adjust Card Balance",
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
              "format": "uuid",
              "description": "The unique identifier of the card that you want to adjust its balance."
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
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "adjustment": {
                    "type": "string",
                    "description": "Specifies the amount to adjust the card’s balance.\n\nPositive values increase the **availableBalance**, raising its spending power.\n\nNegative values decrease the **availableBalance**, reducing its spending power.\n\n**Note**: The amount should be denominated in the card’s currency, either HKD or USD."
                  }
                },
                "required": [
                  "adjustment"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Returns the card balance before and after the balance adjustment.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "creditBefore": {
                      "type": "string",
                      "description": "The card balance associated with the specified **cardId** before the adjustment was made."
                    },
                    "creditAfter": {
                      "type": "string",
                      "description": "The card balance associated with the specified **cardId** after the adjustment."
                    }
                  },
                  "required": [
                    "creditBefore",
                    "creditAfter"
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
                            "0302013"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card cannot adjust credit"
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
                            "0302002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Destroyed card credit cannot be changed"
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
                            "0302011"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card does not have spend control"
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
                            "0303003"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Insufficient balance for card credit"
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
                            "0303004"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Insufficient balance for card credit"
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
                            "0601001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Budget could not be found"
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
                            "0602001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Root budget does not exist for this user"
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