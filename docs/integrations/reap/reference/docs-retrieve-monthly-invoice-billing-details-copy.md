---
updatedAt: 2025-09-08T10:10:38.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Retrieve Monthly Invoice Billing Details

Learn how to read your settlement file for your reconciliation needs.

To **validate and reconcile** the fees charged by Reap, you can retrieve **detailed breakdown files** via a **webhook event** after calling the **GET /files** endpoint. These files provide **line-item details** of all costs incurred within the billing period.

Helps you identify and reconcile fixed costs associated with your card program, ensuring accuracy in monthly invoicing.

# Avaliable Financial Report

The table below outlines the different billing files you can retrieve by calling the `GET /files` end point that help you reconcile your monthly invoice:

| File Type                           | Description                                                                                                   | How It Helps in Monthly Reconciliation                                                                                                                                          |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Fee`                               | Provides details of the FX and ATM mark-up fees imposed on your cardholders as revenue for your card program. | Helps you track the total revenue generated from the mark-up FX and ATM fees imposed on cardholders.                                                                            |
| `monthly_non_transaction_fees_file` | Provides a line-item breakdown of non-transactional costs.                                                    | Helps you identify and reconcile costs associated with your card program that are not transaction-related, broken down per line item.                                           |
| `monthly_transaction_fees_file`     | Lists all fees or revenue incurred from card transactions in a given month.                                   | Helps you verify the total cost or revenue incurred by card transactions, allowing you to reconcile fees charged at an individual transaction level, broken down per line item. |
| `daily_transaction_fees_file`       | Lists all fees or revenue incurred from card transactions in a given day.                                     | Helps you verify the total cost or revenue incurred by card transactions, allowing you to reconcile fees charged at an individual transaction level, broken down per line item. |

***

## How to Retrieve the File

Follow these steps to retrieve the **MonthlyTransactionFee** or **MonthlyNonTransactionFee** report:

1. **Identify the file type**: Determine whether you need `daily_transaction_fees_file`, `monthly_transaction_fees_file` ,`monthly_non_transaction_fees_file`or `fee`
2. **Specify the date range**: Choose the billing period for which you want the report.
3. **Call the`GET /files` endpoint**: Include the `fileType` in the path parameter.
4. **Provide the date parameter**: Indicate the target `date` in the query parameter.
   * For **Daily Reports**: Request on or after **T+1** (2 days after the date you are querying). Specify the exact date (YYYY-MM-DD)
   * For **Monthly Reports**: Request on or after the **2nd day of the following month,** Specify any date within the month (YYYY-MM-DD)\
     *Submit the request to the endpoint. The report will include all data up to**11:59 PM UTC** on the selected date.*
5. **Receive the webhook notification**: The system will send the file download URL via webhook.

***

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
        Request for `2024-01-01` on 2024-01-02
      </td>

      <td>
        **Error**: `The selected date is invalid.`
      </td>
    </tr>

    <tr>
      <td>
        Getting a monthly report too early
      </td>

      <td>
        **Monthly Report** `monthlyTransactionFee`| `monthlyNonTransactionFees` | `Fees`
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

***

# Monthly Transaction Fees and Daily Transaction Fees Report

The **Monthly Transaction Fee Report** and the **Daily Transaction Fees** Report provides a detailed breakdown of all major costs incurred through transactions.

## How to Use It

1. Select `fileType = "MonthlyTransactionFees"`or `"dailyTransactionFees"`
2. Provide the `date` parameter to indicate the desired billing period.

<HTMLBlock>{`
<table>
  <tr>
    <th>Report Field Name</th>
    <th>Description</th>
    <th>Values</th>
    <th>Value Definition</th>
  </tr>
  <tr>
    <td>Business ID</td>
    <td>A unique identifier for the business</td>
    <td>UUIDs</td>
    <td>Universally Unique Identifiers.</td>
  </tr>
  <tr>
    <td>Timestamp</td>
    <td>The date and time when the line item occurred.</td>
    <td>Date + Time + Timezone</td>
    <td>Timezone: Coordinate Universal Time.</td>
  </tr>
  <tr>
    <td>Transaction ID</td>
    <td>A unique identifier for each transaction.</td>
    <td>UUIDs</td>
    <td>Universally Unique Identifiers.</td>
  </tr>
  <tr>
    <td>Card ID</td>
    <td>A unique identifier for the transacting card.</td>
    <td>UUIDs</td>
    <td>Universally Unique Identifiers.</td>
  </tr>
  <tr>
    <td rowspan="4" style="vertical-align:top">Event</td>
    <td rowspan="4" style="vertical-align:top">The type of transaction event.</td>
    <td>AUTHORIZATION</td>
    <td>Authorization is the process where the merchant requests approval from Reap to proceed with the transaction. Once approved, a hold is placed on the cardholder’s available credit for the transaction amount.</td>
  </tr>
  <tr>
    <td>SETTLEMENT</td>
    <td>The final step in a transaction where funds are transferred from Reap to the merchant's account, officially completing the payment process.</td>
  </tr>
  <tr>
    <td>OTHERS</td>
    <td>Non-transactional related events such as <code>ATM_BALANCE_INQUIRY</code>,<code> ATM_PIN_CHANGE</code>, <code>TOKEN_PROVISIONING</code></td>
  </tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td rowspan="12" style="vertical-align:top">Channel</td>
    <td rowspan="12" style="vertical-align:top">The medium through which the transaction was conducted. A transaction can have multiple channels that are applicable (e.g., Google Pay txn that goes through 3DS), the priority/hierarchy of what Channel will be labeled as is shown to the right.</td>
    <td>TOKEN_PROVISIONING</td>
    <td>The process of creating a digital token, such as for mobile payment services like Google Pay.</td>
  </tr>
  <tr>
    <td>TOKEN_TXN_GOOGLE_PAY</td>
    <td>A transaction made under Google Pay.</td>
  </tr>
  <tr>
    <td>TOKEN_TXN</td>
    <td>A transaction made with a tokenized card, i.e., Card on file transaction, or other wallet.</td>
  </tr>
  <tr>
    <td>3DS_FRICTIONLESS</td>
    <td>A transaction processed through 3D Secure without additional authentication steps, typically for low-risk transactions.</td>
  </tr>
  <tr>
    <td>3DS_SMS</td>
    <td>A transaction processed through 3D Secure via SMS OTP.</td>
  </tr>
  <tr>
    <td>3DS_FORWARDING</td>
    <td>A transaction processed through 3D Secure via 3DS Forwarding.</td>
  </tr>
  <tr>
    <td>ATM_BALANCE_INQUIRY</td>
    <td>Transaction where the cardholder checks their account balance at an ATM.</td>
  </tr>
  <tr>
    <td>ATM_PIN_CHANGE</td>
    <td>Transaction where the cardholder changes their PIN at an ATM.</td>
  </tr>
  <tr>
    <td>ATM_WITHDRAWAL</td>
    <td>Cash withdrawal transactions performed at an ATM.</td>
  </tr>
  <tr>
    <td>TRANSACTION</td>
    <td>Standard payment transactions made by cardholders.</td>
  </tr>
