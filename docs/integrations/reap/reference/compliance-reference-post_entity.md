---
updatedAt: 2026-04-26T16:55:58.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Create Entity

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
      "name": "KYC Entities",
      "description": "Entity CRUD and signed payload operations"
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
    "/entity": {
      "post": {
        "summary": "Create Entity",
        "tags": [
          "KYC Entities"
        ],
        "security": [
          {
            "ApiKeyAuth": [
              ""
            ]
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "externalId": {
                    "type": "string",
                    "description": "Your unique identifier for this entity in your system",
                    "example": "customer_12345"
                  },
                  "type": {
                    "type": "string",
                    "enum": [
                      "INDIVIDUAL",
                      "BUSINESS"
                    ],
                    "description": "Type of entity being created (INDIVIDUAL or BUSINESS)",
                    "example": "INDIVIDUAL"
                  },
                  "verificationMode": {
                    "type": "string",
                    "enum": [
                      "KYCAAS",
                      "UKYC",
                      "UKYB",
                      "SUMSUB_TOKEN_SHARING",
                      "UKYC_INTERNAL"
                    ],
                    "description": "Compliance product this entity is onboarded under. Defaults to KYCAAS when omitted.",
                    "example": "KYCAAS"
                  }
                },
                "required": [
                  "externalId",
                  "type"
                ],
                "additionalProperties": false,
                "description": "Schema for creating a new entity in the compliance system"
              },
              "examples": {
                "individual": {
                  "summary": "Create individual entity",
                  "value": {
                    "externalId": "user-12345",
                    "type": "INDIVIDUAL"
                  }
                },
                "business": {
                  "summary": "Create business entity",
                  "value": {
                    "externalId": "company-67890",
                    "type": "BUSINESS"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Entity created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "description": "Unique UUID assigned to the created entity",
                      "example": "ent_123e4567-e89b-12d3-a456-426614174000"
                    },
                    "externalId": {
                      "type": "string",
                      "description": "Your external identifier that was provided during creation",
                      "example": "customer_12345"
                    },
                    "businessId": {
                      "type": "string",
                      "description": "Unique identifier for the business this entity belongs to",
                      "example": "biz_123e4567-e89b-12d3-a456-426614174000"
                    },
                    "type": {
                      "type": "string",
                      "description": "The entity type that was created",
                      "example": "INDIVIDUAL"
                    }
                  },
                  "required": [
                    "id",
                    "externalId",
                    "businessId",
                    "type"
                  ],
                  "additionalProperties": false,
                  "description": "Response schema for successful entity creation"
                },
                "example": {
                  "id": "123e4567-e89b-12d3-a456-426614174000",
                  "externalId": "user-12345",
                  "businessId": "987fcdeb-51a2-43d1-9f12-345678901234",
                  "type": "INDIVIDUAL"
                }
              }
            }
          },
          "400": {
            "description": "Invalid request parameters or validation error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating validation failure",
                      "example": "0701001400"
                    },
                    "message": {
                      "type": "string",
                      "description": "Validation error message",
                      "example": "\"externalId\" is required"
                    },
                    "parameter": {
                      "type": "string",
                      "description": "Field name that failed validation",
                      "example": "webhookUrl"
                    }
                  },
                  "required": [
                    "code",
                    "message"
                  ],
                  "additionalProperties": false,
                  "description": "Validation error response for invalid request data"
                },
                "examples": {
                  "missingExternalId": {
                    "summary": "Missing external ID",
                    "value": {
                      "code": "0701001400",
                      "message": "\"externalId\" is required",
                      "parameter": "externalId"
                    }
                  },
                  "invalidType": {
                    "summary": "Invalid entity type",
                    "value": {
                      "code": "0701001400",
                      "message": "\"type\" must be one of [INDIVIDUAL, BUSINESS]",
                      "parameter": "type"
                    }
                  },
                  "missingApiKey": {
                    "summary": "Missing API key",
                    "value": {
                      "code": "0501001400",
                      "message": "Invalid Authorization: missing API key",
                      "parameter": ""
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required or invalid API key.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating authentication failure",
                      "example": "0501002401"
                    },
                    "message": {
                      "type": "string",
                      "description": "Error message describing the authentication issue",
                      "example": "Invalid Authorization"
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
                  "description": "Unauthorized error response for authentication failures"
                },
                "examples": {
                  "invalidApiKey": {
                    "summary": "Invalid API key",
                    "value": {
                      "code": "0501002401",
                      "message": "Invalid Authorization",
                      "parameter": ""
                    }
                  }
                }
              }
            }
          },
          "409": {
            "description": "Entity with external ID already exists.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating a conflict with current state",
                      "example": "0101003409"
                    },
                    "message": {
                      "type": "string",
                      "description": "Error message describing the conflict",
                      "example": "Entity with external ID already exists"
                    },
                    "parameter": {
                      "type": "string",
                      "description": "Parameter that caused the conflict",
                      "example": "externalId"
                    }
                  },
                  "required": [
                    "code",
                    "message"
                  ],
                  "additionalProperties": false,
                  "description": "Conflict error response for operations that conflict with current state"
                },
                "examples": {
                  "duplicateExternalId": {
                    "summary": "Duplicate external ID",
                    "value": {
                      "code": "0101003409",
                      "message": "Entity with external ID already exists",
                      "parameter": "externalId"
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