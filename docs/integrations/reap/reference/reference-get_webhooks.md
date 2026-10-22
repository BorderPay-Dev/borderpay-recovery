---
updatedAt: 2026-04-22T08:49:10.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Get webhook subscriptions

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
    "/webhooks": {
      "get": {
        "summary": "Get webhook subscriptions",
        "tags": [
          "Webhooks"
        ],
        "security": [
          {
            "ApiKeyAuth": [
              ""
            ]
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully retrieved webhook subscriptions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "budgetId": {
                            "type": "string"
                          },
                          "businessUuid": {
                            "type": "string"
                          },
                          "subscriberUrl": {
                            "type": "string"
                          },
                          "createdAt": {
                            "type": "string",
                            "nullable": true
                          },
                          "updatedAt": {
                            "type": "string",
                            "nullable": true
                          }
                        },
                        "required": [
                          "id",
                          "budgetId",
                          "businessUuid",
                          "subscriberUrl",
                          "createdAt",
                          "updatedAt"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "totalItems": {
                          "type": "number",
                          "format": "float"
                        },
                        "itemCount": {
                          "type": "number",
                          "format": "float"
                        },
                        "itemsPerPage": {
                          "type": "number",
                          "format": "float"
                        },
                        "totalPages": {
                          "type": "number",
                          "format": "float"
                        },
                        "currentPage": {
                          "type": "number",
                          "format": "float"
                        }
                      },
                      "required": [
                        "totalItems",
                        "itemCount",
                        "itemsPerPage",
                        "totalPages",
                        "currentPage"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "required": [
                    "items"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "401": {
            "description": "Invalid api key",
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
          }
        }
      }
    }
  }
}
```