<tr>
  <td>ADJUSTMENT</td>
  <td>Reflects the latest delta changes in the fees associated with a previous transaction. <a href="https://reap.readme.io/docs/reporting#fee-adjustment">Read more here</a>.</td>
</tr>
  <tr>
    <td></td>
    <td></td>
  </tr>
  <tr>
    <td>Customer Amount</td>
    <td>The monetary value of the transaction after adding system-applied rates (FX/ATM markups and base rates).</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td>Bill amount</td>
    <td>The monetary value of the transaction without any system-applied rates (FX & ATM markups and any base rate) — what the user sees on their statement.</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td rowspan="2" style="vertical-align:top">Is FX</td>
    <td rowspan="2" style="vertical-align:top">A flag indicating whether the transaction involves foreign exchange.</td>
    <td>TRUE</td>
    <td>The transaction involves foreign exchange (FX)</td>
  </tr>
  <tr>
    <td>FALSE</td>
    <td>The transaction does NOT involve foreign exchange (FX)</td>
  </tr>
  <tr>
    <td rowspan="2" style="vertical-align:top">Charge Model</td>
    <td rowspan="2" style="vertical-align:top">A label identifying whether the transaction is cross-border.</td>
    <td>CROSS_BORDER</td>
    <td>Indicates that the transaction occurred with a merchant located outside of Hong Kong, typically involving currency exchange or international processing</td>
  </tr>
  <tr>
    <td>DOMESTIC</td>
    <td>Refers to transactions that occurred with a merchant located within Hong Kong, with no cross-border activity involved.</td>
  </tr>
  <tr>
    <td>Gross Interchange</td>
    <td>Gross interchange is the fee charged to merchants for card transactions before any deductions.</td>
    <td>Floating-point numbers</td>
    <td>Domestic: Amount * Interchange Rate (normally 1.85%)<br>Cross border: Amount * 2% (normally 2.00%)</td>
  </tr>
  <tr>
    <td>Net Interchange</td>
    <td>Net interchange is the total monthly aggregated gross interchange revenue minus all applicable Variable Visa/Thredd Settlement Fees</td>
    <td>Floating-point numbers</td>
    <td>Gross interchange fee - Variable Visa/Thredd Settlement Fee</td>
  </tr>
  <tr>
    <td>FX Revenue</td>
    <td>Income generated from currency conversion fees when a transaction involves foreign exchange.</td>
    <td>Floating-point numbers</td>
    <td>FX % set by card program owner</td>
  </tr>
  <tr>
    <td>ATM Revenue</td>
    <td>Revenue generated from ATM transactions such as withdrawal, pin change, balance enquiry, etc.</td>
    <td>Floating-point numbers</td>
    <td>ATM % set by card program owner</td>
  </tr>
  <tr>
    <td>Variable Visa/Thredd Settlement Fee</td>
    <td>Sum of the fees assessed by Visa and/or Thredd to facilitate the settlement of card-based transactions. These fees are variable, meaning they can change based on certain factors.</td>
    <td>Floating-point numbers</td>
    <td>Sum of Variable Settlement Fees - Visa ISA Fee, Variable Settlement Fees - Visa Service Fee and Variable Settlement Fees - Visa License Fee.</td>
  </tr>
  <tr>
    <td>Fixed Visa/Thredd Settlement Fee</td>
    <td>The set costs associated with settling card transactions. These fees are part of the program fees that combine fixed authorization and settlement costs from both Visa and Thredd.</td>
    <td>Floating-point numbers</td>
    <td>Sum of Fixed Visa Settlement Fees and Fixed Processor Settlement Fees</td>
  </tr>
  <tr>
    <td>Visa/Thredd Authorization Fee</td>
    <td>Refers to specific charges assessed by Visa and/or Thredd for processing the authorization of card-based transactions</td>
    <td>Floating-point numbers</td>
    <td>Sum of Visa Authorization Fees and Processor Authorization Fees</td>
  </tr>
  <tr>
    <td>ATM Withdrawal</td>
    <td>The cost incurred for processing ATM transactions.</td>
    <td>Floating-point numbers</td>
    <td>Fix fee of ATM withdrawals</td>
  </tr>
  <tr>
    <td>ATM PIN Change</td>
    <td>A fee related to non-financial actions performed at ATMs.</td>
    <td>Floating-point numbers</td>
    <td>Sum of Visa ATM Pin Change fee</td>
  </tr>
  <tr>
    <td>ATM Balance Enquiry</td>
    <td>A fee related to non-financial actions performed at ATMs.</td>
    <td>Floating-point numbers</td>
    <td>Sum Visa ATM Balance Enquiry fee and Thredd Balance Enquiry fee</td>
  </tr>
  <tr>
    <td>3DS SMS Fee</td>
    <td>The cost associated with 3D Secure authentication request via SMS.</td>
    <td>Floating-point numbers</td>
    <td>Sum of Frictionless 3DS Transaction fee, Unit cost of sending a SMS and the uni cost of forwarding the SMS authentication code</td>
  </tr>
  <tr>
    <td>3DS Frictionless Fee</td>
    <td>The cost associated with 3D Secure authentication request that does not require further authentication by the user.</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td>3DS Forwarding Fee</td>
    <td>The cost associated with 3D Secure authentication request via Forwarding.</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td>VTS - Token Provisioning</td>
    <td>The cost related to Visa Token Service (VTS) provisioning</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td>VTS - Usage</td>
    <td>The cost related to Visa Token Service (VTS) authorization</td>
    <td>Floating-point numbers</td>
    <td>N/A</td>
  </tr>
 
  <tr>
    <td>FX Markup</td>
    <td>The amount of FX markup this transaction incurred, in absolute numbers. </td>
    <td>Floating-point numbers</td>
    <td>Bill Amount* FX markup rate (%)</td>
  </tr>
  <tr>
    <td>FX Base</td>
    <td>The amount of FX cost that Reap charges for this transaction, in absolute numbers.</td>
    <td>Floating-point numbers</td>
    <td>Bill Amount* FX base rate (%)</td>
  </tr>
  <tr>
    <td>FX Total</td>
    <td>The total amount of FX cost this transaction incurred, in absolute numbers.</td>
    <td>Floating-point numbers</td>
    <td>Bill Amount* (FX markup (%) + FX base rate(%))</td>
  </tr>
  <tr>
    <td>ATM Markup</td>
    <td>The ATM markup amount this ATM transaction incurred, in absolute numbers. </td>
    <td>Floating-point numbers</td>
    <td>Bill Amount* ATM markup(%)</td>
  </tr>
  <tr>
    <td>Total ATM</td>
    <td>The total amount of ATM cost this ATM transaction incurred, in absolute numbers.</td>
    <td>Floating-point numbers</td>
    <td>Bill Amount* ATM markup(%)</td>
  </tr>
  <tr>
    <td>MCC Padding</td>
    <td>The additional amount that is temporarily blocked when authorizing transactions for specified MCCs</td>
    <td>Floating-point numbers</td>
    <td>MCC padding % or flat amount set by the client</td>
  </tr>
  <tr>
    <td rowspan="2" style="vertical-align:top">Is Card Present</td>
    <td rowspan="2" style="vertical-align:top">Indicates whether the card was present at the point of sale when the transaction occurred. The <code>card_present_indicator</code> field from the Authorization and Transaction webhooks contains this information. You can also retrieve it from any of the GET Transaction endpoints. To learn more about the <code>card_presence_indicator</code> field, click 
    <a href="https://reap.readme.io/docs/understanding-transactions-through-pos-data#field-definitions-and-possible-values-of-pos_transaction_data" target="_blank">here</a>.</td>
    <td>TRUE</td>
    <td>Card Present: The card was present at the point of sale when the transaction occurred.</td>
  </tr>
  <tr>
    <td>FALSE</td>
    <td>Card Not Present: The card was not present at the point of sale when the transaction occurred.</td>
  </tr>
  <tr>
    <td>Fraud Monitoring Fee</td>
    <td>The total cost of the VISA VRM and thredd TM transaction monitoring tools incurred for this transaction.</td>
    <td>Floating-point number</td>
    <td>N/A</td>
  </tr>
  <tr>
    <td>Variable Settlement Fees - Visa ISA Fee</td>
    <td>The Fees assessed by Visa to facilitate the settlement of card-based transactions. </td>
    <td>Floating-point numbers</td>
    <td>Included in the Variable Visa/Thredd Settlement Fee calculation.</td>
  </tr>
  <tr>
    <td>Variable Settlement Fees - Visa Service Fee</td>
    <td>The variable service fee charged by Visa for transaction processing and network services.</td>
    <td>Floating-point numbers</td>
    <td>Included in the Variable Visa/Thredd Settlement Fee calculation.</td>
  </tr>
  <tr>
    <td>Variable Settlement Fees - Visa License Fee</td>
    <td>The licensing fee Visa charges as part of their network usage and support.</td>
    <td>Floating-point numbers</td>
    <td>Included in the Variable Visa/Thredd Settlement Fee calculation.</td>
  </tr>
  <tr>
    <td>Fixed Visa Settlement Fees</td>
    <td>The fixed settlement cost charged by Visa for card-based transactions.</td>
    <td>Floating-point numbers</td>
    <td>Derived from Fixed Visa/Thredd Settlement Fee.</td>
  </tr>
  <tr>
    <td>Fixed Processor Settlement Fees</td>
    <td>The fixed settlement cost charged by the processor (e.g., Thredd).</td>
    <td>Floating-point numbers</td>
    <td>Derived from Fixed Visa/Thredd Settlement Fee</td>
  </tr>
  <tr>
    <td>Visa Authorization Fees</td>
    <td>The fee charged by Visa for processing the authorization of the transaction.</td>
    <td>Floating-point numbers</td>
    <td>Derived from Visa/Thredd Authorization Fee</td>
  </tr>
  <tr>
    <td>Processor Authorization Fees</td>
    <td>The fee charged by the processor (e.g., Thredd) for authorizing the transaction.</td>
    <td>Floating-point numbers</td>
    <td>Derived from Visa/Thredd Authorization Fee</td>
  </tr>
