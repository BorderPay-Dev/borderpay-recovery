---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Simulate bulk ship production status

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
    "/simulate/bulkships/{bulkshipID}/production-status": {
      "post": {
        "summary": "Simulate bulk ship production status",
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
            "name": "bulkshipID",
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
            "description": "Bulk ship production status simulated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "bulkshipID": {
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
                    "bulkshipID",
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
                            "0314014"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Bulk ship status simulation failed, please review individual card errors"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "errors": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "cardID": {
                                "type": "string",
                                "format": "uuid"
                              },
                              "message": {
                                "type": "string",
                                "enum": [
                                  "The status is not supported.",
                                  "The status change is not supported.",
                                  "Card must be shipped first."
                                ]
                              },
                              "code": {
                                "type": "string",
                                "enum": [
                                  "0314009",
                                  "0314010",
                                  "0314011"
                                ]
                              }
                            },
                            "required": [
                              "cardID"
                            ],
                            "additionalProperties": false
                          }
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
                            "0319012"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Cards from multiple manufacturers cannot be shipped in a single bulk shipment."
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
                            "0319001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Bulkship not found"
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