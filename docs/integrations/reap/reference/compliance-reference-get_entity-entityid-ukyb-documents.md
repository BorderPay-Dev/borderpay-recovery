---
updatedAt: 2026-10-09T08:06:19.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# List the documents on file for a KYB case

Returns the manifest of every document currently on file for a business entity: its own documents grouped by requirement slug, and each declared beneficial owner’s identity documents grouped by the kind of document uploaded. This is the read half of `POST /ukyb/documents` — the only way to discover a `fileId` without already holding one, since `POST`/`PATCH /ukyb` never echo one back.

Reports only the **live** set. Business documents **accumulate** — every file ever uploaded for a slug stays live, so uploading `company-profile` twice returns both files under it. A UBO’s **identity documents replace** — re-uploading a kind retires everything previously held under it, so only the newest upload for that kind appears. Either way this is the same set `POST /ukyb/submit`’s completeness check reads: a document visible here is a document the gate will find, and one missing here is one the gate will name as a gap.

**Downloading a UBO's file.** Use the beneficial owner's own `entityId` from the `ubos[]` entry — not the business entity id from the top level of this response — when calling `GET /entity/{entityId}/file/{fileId}/presigned-url` for one of their files. That endpoint checks the file belongs to the entity you name, and a UBO’s identity documents belong to their own INDIVIDUAL entity.

An entity that exists but has nothing uploaded yet still returns `200`, with `business` and `ubos` both empty (or `ubos` populated with owners who have no `documents` yet, once a UBO set has been declared) — a case that has not uploaded anything is a fact about it, not grounds for a `404`.

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
    "/entity/{entityId}/ukyb/documents": {
      "get": {
        "summary": "List the documents on file for a KYB case",
        "description": "Returns the manifest of every document currently on file for a business entity: its own documents grouped by requirement slug, and each declared beneficial owner’s identity documents grouped by the kind of document uploaded. This is the read half of `POST /ukyb/documents` — the only way to discover a `fileId` without already holding one, since `POST`/`PATCH /ukyb` never echo one back.\n\nReports only the **live** set. Business documents **accumulate** — every file ever uploaded for a slug stays live, so uploading `company-profile` twice returns both files under it. A UBO’s **identity documents replace** — re-uploading a kind retires everything previously held under it, so only the newest upload for that kind appears. Either way this is the same set `POST /ukyb/submit`’s completeness check reads: a document visible here is a document the gate will find, and one missing here is one the gate will name as a gap.\n\n**Downloading a UBO's file.** Use the beneficial owner's own `entityId` from the `ubos[]` entry — not the business entity id from the top level of this response — when calling `GET /entity/{entityId}/file/{fileId}/presigned-url` for one of their files. That endpoint checks the file belongs to the entity you name, and a UBO’s identity documents belong to their own INDIVIDUAL entity.\n\nAn entity that exists but has nothing uploaded yet still returns `200`, with `business` and `ubos` both empty (or `ubos` populated with owners who have no `documents` yet, once a UBO set has been declared) — a case that has not uploaded anything is a fact about it, not grounds for a `404`.",
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
            "description": "The BUSINESS entity being onboarded."
          }
        ],
        "responses": {
          "200": {
            "description": "The current document manifest for this entity.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "entityId",
                    "business",
                    "ubos"
                  ],
                  "properties": {
                    "entityId": {
                      "type": "string",
                      "format": "uuid",
                      "description": "The business entity this manifest belongs to."
                    },
                    "business": {
                      "type": "array",
                      "description": "The business’s own documents. A requirement slug with nothing uploaded is omitted.",
                      "items": {
                        "type": "object",
                        "required": [
                          "requirementSlug",
                          "files"
                        ],
                        "properties": {
                          "requirementSlug": {
                            "type": "string",
                            "enum": [
                              "certificate-of-incorporation",
                              "company-profile",
                              "shareholding-chart",
                              "register-of-directors",
                              "business-registry",
                              "source-of-funds-supporting-doc",
                              "source-of-wealth-supporting-doc"
                            ]
                          },
                          "files": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "required": [
                                "fileId",
                                "fileName",
                                "uploadedAt"
                              ],
                              "properties": {
                                "fileId": {
                                  "type": "string",
                                  "format": "uuid",
                                  "description": "Pass this to `GET /entity/{entityId}/file/{fileId}/presigned-url` to download the file."
                                },
                                "fileName": {
                                  "type": "string"
                                },
                                "uploadedAt": {
                                  "type": "string",
                                  "format": "date-time"
                                },
                                "side": {
                                  "type": "string",
                                  "enum": [
                                    "FRONT",
                                    "BACK"
                                  ],
                                  "description": "Present only on ubo-kyc files. Reflects the position the file was uploaded in, not a declared property of the document — a single-sided document such as a passport bio page is `FRONT` alone."
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    "ubos": {
                      "type": "array",
                      "description": "Every currently-declared beneficial owner, listed even if they have not uploaded anything yet.",
                      "items": {
                        "type": "object",
                        "required": [
                          "externalUserId",
                          "entityId",
                          "documents"
                        ],
                        "properties": {
                          "externalUserId": {
                            "type": "string",
                            "description": "Echoed from the declaration’s `externalUserId`; always present."
                          },
                          "entityId": {
                            "type": "string",
                            "format": "uuid",
                            "description": "This beneficial owner’s own INDIVIDUAL entity. Use this — not the business entity id above — to download their files."
                          },
                          "documents": {
                            "type": "array",
                            "description": "One entry per identity-document kind this owner has currently uploaded.",
                            "items": {
                              "type": "object",
                              "required": [
                                "uboDocumentType",
                                "files"
                              ],
                              "properties": {
                                "uboDocumentType": {
                                  "type": "string",
                                  "enum": [
                                    "PASSPORT",
                                    "ID_CARD",
                                    "DRIVERS_LICENCE"
                                  ]
                                },
                                "files": {
                                  "type": "array",
                                  "items": {
                                    "type": "object",
                                    "required": [
                                      "fileId",
                                      "fileName",
                                      "uploadedAt"
                                    ],
                                    "properties": {
                                      "fileId": {
                                        "type": "string",
                                        "format": "uuid",
                                        "description": "Pass this to `GET /entity/{entityId}/file/{fileId}/presigned-url` to download the file."
                                      },
                                      "fileName": {
                                        "type": "string"
                                      },
                                      "uploadedAt": {
                                        "type": "string",
                                        "format": "date-time"
                                      },
                                      "side": {
                                        "type": "string",
                                        "enum": [
                                          "FRONT",
                                          "BACK"
                                        ],
                                        "description": "Present only on ubo-kyc files. Reflects the position the file was uploaded in, not a declared property of the document — a single-sided document such as a passport bio page is `FRONT` alone."
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
                }
              }
            }
          },
          "400": {
            "description": "Invalid input data",
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
          },
          "403": {
            "description": "Forbidden | Missing authentication",
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
          },
          "404": {
            "description": "Unknown entity, or an entity that is not a BUSINESS (for example a beneficial owner’s own individual entity id).",
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