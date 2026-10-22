---
updatedAt: 2026-04-22T08:49:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Get settlement file for company

The `GET /files` endpoint allows card program owners to retrieve financial reports in CSV format, providing a structured view of fees, revenue, and transaction data for your team to reconcile. These reports help with:

1. **Master Account Balance Monitoring:**

   Tracking transaction activities to gain insights into the card program's spending level and maintain appropriate collateral in the master account balance.

2. **Bookkeeping & Billing Breakdown:**

   Understanding **fee structures** upon receiving the monthly bill from Reap.

When you request a report from this endpoint, a webhook event (eventType = `files`) will be triggered.

***

## **Available File Types**

| `fileType`                  | Description                                                                                                                                     | Use Case                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `monthly`                   | A complete list of all **transaction events** that impacted your **master account balance** for a given month.                                  | Helps **reconcile** cardholder transactions and understand their impact on your **master account balance** over a monthly period.              |
| `daily`                     | A complete list of all **transaction events** that impacted your **master account balance** for a specific day.                                 | Helps **reconcile** cardholder transactions and understand their impact on your **master account balance** over a daily period.                |
| `fee`                       | Provides details on **FX and ATM fees** charged to cardholders, representing the revenue earned by your card program in a given period of time. | Helps you track the **revenue** from FX and ATM mark-up fees, which are deducted from your monthly invoice as revenue generated.               |
| `monthlyTransactionFees`    | A breakdown of **transaction-related fees or revenue**, detailing all costs incurred per transaction.                                           | Helps you **verify transaction-level fees or revenue**, ensuring accurate reconciliation at the individual transaction level in a given month. |
| `monthlyNonTransactionFees` | A **line-item breakdown** of **non-transactional costs**, such as card issuance fees and maintenance charges.                                   | Helps you **reconcile operational costs** associated with running your card program, excluding transaction-based fees.                         |
| `dailyTransactionFee`       | A breakdown of **transaction-related cost or revenue**, detailing all costs incurred per transaction.                                           | Helps you **verify transaction-level cost or revenue**, ensuring accurate reconciliation at the individual transaction level in a given day    |

> 🚧 ⚠️ Download Window
>
> The download URL available from the files webhook expires after 5 minutes. Make sure to download your report within this timeframe..

***

## **How to Retrieve These Reports**

1. Select your desired report type:
   * **For Reconciliation:** Use the **`daily`or`monthly` reports** to track all transactions affecting your **master account balance**.

   * **For Monthly Invoice Breakdown:** Request the `dailyTransactionFee`, **`monthlyTransactionFees`,`monthlyNonTransactionFees`, and `Fee reports`** to get a **line-item breakdown** of your **costs and revenue**.
2. Specify the `date` query parameter within the desired time frame:
   * For **Daily Reports**: Request on or after **T+2** (2 days after the date you are querying). Specify the exact date (YYYY-MM-DD)
   * For **Monthly Reports**: Request on or after the **2nd day of the following month,** Specify any date within the month (YYYY-MM-DD)\
     \_Submit the request to the endpoint. The report will include all data up to**11:59 PM UTC** on the selected date.

