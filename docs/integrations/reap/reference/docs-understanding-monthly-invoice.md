---
updatedAt: 2025-05-19T02:59:40.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Understanding Monthly Invoice 

Upon committing to the card issuing program with Reap, you will receive monthly invoices after launching your card program. The invoice outlines all fees and revenue associated with your card program. To review and reconcile the breakdown of fees and revenue with their sources, you can use the `GET /files` endpoint to request detailed billing files. These files help you match and reconcile the charges and revenue on your invoice to specific transactions.

# Cost Structure

Your **monthly invoice** will include the following categories of costs:

1. **Transaction-related**: Charges incurred from card transactions.
2. **Non-transaction related**: Fees that are not transaction depend like operational costs (card shipping, design, maintenance fee) or add-on features that your card program subscribed to.  Costs that your card program has subscribed to, such as physical card production and add-on feature subscriptions.

***

# Revenue Offset

As a **card program owner**, you have the flexibility to **customize FX and ATM fees** applied to your cardholders. The **markup generated** from these activities is considered **revenue** for your card program.

This **revenue is automatically deducted** from your **monthly invoice**, reducing your overall program costs. You can retrieve a **detailed breakdown** of these earnings by calling the `GET /files` endpoint and selecting the `fee` file type.

The revenue is automatically deducted from your monthly invoice, reducing your overall program costs. Since the revenue is transaction-related, you can retrieve a detailed breakdown of these earnings by calling the `GET /files` endpoint and selecting either the `dailyTransactionFee` or `monthlyTransactionFee` file types.

## **Revenue Components**

1. **FX Revenue** – Markups applied to **foreign exchange transactions** conducted by cardholders.
2. **ATM Withdrawal Fees** – Mark up applied to ATM withdrwal transaction.

Read the [card program fee mark-up guide](https://reap.readme.io/docs/issuer-fee-mark-up-dashboard#/)  to know how to set up the fee via your dashboard

***

# Invoice Structure

The final **monthly invoice** will be calculated as:

(Monthly Transaction Fee + Monthly Non-transaction Fee) - (FX revenue + ATM revenue)= Total monthly Fee

***

# Retrieving Billing Details

To **validate and reconcile** the fees charged by Reap, you can retrieve **detailed breakdown files** via a **webhook event** after calling the `GET /files` endpoint. These files provide **line-item details** of all costs incurred within the billing period.

Helps you identify and reconcile fixed costs associated with your card program, ensuring accuracy in monthly invoicing.

## **Available Financial Report**

The table below outlines the different billing files you can retrieve by calling the `GET /files` endpoint that helps you reconcile your monthly invoice:

| **File Type**                       | **Description**                                                                                               | **How It Helps in Monthly Reconciliation**                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Fee`                               | Provides details of the FX and ATM mark-up fees imposed on your cardholders as revenue for your card program. | Helps you track the **total revenue** generated from the mark-up FX and ATM fees imposed on cardholders.                                                                                             |
| `monthly_non_transaction_fees_file` | Provides a line-item breakdown of **non-transactional costs.**                                                | Helps you **identify and reconcile costs** associated with your card program that are **not transaction-related**, broken down per line item.                                                        |
| `monthly_transaction_fees_file`     | Lists all fees or revenue incurred from card transactions in a given month.                                   | Helps you verify the **total cost or revenue** incurred by card transactions, allowing you to reconcile fees charged at an individual transaction level in a given month, broken down per line item. |
| `daily_transaction_fees_file`       | Lists all fees or revenue incurred from card transactions in a given day.                                     | Helps you verify the **total cost or revenue** incurred by card transactions, allowing you to reconcile fees charged at an individual transaction level in a given day, broken down per line item.   |

To understand the files in detail, including the full list of columns, file definitions, and real-life examples, please continue reading the next guide.

***

**Related Materials**:

📖 Guide/ [Retrieve Monthly Invoice Billing Details ](https://reap.readme.io/docs/reporting)

📖 Guide/ [Tracking & Reconciling Card Transactions to Master Account Balance](https://reap.readme.io/docs/tracking-reconciling-card-transactions-to-master-acount-balance-1)

⚙️ API Reference/ [Get Financial Report ](https://reap.readme.io/reference/get_files-filetype#/)

⚙️ API Reference/ [Webhook/ Files](https://reap.readme.io/reference/webhook-eventtype-files#/)