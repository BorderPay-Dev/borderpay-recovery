---
updatedAt: 2026-09-15T07:19:51.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Submit the KYB for review

Closes the KYB for a business entity: checks the case is complete, locks the stored payload, and queues it for compliance review. Takes **no request body** — everything being submitted was already stored by `POST`/`PATCH /entity/{entityId}/ukyb` and `POST /entity/{entityId}/ukyb/documents`.

Completeness covers the mapped KYB documents, every mandatory field on each declared beneficial owner, and — per owner — that an identity document has been uploaded whose kind matches the one declared. Presence is what is checked, not approval: a document still under review, or previously rejected, does not block submission.

Once accepted the payload is **locked**: further `POST`/`PATCH /ukyb` and `POST /ukyb/documents` calls are rejected, and a repeat submit returns `409`. Processing is asynchronous — the `202` means the case was accepted for review, not that review has finished.

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
    "/entity/{entityId}/ukyb/submit": {
      "post": {
        "summary": "Submit the KYB for review",
        "description": "Closes the KYB for a business entity: checks the case is complete, locks the stored payload, and queues it for compliance review. Takes **no request body** — everything being submitted was already stored by `POST`/`PATCH /entity/{entityId}/ukyb` and `POST /entity/{entityId}/ukyb/documents`.\n\nCompleteness covers the mapped KYB documents, every mandatory field on each declared beneficial owner, and — per owner — that an identity document has been uploaded whose kind matches the one declared. Presence is what is checked, not approval: a document still under review, or previously rejected, does not block submission.\n\nOnce accepted the payload is **locked**: further `POST`/`PATCH /ukyb` and `POST /ukyb/documents` calls are rejected, and a repeat submit returns `409`. Processing is asynchronous — the `202` means the case was accepted for review, not that review has finished.",
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
            "name": "entityId",
            "in": "path",
            "required": true,
            "description": "The unique identifier (UUID) of the business entity.",
            "schema": {
              "type": "string",
              "format": "uuid"
            }
          }
        ],
        "responses": {
          "202": {
            "description": "Accepted for review. The payload is now locked and the case has been queued for compliance review.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "entityId",
                    "submittedAt"
                  ],
                  "properties": {
                    "entityId": {
                      "type": "string",
                      "format": "uuid",
                      "description": "The business entity whose KYB was submitted."
                    },
                    "submittedAt": {
                      "type": "string",
                      "format": "date-time",
                      "description": "When the submission was accepted."
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "The payload was rejected. Every problem found across the pack, questionnaire and enhanced-diligence sections is listed together, so a client can fix them in one pass rather than resubmitting to discover the next.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "code",
                    "missing",
                    "invalid"
                  ],
                  "properties": {
                    "code": {
                      "type": "string",
                      "enum": [
                        "INCOMPLETE_KYB"
                      ]
                    },
                    "missing": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "Requirement slugs with no value at all.",
                      "example": []
                    },
                    "invalid": {
                      "type": "array",
                      "description": "Requirement slugs whose value was present but did not validate.",
                      "items": {
                        "type": "object",
                        "required": [
                          "slug",
                          "issues"
                        ],
                        "properties": {
                          "slug": {
                            "type": "string",
                            "example": "ukyb-pack"
                          },
                          "issues": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "required": [
                                "path",
                                "message"
                              ],
                              "properties": {
                                "path": {
                                  "type": "string",
                                  "example": "uboDeclaration"
                                },
                                "message": {
                                  "type": "string",
                                  "example": "Array must contain at least 1 element(s)"
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "KYB submission is not enabled for this business yet. Credentials and payload are not at fault — the capability is being rolled out. Nothing was queued and the payload remains editable.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "example": "0301006403"
                    },
                    "message": {
                      "type": "string",
                      "example": "KYB submission is not enabled for this business yet."
                    }
                  }
                }
              }
            }
          },
          "409": {
            "description": "The KYB has already been submitted, or has otherwise moved past the point where it can be submitted. Nothing was queued.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "example": "0301004409"
                    },
                    "message": {
                      "type": "string",
                      "example": "KYB for entity {entityId} has already been submitted"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "Internal server error",
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