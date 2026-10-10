---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Respond to 3DS verification

Use this endpoint to respond to a webhook notification which we sent you when you have enabled 3D Secure (3DS) forwarding for your card. You are now empowered to make 3DS decisions using an alternative method other than SMS OTP. You would need to use the `initiateActionId` from the 3DS Forwarding Webhook as a path parameter and return a 3DS response on this endpoint within 5 minutes from the transaction timestamp failing which the connection will timeout. You should return an error response to your user should there be any attempts to respond to the authentication request when the timeout occurs.

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
    "/cards/{cardId}/3ds-answer/{initiateActionId}": {
      "post": {
        "summary": "Respond to 3DS verification",
        "tags": [
          "3DS Forwarding"
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
            "description": "A unique identifier for the card used in this transaction, which is currently undergoing a 3DS challenge flow."
          },
          {
            "required": true,
            "in": "path",
            "name": "initiateActionId",
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "A unique identifier for the transaction action that initiated the current 3DS challenge checkout process."
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
                  "approve": {
                    "type": "boolean",
                    "description": "Indicates whether the transaction will be approved following your system’s verification of the cardholder’s identity for Reap to further process. Possible values:\n\n**true**: Your system approves the transaction after successful verification.\n\n**false**: Your system declines the transaction after unsuccessful verification."
                  }
                },
                "required": [
                  "approve"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "3DS security question answered successfully"
          },
          "403": {
            "description": "Forbidden",
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
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "forbidden_access"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Premium endpoint not allowed: /cards/:cardID/3ds-answer/:gpsInitiateActionId"
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
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Card or Action ID not found",
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
          "406": {
            "description": "Not Acceptable",
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
                            "0313005"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Error answering biometric auth request"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            406
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