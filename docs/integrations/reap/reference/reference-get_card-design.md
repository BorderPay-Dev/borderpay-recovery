---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Retrieve all card design

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
    "/card-design/": {
      "get": {
        "summary": "Retrieve all card design",
        "tags": [
          "Card"
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
            "description": "Return card design list for user",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "cardDesigns": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "description": "The unique identifier of the approved card design group."
                          },
                          "name": {
                            "type": "string",
                            "description": "The name of the card design."
                          },
                          "stock": {
                            "type": "boolean",
                            "description": "Indicates whether there is available stock of blank physical cards in the warehouse, ready to be personalized with cardholder details. This is a boolean value:\n\n**true**: Stock is available.\n\n**false**: Stock is depleted, and you may need to contact your relationship manager to initiate the manufacturing of additional blank cards."
                          },
                          "inventories": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "description": "The unique identifier of the inventory record."
                                },
                                "openingStock": {
                                  "type": "integer",
                                  "description": "The opening stock count for this inventory record."
                                },
                                "closingStock": {
                                  "type": "integer",
                                  "description": "The closing stock count for this inventory record."
                                },
                                "updatedAt": {
                                  "type": "string",
                                  "format": "date-time",
                                  "description": "The date and time when this inventory record was last updated."
                                }
                              },
                              "required": [
                                "id",
                                "openingStock",
                                "closingStock",
                                "updatedAt"
                              ],
                              "additionalProperties": false
                            },
                            "description": "A list of inventory records associated with this card design, showing opening and closing stock levels."
                          },
                          "default": {
                            "type": "boolean",
                            "description": "Indicates whether this card design is the default option.\n\nIf this design is marked as **default**, and the [POST /cards](https://reap.readme.io/reference/post_cards) endpoint is called without specifying a value in the **cardDesignID** field, the default design will automatically be assigned to the card."
                          },
                          "embossNameSupported": {
                            "type": "boolean",
                            "description": "Indicates whether this card design supports the **secondaryCardName** field during card manufacturing and personalization.\n\n**true**: This card design allows the **secondaryCardName** during physical card manufacturing and personalization.\n\n**false**: This card design does not support the **secondaryCardName** during physical card manufacturing and personalization."
                          }
                        },
                        "required": [
                          "id",
                          "name",
                          "stock",
                          "inventories",
                          "default",
                          "embossNameSupported"
                        ],
                        "additionalProperties": false
                      },
                      "description": "A list of Visa approved card design."
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "totalItems": {
                          "type": "integer",
                          "description": "The total number of card designs available."
                        },
                        "itemCount": {
                          "type": "integer",
                          "description": "The number of card designs returned in this page."
                        },
                        "itemsPerPage": {
                          "type": "integer",
                          "description": "The maximum number of card designs per page."
                        },
                        "totalPages": {
                          "type": "integer",
                          "description": "The total number of pages available."
                        },
                        "currentPage": {
                          "type": "integer",
                          "description": "The current page number."
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
                    "meta"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "404": {
            "description": "Account not found",
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