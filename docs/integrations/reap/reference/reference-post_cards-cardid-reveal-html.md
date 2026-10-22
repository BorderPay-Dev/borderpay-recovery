---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Show Card PAN - HTML

This endpoint is used to securely retrieve the card’s <Glossary>PAN</Glossary>, expiration date and CVV in a PCI-compliant manner. It generates and returns a URL that is valid for up to 60 seconds and is intended to be used as the source for an iFrame embedded in your client-side application.

For detailed guidance on implementing this iFrame solution, please refer to our [Display Widget Guide](https://reap.readme.io/docs/card-widget) and reach out to your account manager.

> ❗️ Important Security Considerations: Client-side Usage Only
>
> This API is still accessed by using your secured Reap API Token from a Whitelisted IP Address. Data should pass directly to your frontend without handling or exposing PAN details. The only customization you should make is to the CSS styling. Attempting to parse or extract PAN details on your backend servers exposes your application to sensitive card data and shifts PCI DSS compliance responsibilities onto your system—putting you at risk of PCI DSS compliance.

***

## Encrypting your `accessUrl`

It is strongly recommended that you render the Display Widget in an a secure environment where your cardholder has already been authenticated. For enhanced security, you can opt to encrypt the `accessUrl` to ensure only verified cardholders can decrypt it. This is achieved by providing a `publicKey` in the request body. Follow these instructions below to properly encrypt and encode the `publicKey`:

**Step 1**: Generate an RSA Public/ Private Key Pair. Use [this website ](https://8gwifi.org/RSAFunctionality?keysize=4096)for key generation with the following options for best results:

* Key size: 4096 bit
* RSA cipher: RSA/NONE/OAEPWithSHA1AndMGF1Padding

Copy the generated public key from the tool. Don't remove the BEGIN and End parts, copy the entire string.

**Step 2**: Base64 Encode the public key before adding the public key to your request body. You should see something like this after the encoding.

**Step 3**: Use this based64 encoded public key in the API request body.

## Decrypting your `accessUrl`

When a `publicKey` is provided in the request body, the `accessUrl` in the response will initially contain a Base64 Encoded and RSA encrypted message. To reveal the actual `accessUrl`:

1. **Base64 Decode the message**.
2. **Decrypt** using your private key.

> 🚧 Security Reminder
>
> Your private key should never be exposed in the client-side code, logs, or version-control. Store it securely and restrict access to authorized systems only.

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
    "/cards/{cardId}/reveal-html": {
      "post": {
        "summary": "Show Card PAN - HTML",
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
            "in": "path",
            "name": "cardId",
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "The unique identifier of the card for which you want to display the card PAN."
          },
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
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "publicKey": {
                    "type": "string",
                    "nullable": true,
                    "description": "Uses base64 format.\n\n• When **publicKey** is provided, we return the **accessUrl** for the iframe in an encrypted format.\n\n• When **publicKey** is not provided, we return the **accessUrl** without any encryption"
                  },
                  "stylesheetUrl": {
                    "type": "string",
                    "description": "URL to your stylesheet that can be used for customizing the CSS of the iframe's content."
                  },
                  "copyPan": {
                    "type": "boolean",
                    "description": "Display a button to copy the card PAN to clipboard."
                  }
                },
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "accessUrl containing card information, which can be accessed for upto 60 seconds.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "accessUrl": {
                      "type": "string",
                      "description": "Valid for 1 minute.\n\n• When **publicKey** is provided, we return the **accessUrl** for the iframe in an encrypted format ( base64 format).\n\n• When **publicKey** is not provided, we return the **accessUrl** without any encryption."
                    }
                  },
                  "required": [
                    "accessUrl"
                  ],
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
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0322001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Key already used in last 24 hours"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            400
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  ]
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "insufficient_permissions"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Insufficient permissions"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            403
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "forbidden_access"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Premium endpoint not allowed: /cards/:cardID/reveal-html"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            403
                          ]
                        },
                        "parameter": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  ]
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