> 📘 Know more about Reconciliation
>
> * To learn more about reconciling changes in master account balance, click [here](https://reap.readme.io/update/docs/tracking-reconciling-card-transactions-to-master-acount-balance-1#/).
> * To learn more about reconciling monthly invoice billing, click [here](https://reap.readme.io/update/docs/understanding-monthly-invoice#/).

## **Recommended Timing and Data Availability Table**

This table summarizes when to request each report type and the expected result, including potential errors if requested too early.

<Table align={["left","left","left","left","left"]}>
  <thead>
    <tr>
      <th>
        Use Case
      </th>

      <th>
        File Type
      </th>

      <th>
        Recommended Request Date
      </th>

      <th>
        Example
      </th>

      <th>
        Expected Result
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        Get a daily report for a specific date
      </td>

      <td>
        **Daily Report**
        `dailyTransactionFee`| `daily`
      </td>

      <td>
        On or after T+2 (2 days after the date)
      </td>

      <td>
        Request for `2024-01-01` on 2024-01-03
      </td>

      <td>
        Transactions recorded on **January 1st**
      </td>
    </tr>

    <tr>
      <td>
        Get a full monthly report for a completed month
      </td>

      <td>
        **Monthly Report**
        `monthlyTransactionFee`| `monthly `| `monthlyNonTransactionFees` | `Fees`
      </td>

      <td>
        On or after 2nd day of the following month
      </td>

      <td>
        Request for `2024-01-01` on 2024-02-02
      </td>

      <td>
        All transactions from **January 1st to January 31st**
      </td>
    </tr>

    <tr>
      <td>
        Get a partial monthly report before the month ends
      </td>

      <td>
        **Monthly Report**
        `monthlyTransactionFee`| `monthly` | `monthlyNonTransactionFees` | `Fee`
      </td>

      <td>
        Any date before the month ends
      </td>

      <td>
        Request for `2024-08-24` on 2024-08-24
      </td>

      <td>
        Transactions from **August 1st to August 24th 11:59 PM**
      </td>
    </tr>

    <tr>
      <td>
        Getting a daily report too early
      </td>

      <td>
        **Daily Report**
        `dailyTransactionFee`| `daily`
      </td>

      <td>
        Requested before T+2
      </td>

      <td>
        Request for `2024-01-01` on 2024-01-03
      </td>

      <td>
        **Error 400**: `The provided date must be at least two days in the past.`
      </td>
    </tr>

    <tr>
      <td>
        Getting a monthly report too early
      </td>

      <td>
        **Monthly Report** `monthlyTransactionFee`| `monthly` | `monthlyNonTransactionFees` | `Fees`
      </td>

      <td>
        Requested before month-end
      </td>

      <td>
        Request for `2024-08-01` on 2024-08-24
      </td>

      <td>
        Transactions from **August 1st to August 24th**
      </td>
    </tr>

    <tr>
      <td>
        Requesting data for today or a future date
      </td>

      <td>
        **Any Report Type**
      </td>

      <td>
        Same day or future date
      </td>

      <td>
        Request for `2024-01-03` on 2024-01-03
      </td>

      <td>
        **Error**: `The selected date is invalid`
      </td>
    </tr>
  </tbody>
</Table>

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
    "/files/{fileType}": {
      "get": {
        "summary": "Get settlement file for company",
        "tags": [
          "Files",
          "Swipe"
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
            "name": "date",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date",
              "description": "Date in YYYY-MM-DD format"
            }
          },
          {
            "name": "fileType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "monthly",
                "daily",
                "fee",
                "monthlyTransactionFees",
                "monthlyNonTransactionFees",
                "dailyTransactionFees",
                "monthlyShippingFees"
              ]
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
            "description": "File being generated. Link will be provided via webhook",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    },
                    "reference_id": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "message",
                    "reference_id"
                  ],
                  "additionalProperties": false
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
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
                            "0901001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "The provided date must be at least one day in the past.",
                            "The provided date must be at least two days in the past.",
                            "Shipping reports are only available from December 2025 onwards."
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
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0901002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Budget not found"
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
                    },
                    {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "enum": [
                            "0901003"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Business not found"
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
          "404": {
            "description": "Not found",
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
                            "0201001"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "No data found for those parameters, please adjust the date and try again"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            404
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
          "500": {
            "description": "Internal server error",
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
                            "0201002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "File is currently being generated and will take at least 10 min."
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            500
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
                            "0201002"
                          ]
                        },
                        "message": {
                          "type": "string",
                          "enum": [
                            "Error while generating file"
                          ]
                        },
                        "statusCode": {
                          "type": "number",
                          "format": "float",
                          "enum": [
                            500
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