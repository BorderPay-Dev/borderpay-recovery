---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Get 3DS forwarding status

Once you have enroled into 3DS forwarding with the support of our account manager, use this endpoint to check on the 3DS forwarding enrolment status.

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
    "/cards/{cardId}/3ds-forwarding": {
      "get": {
        "summary": "Get 3DS forwarding status",
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
            "description": "The unique identifier of the card for which you want to check the 3DS forwarding enrollment status. Use this parameter after calling the [PUT cards/{cardId}/3ds-forwarding](https://reap.readme.io/reference/put_cards-cardid-3ds-forwarding#/) endpoint."
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
            "description": "3DS forwarding status retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "enrolled": {
                      "type": "boolean",
                      "description": "Returns true when the card is enrolled in 3DS forwarding with either SMS OTP (One-Time Password), biometric, or both methods"
                    },
                    "biometricEnrolled": {
                      "type": "boolean"
                    },
                    "smsEnrolled": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "enrolled",
                    "biometricEnrolled",
                    "smsEnrolled"
                  ],
                  "additionalProperties": false
                }
              }
            }
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
                            "Premium endpoint not allowed: /cards/:cardID/3ds-forwarding"
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
                            "0302001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card is not found"
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