---
updatedAt: 2026-09-15T07:19:51.000Z
agentTools:
  projectIndex: https://reap-ra.readme.io/llms.txt
---

# Upload Universal KYB documents

Uploads one or more Universal KYB documents against a single document type.

**Which entity does `entityId` refer to?** Always the `BUSINESS` entity being onboarded, regardless of document type.

For `ubo-kyc`, the beneficial owner is named separately by two required fields: `individualEntityId` (the UBO's own `INDIVIDUAL` entity uuid, as returned when the UBO was declared) and `uboDocumentType` (the kind of identity document being uploaded — one of `PASSPORT`, `ID_CARD`, `DRIVERS_LICENCE`). Neither field may be sent for any other document type.

**Allowed extensions**, for every requirement except `ubo-kyc`: .jpg, .jpeg, .pdf, .png, .gif, .xlsx, .xls, .doc, .docx, .csv. `ubo-kyc` accepts a narrower set — .jpg, .jpeg, .png, .pdf. Either way the declared multipart MIME type must match the extension (e.g. `.pdf` requires `application/pdf`).

**File caps, per requirement type.** `ubo-kyc`: 2 files per request (a front/back pair), and at most 20 files in total for one beneficial owner — that total counts superseded files, so it does not reset when you re-upload. Every other requirement: 5 files per request and 20 files in total per requirement, counted per requirement so filling one does not restrict another.

**Re-uploading behaves differently for identity documents.** For `ubo-kyc`, a second upload for the same `uboDocumentType` **replaces** what was there before: the previous files stop being part of the submission. This is destructive — send the complete set you want on record, not just the side you are correcting. Different `uboDocumentType` values are independent, so a passport and a driving licence can both be held at once.
**Every other requirement appends.** Files accumulate across uploads and nothing is replaced, so send only what is new.
**File order is meaningful for `ubo-kyc`.** `files[0]` is the front of the document and `files[1]` the back. Send one file for a single-sided document such as a passport bio page. The order is preserved in the response.

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
      "post": {
        "summary": "Upload Universal KYB documents",
        "description": "Uploads one or more Universal KYB documents against a single document type.\n\n**Which entity does `entityId` refer to?** Always the `BUSINESS` entity being onboarded, regardless of document type.\n\nFor `ubo-kyc`, the beneficial owner is named separately by two required fields: `individualEntityId` (the UBO's own `INDIVIDUAL` entity uuid, as returned when the UBO was declared) and `uboDocumentType` (the kind of identity document being uploaded — one of `PASSPORT`, `ID_CARD`, `DRIVERS_LICENCE`). Neither field may be sent for any other document type.\n\n**Allowed extensions**, for every requirement except `ubo-kyc`: .jpg, .jpeg, .pdf, .png, .gif, .xlsx, .xls, .doc, .docx, .csv. `ubo-kyc` accepts a narrower set — .jpg, .jpeg, .png, .pdf. Either way the declared multipart MIME type must match the extension (e.g. `.pdf` requires `application/pdf`).\n\n**File caps, per requirement type.** `ubo-kyc`: 2 files per request (a front/back pair), and at most 20 files in total for one beneficial owner — that total counts superseded files, so it does not reset when you re-upload. Every other requirement: 5 files per request and 20 files in total per requirement, counted per requirement so filling one does not restrict another.\n\n**Re-uploading behaves differently for identity documents.** For `ubo-kyc`, a second upload for the same `uboDocumentType` **replaces** what was there before: the previous files stop being part of the submission. This is destructive — send the complete set you want on record, not just the side you are correcting. Different `uboDocumentType` values are independent, so a passport and a driving licence can both be held at once.\n**Every other requirement appends.** Files accumulate across uploads and nothing is replaced, so send only what is new.\n**File order is meaningful for `ubo-kyc`.** `files[0]` is the front of the document and `files[1]` the back. Send one file for a single-sided document such as a passport bio page. The order is preserved in the response.",
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
            "description": "The BUSINESS entity being onboarded. Always the business entity, regardless of document type."
          }
        ],
        "requestBody": {
          "description": "The document type and the file(s) to upload. Allowed extensions: .jpg, .jpeg, .pdf, .png, .gif, .xlsx, .xls, .doc, .docx, .csv.",
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "documentType",
                  "files"
                ],
                "properties": {
                  "documentType": {
                    "type": "string",
                    "enum": [
                      "certificate-of-incorporation",
                      "company-profile",
                      "shareholding-chart",
                      "register-of-directors",
                      "business-registry",
                      "source-of-funds-supporting-doc",
                      "source-of-wealth-supporting-doc",
                      "ubo-kyc"
                    ],
                    "example": "certificate-of-incorporation",
                    "description": "The Universal KYB requirement the files are being submitted for."
                  },
                  "uboDocumentType": {
                    "type": "string",
                    "enum": [
                      "PASSPORT",
                      "ID_CARD",
                      "DRIVERS_LICENCE"
                    ],
                    "example": "PASSPORT",
                    "description": "The kind of identity document being uploaded. Required when `documentType` is `ubo-kyc`, and rejected otherwise. Must match the `document[].type` declared for this beneficial owner on `/ukyb` — submission compares the two."
                  },
                  "individualEntityId": {
                    "type": "string",
                    "format": "uuid",
                    "description": "The beneficial owner's own `INDIVIDUAL` entity uuid, as returned when the UBO was declared on `/ukyb`. Required when `documentType` is `ubo-kyc`, and rejected otherwise."
                  },
                  "files": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "format": "binary",
                      "description": "The file to upload. Must have one of the allowed extensions (.jpg, .jpeg, .pdf, .png, .gif, .xlsx, .xls, .doc, .docx, .csv) and a matching MIME type."
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Documents uploaded successfully.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "submittedRequirementId": {
                      "type": "string",
                      "format": "uuid",
                      "description": "The submission record the uploaded files were recorded against. Not unique per request: for appending requirement types the same record is reused across uploads, so treat it as the record that now holds your files rather than a receipt for this call."
                    },
                    "documentType": {
                      "type": "string",
                      "enum": [
                        "certificate-of-incorporation",
                        "company-profile",
                        "shareholding-chart",
                        "register-of-directors",
                        "business-registry",
                        "source-of-funds-supporting-doc",
                        "source-of-wealth-supporting-doc",
                        "ubo-kyc"
                      ],
                      "description": "The document type the files were filed under."
                    },
                    "files": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "fileId": {
                            "type": "string",
                            "format": "uuid"
                          },
                          "fileName": {
                            "type": "string"
                          }
                        }
                      },
                      "description": "The files stored by this request, in the order they were uploaded."
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "The upload was rejected by validation (unknown document type, wrong entity type, unsupported file type, MIME mismatch, or file cap reached).",
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
                  "wrongEntityType": {
                    "summary": "Path entity is not the BUSINESS entity",
                    "value": {
                      "code": "0303001400",
                      "message": "The entity in the path must be the BUSINESS entity being onboarded, not a beneficial owner",
                      "parameter": ""
                    }
                  },
                  "missingIndividualEntityId": {
                    "summary": "individualEntityId missing for ubo-kyc",
                    "description": "Schema-level rejections (from validateWithZod) carry the literal code \"400\", not a REQUIREMENT.* code.",
                    "value": {
                      "code": "400",
                      "message": "individualEntityId: individualEntityId is required when documentType is \"ubo-kyc\"",
                      "parameter": "individualEntityId"
                    }
                  },
                  "unsupportedExtension": {
                    "summary": "File extension not in allowlist",
                    "value": {
                      "code": "0303003400",
                      "message": "Unsupported file extension \".exe\" for file other.exe",
                      "parameter": ""
                    }
                  },
                  "fileCapReached": {
                    "summary": "File cap reached (max 20 per requirement)",
                    "value": {
                      "code": "0303001400",
                      "message": "File cap reached for requirement company-profile (20 of max 20 files; this upload adds 1)",
                      "parameter": ""
                    }
                  }
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
            "description": "The specified entity or requirement was not found.",
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