---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Get all transactions

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
    "/transactions": {
      "get": {
        "summary": "Get all transactions",
        "tags": [
          "Transactions"
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
              "type": "number",
              "format": "float",
              "minimum": 1,
              "description": "The page number to retrieve in a paginated response. Used in combination with **limit** to specify the starting point for a subset of records.",
              "default": 1
            }
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "number",
              "format": "float",
              "maximum": 100,
              "description": "A limit on the number of objects to be returned.",
              "default": 50
            }
          },
          {
            "in": "query",
            "name": "fromDate",
            "schema": {
              "type": "string",
              "description": "The start date for filtering the records, formatted as **YYYY-MM-DD**. Only records from this date onwards will be retrieved."
            }
          },
          {
            "in": "query",
            "name": "toDate",
            "schema": {
              "type": "string",
              "description": "The end date for filtering the records, formatted as **YYYY-MM-DD**. Only records up to this date will be retrieved."
            }
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
        "responses": {
          "200": {
            "description": "Return transactions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "description": "Reap’s internal ID for the balance change record."
                          },
                          "card_id": {
                            "type": "string",
                            "description": "The unique identifier of the card for which transaction details are being retrieved."
                          },
                          "bill_amount": {
                            "type": "number",
                            "format": "float",
                            "description": "The total amount charged to the cardholder, in the card’s currency. This amount includes the transaction amount plus any applicable fees."
                          },
                          "bill_currency": {
                            "type": "string",
                            "description": "The [ISO 4217 currency code](https://en.wikipedia.org/wiki/ISO_4217) for the bill. Defaults to the card’s currency if not specified."
                          },
                          "transaction_amount": {
                            "type": "number",
                            "format": "float",
                            "description": "The original amount of the transaction in the merchant’s currency, representing the base value of the purchase before fees are added."
                          },
                          "transaction_currency": {
                            "type": "string",
                            "description": "The [ISO 4217 currency code](https://en.wikipedia.org/wiki/ISO_4217) for the transaction. Defaults to the card’s currency if not specified."
                          },
                          "conversion_rate": {
                            "type": "string",
                            "description": "The conversion rate applied from the transaction currency to the bill currency."
                          },
                          "merchant_data": {
                            "type": "object",
                            "properties": {
                              "merchant_id": {
                                "type": "string",
                                "description": "The unique identifier of the merchant."
                              },
                              "merchant_name": {
                                "type": "string",
                                "description": "The merchant’s name."
                              },
                              "merchant_city": {
                                "type": "string",
                                "description": "The city of the merchant’s registered address."
                              },
                              "merchant_post_code": {
                                "type": "string",
                                "description": "The postal code of the merchant’s registered address."
                              },
                              "merchant_state": {
                                "type": "string",
                                "description": "The state or province of the merchant’s registered address."
                              },
                              "merchant_country": {
                                "type": "string",
                                "maxLength": 2,
                                "description": "The country of the merchant’s registered address."
                              },
                              "mcc_category": {
                                "type": "string",
                                "description": "The merchant category code (MCC) category."
                              },
                              "mcc_code": {
                                "type": "string",
                                "description": "The merchant category code."
                              }
                            },
                            "additionalProperties": false,
                            "description": "Details about the merchant associated with the transaction."
                          },
                          "channel": {
                            "type": "string",
                            "enum": [
                              "ATM",
                              "POS",
                              "ECOMMERCE",
                              "VISA_DIRECT"
                            ],
                            "description": "Specifies the channel used for the transaction. Possible values:\n\n**ATM**: Automated Teller Machine. Transactions made via ATM, typically involving cash withdrawals.\n\n**POS**: Point of Sale. Transactions made at physical terminals, such as in-store card readers.\n\n**ECOMMERCE**: Online merchant transactions. These involve purchases made through e-commerce platforms or websites.\n\n**VISA_DIRECT**: Transactions processed using Visa Direct."
                          },
                          "pos_entry_mode": {
                            "type": "object",
                            "properties": {
                              "code": {
                                "type": "string",
                                "description": "The unique identifier of the POS."
                              },
                              "description": {
                                "type": "string",
                                "description": "A description of the POS."
                              }
                            },
                            "additionalProperties": false,
                            "description": "- **0**: Terminal not used\n\n- **1**: Key entry\n\n- **2**: Magnetic strip read (general or track 2)\n\n- **3**: Bar code read (Visa only)\n\n- **4**: OCR read\n\n- **5**: Chip card read-data reliable\n\n- **6**: Track 1 read\n\n- **7**: Proximity payment originating using VSDC chip data rules\n\n- **90**: Entire content of magnetic stripe was transmitted in authorization request (CVV)\n\n- **91**: Proximity payment originating using magnetic strip data rules\n\n- **95**: Initiated by chip card: CVV data may be unreliable\n\n"
                          },
                          "fees": {
                            "type": "object",
                            "properties": {
                              "atm_fees": {
                                "type": "string",
                                "description": "ATM fees incurred."
                              },
                              "fx_fees": {
                                "type": "string",
                                "description": "Foreign exchange fees incurred."
                              }
                            },
                            "additionalProperties": false,
                            "description": "Details of fees involved in the transaction, in the **bill_currency**"
                          },
                          "mcc_padding_amount": {
                            "type": "number",
                            "format": "float",
                            "description": "The amount padded for this transaction. Learn more about [MCC padding](https://reap.readme.io/docs/risk-management-mcc-padding)."
                          },
                          "wallet": {
                            "type": "string",
                            "description": "Indicates if the transaction was processed through a digital wallet. Possible values:\n\n**ANDROID**: Transaction processed via Google Pay.\n\n**APPLE**: Transaction processed via Apple Pay."
                          },
                          "cleared_at": {
                            "type": "string",
                            "description": "The date the transaction was cleared, if applicable."
                          },
                          "created_at": {
                            "type": "string",
                            "description": "The date the transaction was created."
                          },
                          "status": {
                            "type": "string",
                            "description": "Status of this transaction event.\n\nPossible values: \n\n**PENDING**\n\n**VOID**\n\n**DECLINED**\n\n**CLEARED**\n\n"
                          },
                          "category": {
                            "type": "string",
                            "description": "Card category. Default value **Others**."
                          },
                          "is_credit": {
                            "type": "boolean",
                            "description": "Indicates whether the transaction is a reversal or refund. If the transaction is a reversal or refund, this field will return **true**."
                          },
                          "decline_reason": {
                            "type": "object",
                            "properties": {
                              "response_code": {
                                "type": "string",
                                "description": "The decline response code. Read more about [transaction decline](https://reap.readme.io/docs/transaction-decline)."
                              },
                              "description": {
                                "type": "string",
                                "description": "A description of the decline reason. Refer to this page for more information about decline reasons"
                              }
                            },
                            "additionalProperties": false,
                            "description": "Details about a declined transaction. This field is populated only if the transaction status is **DECLINED**."
                          },
                          "lifecycle_events": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "affect_balance": {
                                  "type": "boolean",
                                  "description": "The card balance after this transaction."
                                },
                                "bill_amount": {
                                  "type": "string",
                                  "description": "The billed amount."
                                },
                                "bill_currency": {
                                  "type": "string",
                                  "description": "The billing currency. Defaults to the card program’s currency."
                                },
                                "created_at": {
                                  "type": "string",
                                  "description": "The date the transaction was created."
                                },
                                "lifecycle_event_id": {
                                  "type": "string",
                                  "description": "The unique identifier for this lifecycle event."
                                },
                                "mcc_padding_amount": {
                                  "type": "string",
                                  "description": "The amount padded during the lifecycle event."
                                },
                                "transaction_amount": {
                                  "type": "string",
                                  "description": "The transaction amount."
                                },
                                "transaction_currency": {
                                  "type": "string",
                                  "description": "The transaction currency."
                                },
                                "type": {
                                  "type": "string",
                                  "enum": [
                                    "authorization",
                                    "authorization.clearing",
                                    "authorization.reversal",
                                    "authorization.advice",
                                    "refund"
                                  ],
                                  "description": "The type of the transaction event. Possible values:\n\n**authorization**\n\n**authorization.clearing**\n\n**authorization.reversal**\n\n**authorization.advice**\n\n**refund**\n\nLearn more about all [transaction event types](https://reap.readme.io/reference/webhook-eventtype-transaction#/)."
                                },
                                "pos_data": {
                                  "type": "object",
                                  "properties": {
                                    "pos_transaction_data": {
                                      "type": "object",
                                      "properties": {
                                        "cardholder_present_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "cardholder_not_present_unspecified",
                                            "cardholder_not_present_mail_order",
                                            "cardholder_not_present_telephone_order",
                                            "cardholder_not_present_standing_auth/recurring_transaction",
                                            "cardholder_not_present_ecommerce",
                                            "cardholder_not_present_installment_transaction",
                                            "unknown"
                                          ]
                                        },
                                        "card_present_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "card_not_present",
                                            "card_present"
                                          ]
                                        },
                                        "card_data_input_method": {
                                          "type": "string",
                                          "enum": [
                                            "information_not_provided",
                                            "manual_no_terminal",
                                            "magnetic_stripe_read",
                                            "bar_code",
                                            "optical_character_recognition",
                                            "chip_dip/emv_contact",
                                            "key_entered_or_added_manually",
                                            "emv_contactless_or_vsdc_contactless",
                                            "ecommerce",
                                            "ecommerce_with_emv_cryptogram",
                                            "contactless_magnetic_stripe",
                                            "account_data_on_file",
                                            "key_entered_by_acquirer",
                                            "micr_reader",
                                            "qr_code",
                                            "unknown"
                                          ]
                                        },
                                        "cardholder_authentication_method": {
                                          "type": "array",
                                          "items": {
                                            "type": "string",
                                            "enum": [
                                              "not_authenticated",
                                              "pin",
                                              "electronic_signature_analysis",
                                              "biometrics",
                                              "biographic",
                                              "manual_signature_verification",
                                              "other_manual_verification",
                                              "other",
                                              "unknown",
                                              "passcode/password",
                                              "pattern",
                                              "possession_of_hardware_device",
                                              "possession_of_hardware_device_with_user_verification",
                                              "3d-secure"
                                            ]
                                          }
                                        },
                                        "cardholder_authentication_entity": {
                                          "type": "array",
                                          "items": {
                                            "type": "string",
                                            "enum": [
                                              "not_authenticated",
                                              "chip_card",
                                              "card_acceptance_device/terminal",
                                              "authorising_agent",
                                              "merchant",
                                              "other",
                                              "cardholder_device",
                                              "wallet_provider_and/or_token_requestor",
                                              "unknown"
                                            ]
                                          }
                                        },
                                        "pos_fraud_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "no_problem",
                                            "merchant_suspicious",
                                            "merchant_verified_the_cardholder_id",
                                            "unknown"
                                          ]
                                        },
                                        "3d_secure_authentication_method": {
                                          "type": "string",
                                          "enum": [
                                            "unknown/not_applicable",
                                            "3ds_1.0.2_or_prior_or_3ds_1.0.2_frictionless_flow",
                                            "challenge_flow_using_otp_via_sms_method",
                                            "3ds_2.0_challenge_flow_using_otp_via_any_other_method",
                                            "3ds_2.0_challenge_flow_using_out_of_band_with_biometric_method",
                                            "3ds_2.0_frictionless_flow"
                                          ]
                                        },
                                        "security_protocol_between_cardholder_device_and_merchant": {
                                          "type": "string",
                                          "enum": [
                                            "none",
                                            "channel_encryption",
                                            "not_applicable",
                                            "unknown"
                                          ]
                                        },
                                        "card_device_type": {
                                          "type": "string",
                                          "enum": [
                                            "card",
                                            "mini-card",
                                            "jewelry",
                                            "mobile_phone",
                                            "non-card",
                                            "unknown"
                                          ]
                                        },
                                        "merchant_or_cardholder_initiated_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "cardholder_initiated",
                                            "merchant_initiated",
                                            "unknown"
                                          ]
                                        },
                                        "merchant_initiated_transaction_type_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "credential_on_file",
                                            "standing_order",
                                            "subscription",
                                            "instalment",
                                            "partial_shipment",
                                            "related/delayed_charge",
                                            "no_show_charge",
                                            "resubmission",
                                            "unknown/not_applicable"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "cardholder_present_indicator",
                                        "card_present_indicator",
                                        "card_data_input_method",
                                        "cardholder_authentication_method",
                                        "cardholder_authentication_entity",
                                        "pos_fraud_indicator",
                                        "3d_secure_authentication_method",
                                        "security_protocol_between_cardholder_device_and_merchant",
                                        "card_device_type",
                                        "merchant_or_cardholder_initiated_indicator",
                                        "merchant_initiated_transaction_type_indicator"
                                      ],
                                      "additionalProperties": false
                                    },
                                    "pos_terminal_capability": {
                                      "type": "object",
                                      "properties": {
                                        "partial_approval_support": {
                                          "type": "string",
                                          "enum": [
                                            "not_supported",
                                            "supported",
                                            "unknown"
                                          ]
                                        },
                                        "card_data_input_capability": {
                                          "type": "array",
                                          "items": {
                                            "type": "string",
                                            "enum": [
                                              "unknown",
                                              "manual",
                                              "magnetic_stripe",
                                              "barcode",
                                              "ocr",
                                              "emv_contact",
                                              "pan_key_entry",
                                              "contactless_magnetic_stripe",
                                              "emv_contactless_or_qvsdc_contactless",
                                              "account_data_on_file",
                                              "qr_code",
                                              "e_commerce",
                                              "e_commerce_with_emv_cryptogram",
                                              "micr_reader"
                                            ]
                                          }
                                        },
                                        "cardholder_authentication_capability": {
                                          "type": "array",
                                          "items": {
                                            "type": "string",
                                            "enum": [
                                              "none",
                                              "pin",
                                              "electronic_signature_analysis",
                                              "biometrics",
                                              "biographic",
                                              "manual_signature_verification",
                                              "manual_other",
                                              "offline_pin",
                                              "online_pin",
                                              "3d_secure",
                                              "account_based_digital_signature",
                                              "public_key_based_digital_signature",
                                              "unknown"
                                            ]
                                          }
                                        },
                                        "card_capture_capability": {
                                          "type": "string",
                                          "enum": [
                                            "card_capture_not_supported",
                                            "card_capture_supported",
                                            "unknown"
                                          ]
                                        },
                                        "terminal_attended_indicator": {
                                          "type": "string",
                                          "enum": [
                                            "no_terminal_used",
                                            "attended",
                                            "unattended",
                                            "unknown"
                                          ]
                                        },
                                        "terminal_environment": {
                                          "type": "string",
                                          "enum": [
                                            "no_terminal_used",
                                            "on_premises_of_card_acceptor",
                                            "off_premises_of_card_acceptor",
                                            "on_premises_of_cardholder",
                                            "unknown"
                                          ]
                                        },
                                        "terminal_card_data_output_capability": {
                                          "type": "string",
                                          "enum": [
                                            "unknown",
                                            "none",
                                            "magnetic_stripe_write",
                                            "icc",
                                            "other"
                                          ]
                                        },
                                        "terminal_output_capability": {
                                          "type": "string",
                                          "enum": [
                                            "unknown",
                                            "none",
                                            "print_only",
                                            "display_only",
                                            "print_and_display"
                                          ]
                                        },
                                        "terminal_pin_capture_capability": {
                                          "type": "string",
                                          "enum": [
                                            "none",
                                            "unknown",
                                            "yes_max_length_4_digits",
                                            "yes_max_length_5_digits",
                                            "yes_max_length_6_digits",
                                            "yes_max_length_7_digits",
                                            "yes_max_length_8_digits",
                                            "yes_max_length_9_digits",
                                            "yes_max_length_10_digits",
                                            "yes_max_length_11_digits",
                                            "yes_max_length_12_digits"
                                          ]
                                        },
                                        "terminal_type": {
                                          "type": "string",
                                          "enum": [
                                            "unknown/unspecified",
                                            "cat_level_1_automated_dispensing_machine",
                                            "cat_level_2_self_service_terminal",
                                            "cat_level_3_limited_amount_terminal",
                                            "cat_level_4_in_flight_commerce_terminal",
                                            "cat_level_5",
                                            "cat_level_6_e_commerce_terminal",
                                            "cat_level_7_transponder",
                                            "mobile_pos_acceptance_device",
                                            "manual",
                                            "atm",
                                            "electronic_cash_register_or_normal_attended_pos_device",
                                            "unknown"
                                          ]
                                        }
                                      },
                                      "required": [
                                        "partial_approval_support",
                                        "card_data_input_capability",
                                        "cardholder_authentication_capability",
                                        "card_capture_capability",
                                        "terminal_attended_indicator",
                                        "terminal_environment",
                                        "terminal_card_data_output_capability",
                                        "terminal_output_capability",
                                        "terminal_pin_capture_capability",
                                        "terminal_type"
                                      ],
                                      "additionalProperties": false
                                    }
                                  },
                                  "required": [
                                    "pos_transaction_data",
                                    "pos_terminal_capability"
                                  ],
                                  "additionalProperties": false
                                }
                              },
                              "required": [
                                "affect_balance",
                                "bill_amount",
                                "bill_currency",
                                "created_at",
                                "lifecycle_event_id",
                                "transaction_amount",
                                "transaction_currency",
                                "type"
                              ],
                              "additionalProperties": false
                            },
                            "description": "Details about how the transaction affects the lifecycle of the card balance."
                          }
                        },
                        "additionalProperties": false
                      }
                    },
                    "meta": {
                      "type": "object",
                      "properties": {
                        "itemCount": {
                          "type": "number",
                          "format": "float",
                          "description": "The number of items returned on the current page."
                        },
                        "totalItems": {
                          "type": "number",
                          "format": "float",
                          "description": "The total number of items across all pages."
                        },
                        "itemsPerPage": {
                          "type": "number",
                          "format": "float",
                          "description": "The maximum number of items that can be returned per page."
                        },
                        "totalPages": {
                          "type": "number",
                          "format": "float",
                          "description": "The total number of pages available based on the **itemsPerPage** and **totalItems**."
                        },
                        "currentPage": {
                          "type": "number",
                          "format": "float",
                          "description": "The current page number in the paginated response."
                        }
                      },
                      "required": [
                        "itemCount",
                        "totalItems",
                        "itemsPerPage",
                        "totalPages",
                        "currentPage"
                      ],
                      "additionalProperties": false,
                      "description": "Pagination metadata for the response."
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
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