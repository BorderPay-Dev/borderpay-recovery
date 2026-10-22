---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Freeze Card

Cards with the **`FROZEN`** status shall face payment declines during card processing when used at a merchant's POS or during online purchases until such time when its status transitioned to **`ACTIVE`** by setting the **`freeze`** body parameter to `false`.

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
    "/cards/{cardId}/status": {
      "put": {
        "summary": "Freeze Card",
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
            "required": true,
            "in": "path",
            "name": "cardId",
            "schema": {
              "type": "string",
              "format": "uuid",
              "description": "The unique identifier for the card whose status you want to change or from FROZEN to **ACTIVE** or from ACTIVE to FROZEN"
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
                  "freeze": {
                    "type": "boolean",
                    "description": "A boolean parameter that sets the card’s freeze status. Possible values:\n\n**true**: Sets the card status to **FROZEN**\n\n**false**: Reverts the freeze if the card is currently **FROZEN**. Note that this does not necessarily make the card **ACTIVE**; it may return to another status that could still restrict usage."
                  }
                },
                "required": [
                  "freeze"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Return status after the update",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "freeze": {
                      "type": "boolean",
                      "description": "A boolean indicating the card’s current freeze status. Possible values:\n\n**true**: The card is currently **FROZEN**.\n\n**false**: The freeze has been lifted if the card was previously **FROZEN**. Note that this does not necessarily mean the card is **ACTIVE**; it may have reverted to another status that could still restrict usage."
                    }
                  },
                  "required": [
                    "freeze"
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
                            "0302017"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card is blocked due to suspected fraud"
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
                            "0302023"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Withdrawal is pending on this card"
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
                            "0302025"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card cannot be frozen due to current status"
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
                            "0801003"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Cannot delete company main card"
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
                            "0801005"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "status and reason required in body"
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
                            "0302001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card not found or deleted"
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
                            "0302010"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card has a status of destroyed which is not reversable"
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
                            "0801001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card not found"
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
                            "0801002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card not found or deleted"
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
                            "0801004"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card has a status of destroyed which is not reversable"
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