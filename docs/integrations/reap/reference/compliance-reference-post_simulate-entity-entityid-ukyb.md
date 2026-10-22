---
updatedAt: 2026-09-15T07:19:51.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Simulate UKYB Outcome

Drives a KYB case straight to a decision, standing in for the compliance review nobody performs on a sandbox case. The case must already have been submitted through the real `POST /ukyb/submit` — only the decision is simulated, so it has to be at `UNDER_REVIEW` or `PENDING_ADDITIONAL_INFO`. Fires the same side effects a real decision does, where they are set up: the card-issuance grant on approval, and the client status webhook. Sandbox environments only.

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
    "/simulate/entity/{entityId}/ukyb": {
      "post": {
        "summary": "Simulate UKYB Outcome",
        "description": "Drives a KYB case straight to a decision, standing in for the compliance review nobody performs on a sandbox case. The case must already have been submitted through the real `POST /ukyb/submit` — only the decision is simulated, so it has to be at `UNDER_REVIEW` or `PENDING_ADDITIONAL_INFO`. Fires the same side effects a real decision does, where they are set up: the card-issuance grant on approval, and the client status webhook. Sandbox environments only.",
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
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": {
                    "type": "string",
                    "enum": [
                      "approved",
                      "rejected",
                      "pending_additional_info",
                      "cancelled_by_client"
                    ],
                    "description": "The KYB decision to simulate. `under_review` is not an accepted value — that state is produced by the real POST /ukyb/submit, not by this endpoint.",
                    "example": "approved"
                  }
                },
                "required": [
                  "status"
                ]
              },
              "examples": {
                "approved": {
                  "summary": "Simulate a KYB approval",
                  "description": "Runs the same completeness gate a real submission passes, then approves the case and mints the card-issuance grant.",
                  "value": {
                    "status": "approved"
                  }
                },
                "rejected": {
                  "summary": "Simulate a KYB rejection",
                  "value": {
                    "status": "rejected"
                  }
                },
                "pendingAdditionalInfo": {
                  "summary": "Simulate an RFI being raised",
                  "value": {
                    "status": "pending_additional_info"
                  }
                },
                "cancelledByClient": {
                  "summary": "Simulate a client cancellation",
                  "value": {
                    "status": "cancelled_by_client"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Outcome applied.",
            "content": {
              "application/json": {
                "examples": {
                  "approved": {
                    "value": {
                      "entityId": "10e4c65b-7787-4780-bc33-8bfacbe341a4",
                      "status": "APPROVED",
                      "cardIssuanceEnabled": true,
                      "validEmailDomains": [
                        "acme.example"
                      ],
                      "primaryClientBusinessUuid": "9c7b1e9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
                      "submittedAt": "2026-08-18T00:00:00.000Z",
                      "decidedAt": "2026-08-19T00:00:00.000Z",
                      "simulated": true,
                      "notification": {
                        "dispatched": false
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "The case is incomplete. Every gap, in one response.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "example": "INCOMPLETE_KYB"
                    },
                    "missing": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Requirement slugs with no submission at all."
                    },
                    "invalid": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "slug": {
                            "type": "string",
                            "example": "ukyb-pack"
                          },
                          "issues": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "path": {
                                  "type": "string",
                                  "example": "uboDeclaration"
                                },
                                "message": {
                                  "type": "string",
                                  "example": "Array must contain at least 1 element(s)"
                                }
                              },
                              "required": [
                                "path",
                                "message"
                              ],
                              "additionalProperties": false
                            }
                          }
                        },
                        "required": [
                          "slug",
                          "issues"
                        ],
                        "additionalProperties": false
                      },
                      "description": "Requirement slugs whose submission was present but did not validate, with the specific issues."
                    }
                  },
                  "required": [
                    "code",
                    "missing",
                    "invalid"
                  ],
                  "additionalProperties": false,
                  "description": "Every gap in the case, aggregated into one response."
                },
                "examples": {
                  "incomplete": {
                    "summary": "Incomplete KYB",
                    "value": {
                      "code": "INCOMPLETE_KYB",
                      "missing": [
                        "shareholding-chart"
                      ],
                      "invalid": []
                    }
                  },
                  "invalidSubmission": {
                    "summary": "A submitted section failed validation",
                    "value": {
                      "code": "INCOMPLETE_KYB",
                      "missing": [],
                      "invalid": [
                        {
                          "slug": "ukyb-pack",
                          "issues": [
                            {
                              "path": "uboDeclaration",
                              "message": "Array must contain at least 1 element(s)"
                            }
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            }
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
          "409": {
            "description": "The case is not marked for simulation, or has already been decided. Reset via POST /simulate/entity/{entityId}/ukyb/reset, or submit a fresh case via POST /ukyb/submit.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "description": "Numeric error code indicating the case is not marked for simulation",
                      "example": "0304001409"
                    },
                    "status": {
                      "type": "string",
                      "description": "The case's current kyb_info.status.",
                      "example": "APPROVED"
                    },
                    "message": {
                      "type": "string",
                      "description": "Human-readable explanation, naming the reset endpoint."
                    }
                  },
                  "required": [
                    "code",
                    "status",
                    "message"
                  ],
                  "additionalProperties": false,
                  "description": "The case is not marked for simulation, or has already been decided."
                },
                "examples": {
                  "notSimulating": {
                    "value": {
                      "code": "0304001409",
                      "status": "APPROVED",
                      "message": "Entity is at APPROVED and is not marked for simulation."
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