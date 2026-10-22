---
updatedAt: 2025-05-13T09:02:43.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Refund 

In this page, we will explore two real-life examples of <Glossary>Refund</Glossary>. These scenarios demonstrate how refund occurs as a transaction event, and how it affects transaction status, immediate available balance, and the transaction webhook events that you will receive on a step-by-step basis.:

<Cards columns={2}>
  <Card title="Related Refund" href="https://reap.readme.io/docs/transaction-scenarios-refund#related-refund">
    A <strong>related refund</strong> is a refund transaction that is directly linked to a previous transaction with the same <code>transactionId</code>.
  </Card>

  <Card title="Unrelated Refund" href="https://reap.readme.io/docs/transaction-scenarios-refund#unrelated-refund">
    An <strong>unrelated refund</strong> is a standalone refund transaction that is not directly tied to any previous purchase or transaction.
  </Card>
</Cards>

***

## **Related Refund**

💡 **Scenario 1: The cardholder buys a pair of shoes for $100 and returns the shoes after the merchant clears the transaction.**

<Accordion title="Authorization Stage">
  <div>
    <img src="https://files.readme.io/29112755944990371449d5e3d6912f2e347b3bfdf3e5cb75456f4dce7f2d9eeb-Refund_authorization.png" alt="Reversal Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Transaction is initiated:</strong> When the cardholder taps, swipes, or enters their card details at the terminal, an <strong>authorization request</strong> for $100 is initiated and sent to Visa by the merchant’s payment terminal.
      </li>

      <li>
        <strong>Visa forwards the signal:</strong> Visa forwards the <strong>authorization signal</strong> to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor then forwards the authorization request to <strong>Reap.</strong>
      </li>

      <li>
        <strong>Reap sends you the authorization request webhook:</strong> Reap sends you an <strong>authorization request webhook</strong> with the transaction details for evaluation.

        <p>
          This example is for card programs that opt-in for <strong>real-time authorization</strong>. If your program uses standard authorization instead, steps 4 and 5 will be as follows. The rest of the stages remain the same:
        </p>

        <ul>
          <li>
            <strong>Reap evaluates the cardholder's available balance:</strong> Reap checks the available balance and other pre-defined configurations (e.g., MCC padding, spending controls) to decide whether to authorize or decline the transaction.
          </li>

          <li>
            <strong>Standard authorization process:</strong> Reap performs the evaluation internally and sends the transaction decision directly to the card processor.
          </li>
        </ul>
      </li>

      <li>
        <strong>You share the transaction decision with Reap:</strong> After assessing the cardholder's balance and applying your internal business rules (e.g., fraud checks or spending limits), you approve or decline the authorization by responding to the webhook.
      </li>

      <li>
        <strong>Reap forwards the response to the card processor:</strong> Reap receives your response and forwards the <strong>authorization result</strong> (approved or declined) to the card processor.
      </li>

      <li>
        <strong>Card processor sends the result to Visa:</strong> The card processor sends the authorization approval to Visa.
      </li>

      <li>
        <strong>Release of goods:</strong> Visa notifies the merchant of the authorization approval, enabling the cardholder to complete their purchase of the shoes.
      </li>

      <li>
        🔔 <strong>Webhook Triggered:</strong> Reap sends a <strong>transaction webhook</strong> with <code>eventName: authorization</code> and <code>status: PENDING</code>.
      </li>

      <li>
        <strong>Temporary block on available balance:</strong> Reap places a <strong>hold of $100</strong> on the <code>availableCredit</code> of the card and also on your card program's master account's <code>availableBalance</code>. The balance will be reduced by $100 if you retrieve the relevant endpoints. However, this is a temporary hold, and no settlement has occurred yet.
      </li>
    </ol>
  </div>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/552c4646412ebb3ab2d71400f46fc874f08cb07212e2f17e5c44dbce273652c5-Refund_clearing_stage.png" alt="Reversal Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Clearing is initiated:</strong> After a week, the merchant initiates the <strong>clearing process</strong> for the transaction.
      </li>

      <li>
        <strong>Clearing signal sent to Visa:</strong> The clearing request is sent from the merchant to Visa.
      </li>

      <li>
        <strong>Visa forwards the clearing signal:</strong> Visa forwards the clearing instruction to the card processor.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor passes the clearing request to <strong>Reap</strong>.
      </li>

      <li>
        <strong>Authorization webhook is triggered:</strong> Reap sends you a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code> and the status updated to <code>CLEARED</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> Reap <strong>deducts $100</strong> from your master account balance, making a deduction of $100 from your available balance. This represents the final settlement of the transaction, where the merchant receives the funds, and the transaction is officially completed.
      </li>
    </ol>
  </div>
