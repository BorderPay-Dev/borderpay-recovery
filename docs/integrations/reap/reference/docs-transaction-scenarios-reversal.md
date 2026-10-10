---
updatedAt: 2025-04-23T04:44:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Reversal Of Authorized Transaction 

In this page, we will explore three real-life examples of <Glossary>Reversal</Glossary>. These scenarios demonstrate how reversal occurs as a transaction event, and how it affects transaction status, immediate available balance, and the transaction webhook events that you will receive on a step-by-step basis:

<Cards columns={3}>
  <Card title="Reversed Amount < Authorized Amount" href="https://reap.readme.io/docs/transaction-scenarios-reversal#partial-reversal">
    A case where <strong> partial reversal</strong> occurs, meaning the reversed amount is less than the original authorized amount.
  </Card>

  <Card title="Reversed Amount = Authorized Amount" href="https://reap.readme.io/docs/transaction-scenarios-reversal#reversed-amount--the-authorized-amount-full-reversal">
    A transaction where the reversed amount exactly matches the initial authorized amount <strong> (full reversal)</strong>.
  </Card>

  <Card title="Automatic Reversal" href="https://reap.readme.io/docs/transaction-scenarios-reversal#automatic-reversal">
    Reap's system automatically reverses a previously authorized transaction when no clearing or reversal transaction events occur within 30 days.
  </Card>
</Cards>

***

## **Reversed Amount = The Authorized Amount (Full Reversal)**

💡 **Scenario 1: The cardholder buys a pair of shoes for $100 and returns the shoes the next day.**

<Accordion title="Authorization Stage">
  <div>
    <img src="https://files.readme.io/5f68e32622656a21699da20cb67aab9a369a3720fdbf41ec5cf8ef67c2f49ee1-Reversed_Amount__The_Authorized_Amount_Authroization_stage.png" alt="Authorization Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

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

<Accordion title="Reversal Stage">
  <div>
    <img
      src="
https://files.readme.io/7de9978355edd6f417adaa852ed6ad05613568a949e03dfd0b7d15deb944cf6b-Reversed_Amount__The_Authorized_Amount_Reversal_Stage.png"
      alt="Reversal Stage Diagram"
      style={{ width: "100%", height: "auto", marginBottom: "16px" }}
    />

    <ol>
      <li>
        <strong>Client returns the pair of shoes:</strong> The client brings the shoes back to the store and initiates a return.
      </li>

      <li>
        <strong>Merchant sends a reversal request:</strong> The merchant submits a <strong>reversal request</strong> to Visa.
      </li>

      <li>
        <strong>Visa forwards the reversal request:</strong> Visa forwards the reversal request to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the reversal signal:</strong> The card processor sends the reversal signal to <strong>Reap</strong>.
      </li>

      <li>
        🔔 <strong>Reap triggers a transaction webhook:</strong> Reap sends a transaction webhook to your system with the same <code>transactionId</code>, the <code>eventName</code> set to <code>authorization.reversal</code>, and the <code>status</code> updated to <code>VOID</code>.
      </li>

      <li>
        <strong>Release of available balance:</strong> The previously blocked amount of $100 from the authorization is now released back to the <strong>available balance</strong> in your master account.
      </li>
    </ol>
  </div>
</Accordion>

### Common Examples Of Full Reversal

* Return of goods and services within 30 days

***

## Partial Reversal

💡 **Scenario 2: The cardholder buys a pair of shoes for $100 and a pair of socks for $20 in a shop and returns the shoes the next day.**

<Accordion title="Authorization Stage">
  <div>
    <p>
      The authorization process is the same as in <strong>Scenario 1</strong>, but the transaction amount is <strong>$120</strong> instead.
    </p>
  </div>
</Accordion>

