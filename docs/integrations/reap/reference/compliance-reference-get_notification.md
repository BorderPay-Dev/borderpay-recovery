---
updatedAt: 2026-04-26T16:55:58.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Get Notification Connections

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
      "name": "Notifications",
      "description": "Webhook notification management"
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
    "/notification": {
      "get": {
        "summary": "Get Notification Connections",
        "tags": [
          "Notifications"
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
            "in": "query",
            "name": "page",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "default": 1
            }
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 10
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of notification connections",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "description": "Unique identifier for the notification configuration",
                              "example": "123e4567-e89b-12d3-a456-426614174000"
                            },
                            "channel": {
                              "type": "string",
                              "enum": [
                                "WEBHOOK"
                              ],
                              "description": "The notification delivery channel",
                              "example": "WEBHOOK"
                            },
                            "types": {
                              "type": "array",
                              "items": {
                                "type": "string",
                                "enum": [
                                  "account_status_change",
                                  "kyb_status_change"
                                ]
                              },
                              "minItems": 1,
                              "description": "Array of subscribed event types",
                              "example": [
                                "account_status_change"
                              ]
                            },
                            "config": {
                              "type": "object",
                              "properties": {},
                              "description": "Configuration object containing channel-specific settings. For webhooks, contains webhook.url property.",
                              "example": {
                                "webhook": {
                                  "url": "https://api.example.com/webhooks/reap"
                                }
                              }
                            },
                            "createdAt": {
                              "type": "string",
                              "format": "date-time",
                              "description": "ISO 8601 timestamp when the notification configuration was created",
                              "example": "2024-03-20T10:00:00Z"
                            }
                          },
                          "required": [
                            "id",
                            "channel",
                            "types",
                            "config",
                            "createdAt"
                          ],
                          "additionalProperties": false,
                          "description": "Schema for a notification configuration item"
                        },
                        "description": "Array of notification configurations for the authenticated user"
                      }
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "itemCount": {
                          "type": "number",
                          "format": "float"
                        },
                        "totalItems": {
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
                        "itemCount",
                        "totalItems",
                        "itemsPerPage",
                        "totalPages",
                        "currentPage"
                      ],
                      "additionalProperties": false
                    }
                  }
                },
                "example": {
                  "items": [
                    {
                      "id": "123e4567-e89b-12d3-a456-426614174000",
                      "channel": "WEBHOOK",
                      "types": [
                        "account_status_change"
                      ],
                      "config": {
                        "webhook": {
                          "url": "https://api.example.com/webhooks/reap"
                        }
                      },
                      "createdAt": "2024-03-20T10:00:00Z"
                    }
                  ],
                  "meta": {
                    "itemCount": 1,
                    "totalItems": 1,
                    "itemsPerPage": 10,
                    "totalPages": 1,
                    "currentPage": 1
                  }
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
                  "invalidPagination": {
                    "summary": "Invalid pagination parameters",
                    "value": {
                      "code": "0701001400",
                      "message": "\"page\" must be greater than or equal to 1",
                      "parameter": "page"
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