<tr>
  <td>Transaction Date</td>
  <td>The date and time when the transaction occurred.</td>
  <td>Date + Time + Timezone</td>
  <td>Timezone: Coordinate Universal Time.</td>
</tr>
</table>
`}</HTMLBlock>

### Fee Adjustment

<Callout icon="📚" theme="default">
  ### What is an `ADJUSTMENT` event?

  The `ADJUSTMENT` event type reflects fee corrections made after an original transaction has been posted. These adjustments are applied in a forward-dated manner — they do not overwrite past data, but instead introduce a new row in the report to show the delta (difference) from the original fee.

  :pushpin: Example

  Suppose an original transaction included an FX Markup Fee of **$5.00**. After further reconciliation, it is determined that the correct fee should have been **$4.00**. An `ADJUSTMENT` row will be added to the report with the following:

  * Timestamp: The time when the adjustment was issued
  * Transaction ID: Same as the original transaction
  * Card ID: Same as the original transaction
  * FX Markup Fee: -1.00 (reflecting the $1 deduction)
  * Channel: ADJUSTMENT
  * Transaction Date: The date and time of the original transaction

  Clients can retrieve these adjusted rows by fetching daily or monthly transaction fee reports via the `GET /files/` endpoint. This change ensures better visibility, preserves referential integrity across records, and reduces manual reconciliation effort.
</Callout>

***

# Monthly Non-Transaction Report

The **Monthly Non-Transaction Fees** file details all operational costs unrelated to individual transactions. Each row represents one event occurrence. The system uses the total count of each event type to calculate non-transaction costs for the monthly invoice. The final cost is calculated as:

**The count of event occurrences × unit cost (or minimum order, if applicable)**

To retrieve this file, specify `fileType = "MonthlyNonTransactionFees"` in the path parameter when calling the **GET /files** endpoint.

## How to Use It

1. Select `fileType = "MonthlyNonTransactionFees"`.
2. Provide the `date` parameter to specify the billing period.

Once the request is processed, the system will generate the file and send it via webhook to the provided URL.:

<HTMLBlock>{`
<table>
  <tr>
    <th>Report Field Name</th>
    <th>Description</th>
    <th>Values</th>
    <th>Value Definition</th> 
  </tr>
  <tr>
    <td>Timestamp</td>
    <td>The timestamp of this transaction.</td>
    <td>String (e.g., <code>2023-07-26T09:13:01.748Z</code>)</td>
    <td>The exact date and time when the transaction event was recorded.</td>
  </tr>
  <tr>
    <td>Card ID</td>
    <td>Unique identifier of the card associated with the record.</td>
    <td>UUIDs</td>
    <td>Universally Unique Identifier assigned to the card.</td>
  </tr>
  <tr>
    <td rowspan="4" style="vertical-align:top">Event</td>
    <td rowspan="4" style="vertical-align:top">The type of non-transactional event associated with this record.</td>
    <td><code>CARD_CREATION_FEE</code></td>
    <td>Fee charged for issuing a new card.</td>
  </tr>
  <tr>
    <td><code>GOOGLE_PAY_CARD_MAINTENANCE_FEE</code></td>
    <td>Monthly maintenance fee for a Google Pay-linked card.</td>
  </tr>
  <tr>
    <td><code>ACTIVE_CARD_MAINTENANCE_FEE</code></td>
    <td>Monthly fee for maintaining an active card.</td>
  </tr>
  <tr>
    <td rowspan="3" style="vertical-align:top">Channel</td>
    <td rowspan="3" style="vertical-align:top">The type of card relevant to this record. This field is only valid when the event type is <code>CARD_CREATION_FEE</code>.</td>
    <td><code>PLASTIC</code></td>
    <td>Physical plastic card issued to the cardholder.</td>
  </tr>
  <tr>
    <td><code>METAL</code></td>
    <td>Premium metal card issued to the cardholder.</td>
  </tr>
  <tr>
    <td><code>VIRTUAL</code></td>
    <td>Digital card issued without a physical counterpart.</td>
  </tr>
