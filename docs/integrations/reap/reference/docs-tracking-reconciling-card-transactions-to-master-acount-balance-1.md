---
updatedAt: 2025-04-23T05:25:16.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Tracking & Reconciling Card Transactions to Master Account Balance

Learn how to retrieve settlement reports via API to reconcile card transactions and track their impact on the master account balance.

As a financial controller of a card program, maintaining visibility over the master account balance is crucial for accurate reconciliation, bookkeeping, and financial forecasting. Settlement reports provide a detailed breakdown of all card transactions and how they impact the master account balance on a daily or monthly basis.

By retrieving these reports via API, you can:

* **Monitor cash flow movements** to ensure all transactions align with expected balances.
* **Improve forecasting** by estimating the necessary collateral to be sent to Reap.
* **Facilitate bookkeeping** by reconciling cleared transactions against internal financial records.

This guide explains how to retrieve settlement reports, interpret transaction data, and filter key details to efficiently reconcile daily or monthly card transactions.

***

# **Retrieving Settlement Reports via API**

## **Step 1: Call the API Endpoint**

Make a request to the `GET /files` endpoint and specify the type of **settlement report** you need:

* **Daily reports**: Capture transactions for a single day.
* **Monthly reports**: Aggregate data for all transactions within a month.

## **Step 2: Specify the Timeframe**

Use the `date` query parameter to define the timeframe:

* **For monthly settlement reports**, set `date` to any date within the desired month.
* **For daily settlement reports**, set `date` to a specific date.