</Accordion>

<Accordion title="Refund Stage">
  <img src="https://files.readme.io/25e716368b588c4267051941af23ebc32f5c2f6bfcc77ab0226ea81d3260a12a-Refund_Refund_stage.png" alt="Reversal Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

  <p>Since the pair of shoes is returned after the authorization is cleared, the merchant needs to send a refund request.</p>

  <div>
    <ol>
      <li>
        <strong>Client returns the pair of shoes:</strong> The client brings the shoes back to the store and initiates a return.
      </li>

      <li>
        <strong>Merchant sends a refund request:</strong> The merchant submits a <strong>refund request</strong> to Visa.
      </li>

      <li>
        <strong>Visa forwards the refund request:</strong> Visa forwards the refund request to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the refund signal:</strong> The card processor sends the refund signal to <strong>Reap</strong>.
      </li>

      <li>
        <strong>Reap triggers a transaction webhook:</strong> Reap sends a transaction webhook to your system with the same <code>transactionId</code>, the <code>eventName</code> set to <code>refund</code>, and the status will be updated as <code>VOID</code>. If the refund is a partial refund, the status will be <code>CLEARED</code>.
      </li>

      <li>
        <strong>Return the cleared amount to the available balance:</strong> The previously deducted amount of $100 from the clearing is now returned back to the <strong>available balance</strong> in your master account.
      </li>
    </ol>
  </div>
</Accordion>

### Common Examples Of Full Reversal

* Return of goods and services after 30 days of the initial transaction.

***

## Unrelated Refund

💡 **Scenario 2: The cardholder buys goods overseas and receives a tax refund.**

<Accordion title="Authorization Stage">
  <p>
    The authorization process is exactly the same as in <strong>Scenario 1</strong>.
  </p>
</Accordion>

<Accordion title="Clearing Stage">
  <p>
    The clearing process is exactly the same as in <strong>Scenario 1</strong>.
  </p>
</Accordion>

<Accordion title="Refund Stage">
  <p>Since the tax refund at the airport covers multiple transactions, it cannot be processed as a related refund. Instead, it is handled as a separate transaction in a different transaction lifecycle.</p>

  <div>
    <ol>
      <li>
        <strong>Client asks for a tax refund:</strong> The client goes to the airport to request a tax refund for their purchases.
      </li>

      <li>
        <strong>A refund request is submitted:</strong> The refund request is then sent to Visa for processing.
      </li>

      <li>
        <strong>Visa forwards the refund request:</strong> Visa forwards the refund request to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the refund signal:</strong> The card processor sends the refund signal to <strong>Reap</strong>.
      </li>

      <li>
        <strong>Reap triggers a transaction webhook:</strong> Reap sends a transaction webhook to your system with an unrelated
        <code>transactionId</code>, the <code>eventName</code> set to <code>refund</code>, and the
        <code>status</code> will remain as <code>CLEARED</code>.
      </li>

      <li>
        <strong>Return the cleared amount to the available balance:</strong> The previously deducted amount from the clearing is now returned back to the <strong>available balance</strong> in your master account.
      </li>
    </ol>
  </div>
</Accordion>

### Common Examples Of Unrelated Refund

* **Tax Refunds**: A refund for taxes paid on overseas purchases.
* **Returns Beyond 30-day**: Return of goods or services after the standard 30-day period.
* **Goodwill Refunds**: A refund issued by the merchant as a gesture of goodwill, often unrelated to a specific transaction.

### Circumstances of Unrelated Refunds

1. As a **Visa Direct transaction**, where the `channel` field in the transaction webhook will show the value `VISA_DIRECT`.
2. As a **normal refund transaction**.

> 📘 Locating Unrelated Refunds
>
> Sometimes, merchants might submit an unrelated refund even if an authorization exists, which can complicate locating the refund. To find an unrelated refund, search all transactions under the same card ID using the following filters:
>
> * `transaction_amount`
> * `transaction_currency`
> * `merchant_name`

***

**Related Materials**:

📖 Guide/ [Transaction Authorization](https://reap.readme.io/docs/authorization)

📖 Guide/ [Transaction Lifecycle](https://reap.readme.io/docs/transaction-scenarios)

📖 Guide/ [Transaction Scenarios/ Authroized Transaction With Clearing](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/)

📖 Guide/ [Transaction Scenarios/ Reversal Of Authorized Transaction](https://reap.readme.io/docs/transaction-scenarios-reversal#/))

📖 Guide/ [Transaction Scenarios/ Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)

📖 Guide/ [Chargeback ](https://reap.readme.io/docs/chargeback)