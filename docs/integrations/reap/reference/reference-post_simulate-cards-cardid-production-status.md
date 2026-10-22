---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate card production status

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
    "/simulate/cards/{cardID}/production-status": {
      "post": {
        "summary": "Simulate card production status",
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
                  "productionStatus": {
                    "type": "string",
                    "enum": [
                      "CARD_IN_PRODUCTION",
                      "CARD_PRODUCTION_COMPLETED",
                      "CARD_PRODUCTION_CANCELED",
                      "CARD_PRODUCTION_ONHOLD"
                    ]
                  }
                },
                "required": [
                  "productionStatus"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "parameters": [
          {
            "required": true,
            "in": "path",
            "name": "cardID",
            "schema": {
              "type": "string",
              "format": "uuid"
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
        "responses": {
          "200": {
            "description": "Card production status simulated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "cardID": {
                      "type": "string"
                    },
                    "productionStatus": {
                      "type": "string",
                      "enum": [
                        "CARD_IN_PRODUCTION",
                        "CARD_PRODUCTION_COMPLETED",
                        "CARD_PRODUCTION_CANCELED",
                        "CARD_PRODUCTION_ONHOLD"
                      ]
                    }
                  },
                  "required": [
                    "cardID",
                    "productionStatus"
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
                            "0314009"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The status is not supported."
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
                            "0314010"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The status change is not supported."
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
                            "0314011"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Card must be shipped first."
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
                            "0314012"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "This card belongs to a bulk shipment. Please use the bulk simulation endpoints instead."
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
                            "0302001"
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