→ Learn more about setting the timeframe in the [API reference](https://reap.readme.io/reference/get_files-filetype#/).

## **Step 3: Receive the Settlement File**

* Upon request, a **webhook** with ( `eventName=files` **)** will be triggered with a valid **URL** to download the CSV file.

## **Step 4: Download and Open the CSV File**

* The settlement report will contain transaction details, including status, amount, currency, and balance movements.

## **Step 5: Filter Transactions for Reconciliation**

1. **Filter by`status`**: Look for transactions with values `PENDING` or `CLEARED`as these transactions affect the **master account balance**.
2. **Identify transactions impacting the balance**: Focus on rows where both `In` and `Out` values are nonzero.
3. **Review the balance impact**: Monitor how authorizations, settlements, refunds, and other events affect the master account balance.

***

# Settlement file fields and definitions

The settlement reports (`daily` , `monthly`) provides the following key data points:

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        **Report Field Name**
      </th>

      <th>
        **Description**
      </th>

      <th>
        **Values**
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        **Transaction Date**
      </td>

      <td>
        The date and time when the transaction event occurred.
      </td>

      <td>
        Date + Time + Timezone
        Example: **2025-02-12T00:00:00.240Z**
      </td>
    </tr>

    <tr>
      <td>
        Transaction ID
      </td>

      <td>
        The [`lifecycle_event_id`](https://reap.readme.io/reference/get_transactions-transactionid#/)
        **Remarks**: this field refers to `data.id` in a [`transaction` webhook](https://reap.readme.io/reference/webhook-eventtype-transaction#/)
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        Original Transaction ID
      </td>

      <td>
        A unique id of this transaction event.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        Reference No
      </td>

      <td>
        Reap’s internal reference number of this record.
      </td>

      <td>
        String

        **Remarks**: If the number starts with `tid`, this is a card transaction event. If the number does not start with `tid`, this is either a fund-in or fund-out transaction to the master account balance.
      </td>
    </tr>

    <tr>
      <td>
        Card (Last4)
      </td>

      <td>
        The last 4 digits of the card that is associated with this transaction.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        Cardholder
      </td>

      <td>
        The cardholder’s name.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        Status
      </td>

      <td>
        The status of the transaction event.
      </td>

      <td>
        `CLEARED`| `VOID`| `DECLINED` | `PENDING`
      </td>
    </tr>

    <tr>
      <td>
        Merchant Name
      </td>

      <td>
        The name of the merchant involved in this transaction.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        Merchant ID
      </td>

      <td>
        The registered unique identifier of the merchant
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        foreign\_physical\_transaction
      </td>

      <td>
        Indicates whether this transaction is a cross-border transaction conducted at a physical POS.
      </td>

      <td>
        `Y`/ `N`\
        If this is a foreign physical transaction, `Y`, If this is not a foreign physical transaction, `N`
      </td>
    </tr>

    <tr>
      <td>
        authorization\_currency
      </td>

      <td>
        The currency code follows the [ISO 4217](https://www.iban.com/currency-codes) standard.
      </td>

      <td>
        3-digit currency code.
      </td>
    </tr>

    <tr>
      <td>
        authorization\_currency\_name
      </td>

      <td>
        The name of the `authorization_currency` in [ISO 4217](https://www.iban.com/currency-codes) standard.
      </td>

      <td>
        3-character country code.
      </td>
    </tr>

    <tr>
      <td>
        authorization\_amount
      </td>

      <td>
        The amount authorized for this transaction.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        authorization\_conversion\_rate
      </td>

      <td>
        The conversion rate of this transaction event.
      </td>

      <td>
        Number\
        **Remarks**:This is a calculated field: `settlement_amount` / `authorization_amount`.
      </td>
    </tr>

    <tr>
      <td>
        settlement\_currency
      </td>

      <td>
        The currency of the card, following [ISO 4217](https://www.iban.com/currency-codes) standard.
      </td>

      <td>
        3-digit code
      </td>
    </tr>

    <tr>
      <td>
        settlement\_currency\_name
      </td>

      <td>
        The name of the card currency.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        settlement\_amount
      </td>

      <td>
        The final amount billed in the card currency.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        reap\_fx\_fee
      </td>

      <td>
        The FX fee incurred in this transaction, charged by Reap.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        reap\_atm\_fee
      </td>

      <td>
        The ATM fee incurred in this transaction, charged by Reap.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        caas\_fx\_fee
      </td>

      <td>
        The FX fee incurred in this transaction, charged by you.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        caas\_atm\_fee
      </td>

      <td>
        The ATM fee incurred in this transaction, charged by you.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        transaction\_type
      </td>

      <td>
        The code resending the transaction\_type\_name.
      </td>

      <td>
        100= `AUTHORIZATION`\
        120= `AUTHORIZATION_ADVICE`
        400= `AUTHORIZATION_REVERSAL`
        1200= `CAPTURE_SETTLEMENT`
        1400= `REFUND_SETTLEMENT`
        1500 = `VISA_DIRECT`
      </td>
    </tr>

    <tr>
      <td>
        transaction\_type\_name
      </td>

      <td>
        The type of transaction event involved in this transaction.
      </td>

      <td>
        `AUTHORIZATION`| `AUTHORIZATION_ADVICE` | `AUTHORIZATION_REVERSAL` | `CAPTURE_SETTLEMENT`| `REFUND_SETTLEMENT`| `VISA_DIRECT`

        **Remarks**: If this field is empty, it means that this is not a card transaction event but a fund-in or fund-out transaction affecting the master account balance.
      </td>
    </tr>

    <tr>
      <td>
        Description
      </td>

      <td>
        Additional details regarding the transaction. This field also indicates funding when funds are added to the available balance.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        In
      </td>

      <td>
        The transaction amount credited to your balance. This includes refunds and increases to your master account balance.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        Out
      </td>

      <td>
        The transaction amount debited from your master account balance.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        Balance
      </td>

      <td>
        The balance after a transaction or funding event. Note that an authorization will temporarily reduce your available balance by the authorization amount.
      </td>

      <td>
        Number
      </td>
    </tr>

    <tr>
      <td>
        Card ID
      </td>

      <td>
        A unique identifier for the transacting card.
      </td>

      <td>
        UUIDs
      </td>
    </tr>

    <tr>
      <td>
        MCC Padding
      </td>

      <td>
        The additional sum of money that is temporarily blocked when authorizing transactions for specified MCCs.
      </td>

      <td>
        Number
      </td>
    </tr>
  </tbody>
</Table>

***

# **How to Use Settlement Reports for Financial Reconciliation**

## **Tracking Authorization Holds vs. Captures**

* **Authorization**: A portion of the master account balance is temporarily **held** when a transaction is authorized.
* **Clearing:** When a merchant finalizes the transaction, the **actual amount** is deducted from the master account.
* **Reversal**: If the transaction is not settled, the **hold is released** back into the master account.

## **Identifying Net Balance Movements**

* `In` represents funds added to the master account (e.g., refunds or master account balance fund-in).
* `Out` represents deductions from the master account (e.g., purchases with card).
* Use timestamps to confirm when funds were actually debited/credited.

## **Understanding Daily vs. Monthly Reports**

* **Daily reports**: Best for **real-time reconciliation** and **monitoring pending transactions**.
* **Monthly reports**: Ideal for **financial audits, historical analysis, and forecasting collateral needs**.

***

# **Common Use Cases**

## **For Financial Controllers**

* **Monitor pending transactions** to enusre the level of funding in the master account balance is within a healthy level.
* **Ensure accurate bookkeeping** by verifying all cleared transactions.

## **For Developers**

* **Automate transaction checks** by integrating the API into internal reconciliation tools.
* **Build real-time balance dashboards** using retrieved transaction data.

***

**Related Materials**:

📖 Guide/ [Understanding Monthly Invoice ](https://reap.readme.io/docs/understanding-monthly-invoice)

📖 Guide/ [Retrieve Monthly Invoice Billing Details ](https://reap.readme.io/docs/reporting)

⚙️ API Reference/ [Get Financial Report ](https://reap.readme.io/reference/get_files-filetype#/)

⚙️ API Reference/ [Webhook/ Files](https://reap.readme.io/reference/webhook-eventtype-files#/)