---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Update 3DS forwarding method

Upon enrolment into 3DS forwarding with us, you will be able to update the 3DS authentication method of either SMS, in-app authentication or both for a specific card.

Contact your account manager for more information on 3DS forwarding enrolment.

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
      "put": {
        "summary": "Update 3DS forwarding method",
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
            "description": "The unique identifier of the card you want to enroll in 3DS forwarding"
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
                  "enroll": {
                    "type": "boolean",
                    "description": "Indicates if 3DS forwarding is enabled for the card. Possible values:\n\n**true**: 3DS forwarding is enabled.\n\n**false**: 3DS forwarding is not enabled for the card.\n\n**Note**: This field will be deprecated in future versions. Use the **biometricEnroll** field instead."
                  },
                  "biometricEnroll": {
                    "type": "boolean",
                    "description": "Indicates whether biometric authentication is part of the 3DS verification process.\n\n**true**: Biometric authentication is enabled and will be required as part of the 3DS process. Cardholders must complete a biometric verification step, such as using a fingerprint or facial recognition, during the 3DS checkout (e.g., in-app verification).\n\n**false**: Biometric authentication is not enabled and is not part of the 3DS verification process.\n\n**Important**: To enable biometric authentication, additional technical implementation is required from your side, such as configuring in-app workflows for biometric enrollment. Learn more about [3DS verfication](https://reap.readme.io/reference/3ds-forwarding#/)."
                  },
                  "smsEnroll": {
                    "type": "boolean",
                    "description": "Indicates whether SMS-based verification is enabled for the card during 3DS transactions.\n\n**true**: SMS verification is enabled. A one-time passcode (OTP) will be sent to the cardholder’s registered mobile number to authenticate the 3DS transaction.\n\n**false**: SMS verification is not enabled for the card."
                  }
                },
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "3DS forwarding status updated successfully"
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
                            "0317002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Bio and SMS enrollment cannot be both false"
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
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0316001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Application associated with the card not found"
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
                            "0317001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Error updating 3DS forwarding method"
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