</table>
`}</HTMLBlock>

***

# Fee Report

The **Fee Report** provides a detailed breakdown of all revenue **generated** from your markup fees charged to cardholders during various transaction events.

### How to Use It

1. Select `fileType = "Fee"`.
2. Provide the `date` parameter to indicate the desired billing period.

| Field          | Description                                                                | Values                                                           |
| :------------- | :------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| Fee ID         | A unique identifier for the transaction that incurred a ATM or FX revenue. | String                                                           |
| Transaction ID | A unique identifier for each transaction.                                  | UUID                                                             |
| Amount         | The amount of the fee generated in card currency.                          | Number                                                           |
| Rate           | The rate of the fee, expressed in percentage.                              | Number                                                           |
| Type           | The type of fee that this record belongs to                                | `FX_FEE` \| `ATM_FEE`                                            |
| Card ID        | Unique identifier of the card associated with the record                   | UUID                                                             |
| Date           | The timestamp of this transaction.                                         | String (Date + Time + Timezone)Sat Feb 01 2025 23:59:59 GMT+0000 |

> 🚧 Future Deprecation
>
> The `fee` table will be deprecated soon. We recommend using the `daily_transaction_fee_file` and `monthly_transaction_fee_file` to check all transaction-related revenue for your card progrram.

***

# The Importance of Financial Reports in Managing Your Card Program

1. **Reconcile billing costs**: Understand all cost and revenue incurred by your card program and match them against Reap's billing records.
2. **Track expenses**: Maintain detailed records of monthly fees associated with operating your card program.

***

**Related Materials**:

📖 Guide/ [Understanding Monthly Invoice ](https://reap.readme.io/docs/understanding-monthly-invoice)

📖 Guide/ [Tracking & Reconciling Card Transactions to Master Account Balance](https://reap.readme.io/docs/tracking-reconciling-card-transactions-to-master-acount-balance-1)

⚙️ API Reference/ [Get Financial Report ](https://reap.readme.io/reference/get_files-filetype#/)

⚙️ API Reference/ [Webhook/ Files](https://reap.readme.io/reference/webhook-eventtype-files#/)