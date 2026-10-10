---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Get master account balance

Note:

`availableToAllocate`: Denotes allocation of funds for standard authorization model only.

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
    "/account/balance": {
      "get": {
        "summary": "Get master account balance",
        "tags": [
          "Account",
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
            "description": "Get account balance information",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "availableBalance": {
                      "type": "number",
                      "format": "float",
                      "description": "The total amount available for all cardholders to spend across the account, shown in fiat currency according to your card program’s currency.\n\n**Note**: For accounts using standard authorization, this amount includes funds allocated to individual cards as credit limits."
                    },
                    "availableToAllocate": {
                      "type": "number",
                      "format": "float",
                      "description": "Represents the remaining balance that can be allocated to cards.\n\n**Note**: Applicable only to accounts using standard authorization."
                    }
                  },
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