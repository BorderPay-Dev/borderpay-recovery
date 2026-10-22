---
updatedAt: 2026-04-26T16:55:58.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Get Entity Details

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
    "/entity/{entityId}": {
      "get": {
        "summary": "Get Entity Details",
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
        "parameters": [
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "description": "Unique identifier of the entity to retrieve",
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Entity details retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "description": "Unique UUID of the entity",
                      "example": "ent_123e4567-e89b-12d3-a456-426614174000"
                    },
                    "externalId": {
                      "type": "string",
                      "description": "Your external identifier for this entity",
                      "example": "customer_12345"
                    },
                    "businessId": {
                      "type": "string",
                      "description": "Unique identifier for the business this entity belongs to",
                      "example": "biz_123e4567-e89b-12d3-a456-426614174000"
                    },
                    "type": {
                      "type": "string",
                      "enum": [
                        "INDIVIDUAL",
                        "BUSINESS"
                      ],
                      "description": "Type of entity (INDIVIDUAL or BUSINESS)",
                      "example": "INDIVIDUAL"
                    },
                    "enabledFeatures": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "featureId": {
                            "type": "string",
                            "description": "Unique identifier for the enabled feature",
                            "example": "feat_123e4567-e89b-12d3-a456-426614174000"
                          },
                          "featureSlug": {
                            "type": "string",
                            "description": "Human-readable slug identifier for the feature",
                            "example": "card-issuance-kyc-api"
                          }
                        },
                        "required": [
                          "featureId"
                        ],
                        "additionalProperties": false,
                        "description": "Schema for a feature that has been enabled for an entity"
                      },
                      "description": "Array of features currently enabled for this entity. Returns empty array if none enabled.",
                      "example": [
                        {
                          "featureId": "feat_123e4567-e89b-12d3-a456-426614174000",
                          "featureSlug": "card-issuance-kyc-api"
                        }
                      ]
                    },
                    "submittedRequirements": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "submissionId": {
                            "type": "string",
                            "description": "Unique identifier for this requirement submission",
                            "example": "sub_123e4567-e89b-12d3-a456-426614174000"
                          },
                          "requirement": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string",
                                "description": "Unique identifier for the compliance requirement",
                                "example": "req_123e4567-e89b-12d3-a456-426614174000"
                              },
                              "name": {
                                "type": "string",
                                "description": "Human-readable name of the requirement",
                                "example": "Individual Identity Verification"
                              },
                              "valueType": {
                                "type": "string",
                                "enum": [
                                  "BOOLEAN",
                                  "NUMERIC",
                                  "STRING",
                                  "FILE",
                                  "JSON"
                                ],
                                "description": "Data type expected for this requirement",
                                "example": "JSON"
                              },
                              "jsonSchema": {
                                "type": "object",
                                "properties": {
                                  "data": {
                                    "type": "object",
                                    "properties": {},
                                    "additionalProperties": false,
                                    "description": "JSON schema defining the structure of required data"
                                  },
                                  "ui": {
                                    "type": "object",
                                    "properties": {},
                                    "additionalProperties": false,
                                    "description": "UI schema for rendering forms (if applicable)"
                                  }
                                },
                                "additionalProperties": false,
                                "nullable": true,
                                "description": "JSON schema definition for structured requirements"
                              }
                            },
                            "required": [
                              "id",
                              "name",
                              "valueType"
                            ],
                            "additionalProperties": false,
                            "description": "Details about the compliance requirement"
                          },
                          "updatedAt": {
                            "type": "string",
                            "format": "date-time",
                            "description": "ISO 8601 timestamp when this requirement was last updated",
                            "example": "2024-03-20T10:00:00Z"
                          },
                          "value": {
                            "description": "The submitted value/data for this requirement"
                          },
                          "status": {
                            "type": "string",
                            "enum": [
                              "APPROVED",
                              "PENDING",
                              "REJECTED"
                            ],
                            "description": "Current verification status of this requirement",
                            "example": "APPROVED"
                          },
                          "createdAt": {
                            "type": "string",
                            "format": "date-time",
                            "description": "ISO 8601 timestamp when this requirement was first submitted",
                            "example": "2024-03-20T09:00:00Z"
                          }
                        },
                        "required": [
                          "requirement",
                          "updatedAt",
                          "status",
                          "createdAt"
                        ],
                        "additionalProperties": false,
                        "description": "Schema for a submitted compliance requirement with its current status"
                      },
                      "description": "Array of compliance requirements submitted for this entity. Returns empty array if none submitted."
                    },
                    "createdAt": {
                      "type": "string",
                      "format": "date-time",
                      "description": "ISO 8601 timestamp when the entity was created",
                      "example": "2024-03-20T08:00:00Z"
                    },
                    "updatedAt": {
                      "type": "string",
                      "format": "date-time",
                      "description": "ISO 8601 timestamp when the entity was last updated",
                      "example": "2024-03-20T10:00:00Z"
                    }
                  },
                  "required": [
                    "id",
                    "externalId",
                    "businessId",
                    "type",
                    "enabledFeatures",
                    "submittedRequirements",
                    "createdAt",
                    "updatedAt"
                  ],
                  "additionalProperties": false,
                  "description": "Complete schema for entity details including compliance status and enabled features"
                },
                "example": {
                  "id": "123e4567-e89b-12d3-a456-426614174000",
                  "externalId": "user-12345",
                  "businessId": "987fcdeb-51a2-43d1-9f12-345678901234",
                  "type": "INDIVIDUAL",
                  "enabledFeatures": [
                    {
                      "featureId": "feature-uuid-1",
                      "featureSlug": "card-issuance-kyc-api"
                    }
                  ],
                  "submittedRequirements": [
                    {
                      "submissionId": "req-uuid-1",
                      "requirement": {
                        "id": "requirement-uuid-1",
                        "name": "Individual Entity Name",
                        "valueType": "STRING",
                        "jsonSchema": {}
                      },
                      "value": "John Doe",
                      "status": "APPROVED",
                      "createdAt": "2024-03-20T10:00:00Z",
                      "updatedAt": "2024-03-20T10:30:00Z"
                    }
                  ],
                  "createdAt": "2024-03-20T09:00:00Z",
                  "updatedAt": "2024-03-20T10:30:00Z"
                }
              }
            }
          },
          "400": {
            "description": "Invalid request parameters.",
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
          "404": {
            "description": "Entity not found.",
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