<Accordion title="Reversal Stage">
  <div>
    <img src="https://files.readme.io/4c4bbef4826ec8eaf7b9b1eb863e1dcc131c5b1490c022a95b8d28f567d9c9b4-Reversed_Amount___The_Authorized_Amount_Reversal_stage.png" alt="Reversal Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Client returns the pair of shoes:</strong> The client brings the shoes back to the store and initiates a return.
      </li>

      <li>
        <strong>Merchant sends a reversal request:</strong> The merchant submits a <strong>reversal request</strong> for $100 to Visa.
      </li>

      <li>
        <strong>Visa forwards the reversal request:</strong> Visa forwards the reversal request to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the reversal signal:</strong> The card processor sends the reversal signal to <strong>Reap</strong>.
      </li>

      <li>
        🔔 <strong>Reap triggers a transaction webhook:</strong> Reap sends a transaction webhook to your system with the same <code>transactionId</code>, the <code>eventName</code> set to <code>authorization.reversal</code>, a transaction amount of $100, and the <code>status</code> updated to <code>VOID</code>.
      </li>

      <li>
        <strong>Release of available balance:</strong> The previously blocked amount of <strong>$120</strong> is reduced to <strong>$20</strong> as <strong>$100</strong> is now released back to the <strong>available balance</strong> in your master account.
      </li>
    </ol>
  </div>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/92524322d2c99cbbb79729f2bfdd3229ae08635625be4d4b8339829008246774-Reversed_Amount___The_Authorized_Amount_clearing_stage.png" alt="Clearing Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Clearing is initiated:</strong> The merchant initiates the <strong>clearing process</strong> for <strong>$20</strong> (the cost of the pair of socks).
      </li>

      <li>
        <strong>Clearing signal sent to Visa:</strong> The clearing request is sent from the merchant to Visa.
      </li>

      <li>
        <strong>Visa forwards the clearing signal:</strong> Visa forwards the clearing instruction to the <strong>card processor</strong>.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor passes the clearing request to <strong>Reap</strong>.
      </li>

      <li>
        🔔 <strong>Authorization webhook is triggered:</strong> Reap sends a transaction webhook to your system with the same <code>transactionId</code>, the <code>eventName</code> set to <code>authorization.clearing</code>, a transaction amount of <strong>$20</strong>, and the <code>status</code> updated to <code>CLEARED</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> Reap <strong>deducts $20</strong> from your master account balance, reducing the <strong>available balance</strong> by <strong>$20</strong>. This represents the final settlement of the transaction, where the merchant receives the funds, and the transaction is officially completed.
      </li>
    </ol>

    <p>
      In this <strong>partial reversal case</strong>, part of the transaction is reversed (the shoes, <strong>$100</strong>), and part of the transaction is cleared (the socks, <strong>$20</strong>).
    </p>
  </div>
</Accordion>

### Common Examples Of Partial Reversal

* **Partial Return of Goods or Services**: When a customer returns only a portion of the purchased goods or cancels part of the services within the return policy period, typically within 30 days.

***

## Automatic Reversal

💡 **Scenario 3: The cardholder buys a pair of shoes for $100 and returns them the next day, but the merchant doesn't cancel the transaction by sending a transaction reversal request.**

<Accordion title="Authorization Stage">
  <div>
    <p>
      The authorization process is the same as in <strong>Scenario 1</strong>.
    </p>
  </div>
</Accordion>

<Accordion title="Reversal Stage">
  <img src="https://files.readme.io/d2a49df6f151639c73ca6e29b5632fb21ae95ae0277988a7890f0b7b8acbc422-Automatic_reversal_Reversal_stage.png" alt="Reversal Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

  <p>After 30 days of the transaction, Reap's system has not received any reversal or clearing signal, so the authorized transaction is automatically reversed.</p>

  <div>
    <ol>
      <li>
        <strong>Client returns the pair of shoes:</strong> The client brings the shoes back to the store and initiates a return.
      </li>

      <li>
        <strong>Merchant doesn’t send a reversal request:</strong> The merchant doesn't submit a reversal request to Visa, which causes the blocked balance to remain unreleased.
      </li>

      <li>
        <strong>Card processor triggers automatic reversal:</strong> After 30 days, if the transaction status is still <code>PENDING</code>, the card processor automatically sends the reversal signal to <strong>Reap</strong>.
      </li>

      <li>
        <strong>Reap triggers a transaction webhook:</strong> Reap sends a transaction webhook to your system with the same <code>transactionId</code>, the <code>eventName</code> set to <code>authorization.reversal</code>, and the status updated to <code>VOID</code>.
      </li>

      <li>
        <strong>Release of available balance:</strong> The previously blocked amount of $100 from the authorization is now released back to the <strong>available balance</strong> in your master account.
      </li>
    </ol>
  </div>
</Accordion>

***

**Related Materials**:

📖 Guide/ [Transaction Authorization](https://reap.readme.io/docs/authorization)

📖 Guide/ [Transaction Lifecycle](https://reap.readme.io/docs/transaction-scenarios)

📖 Guide/ [Transaction Scenarios/ Authroized Transaction With Clearing](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/)

📖 Guide/ [Transaction Scenarios/ Refund](https://reap.readme.io/docs/transaction-scenarios-refund#/)

📖 Guide/ [Transaction Scenarios/ Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)