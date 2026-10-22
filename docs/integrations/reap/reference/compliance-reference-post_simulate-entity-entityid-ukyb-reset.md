---
updatedAt: 2026-09-15T07:19:51.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Reset a UKYB Simulation

Rewinds a simulated case to `PENDING_SUBMISSION` so the same entity can be driven to another outcome, clearing the decision and any card-issuance grant it minted. Takes no request body. Sandbox environments only.

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Reap Compliance API",
    "version": "1.0.1",
    "description": "Compliance API",
    "contact": {
      "name": "Reap Engineers",
      "email": "reap-card-engineers@reap.hk"
    }
  },
  "servers": [
    {
      "url": "https://sandbox-compliance.api.reap.global",
      "description": "Sandbox server"
    },
    {
      "url": "https://compliance.api.reap.global",
      "description": "Production server - Allowlist only"
    },
    {
      "url": "https://staging-compliance.api.reap.global",
      "description": "Staging server"
    }
  ],
  "tags": [
    {
      "name": "Universal KYB",
      "description": "Submit KYB Pack data for business entities"
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
    "/simulate/entity/{entityId}/ukyb/reset": {
      "post": {
        "summary": "Reset a UKYB Simulation",
        "description": "Rewinds a simulated case to `PENDING_SUBMISSION` so the same entity can be driven to another outcome, clearing the decision and any card-issuance grant it minted. Takes no request body. Sandbox environments only.",
        "tags": [
          "Universal KYB"
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
            "in": "path",
            "name": "entityId",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "UUID of the L2 BUSINESS entity whose KYB case is being simulated."
          }
        ],
        "responses": {
          "200": {
            "description": "Rewound to PENDING_SUBMISSION. The pack and uploaded documents survive, so the next outcome can be triggered with one POST /ukyb/submit call, not a full re-upload."
          },
          "404": {
            "description": "Either the entity does not exist, or (outside a testing environment) the route itself does not.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating resource not found",
                      "example": "0102001404"
                    },
                    "message": {
                      "type": "string",
                      "description": "Error message describing what was not found",
                      "example": "Entity not found"
                    },
                    "parameter": {
                      "type": "string",
                      "description": "Parameter that identifies the missing resource",
                      "example": "entityId"
                    }
                  },
                  "required": [
                    "code",
                    "message"
                  ],
                  "additionalProperties": false,
                  "description": "Not found error response when requested resource does not exist"
                },
                "examples": {
                  "entityNotFound": {
                    "summary": "Entity not found",
                    "value": {
                      "code": "0102001404",
                      "message": "Entity '10e4c65b-7787-4780-bc33-8bfacbe341a4' not found for this business",
                      "parameter": ""
                    }
                  },
                  "notATestingEnvironment": {
                    "summary": "Not a testing environment",
                    "value": {
                      "error": "not_found"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal server error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating server-side error",
                      "example": "0601001400"
                    },
                    "message": {
                      "type": "string",
                      "description": "Generic error message for server errors",
                      "example": "An unexpected error occurred. Please try again later."
                    },
                    "parameter": {
                      "type": "string",
                      "description": "Parameter that identifies the missing resource",
                      "example": "entityId"
                    }
                  },
                  "required": [
                    "code",
                    "message"
                  ],
                  "additionalProperties": false,
                  "description": "Internal server error response for unexpected server-side errors"
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