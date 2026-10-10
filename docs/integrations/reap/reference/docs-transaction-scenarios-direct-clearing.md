---
updatedAt: 2025-04-23T04:43:35.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Direct Clearing 

In this page, we will explore a real-life example of direct clearing, as known as <Glossary>Clearing</Glossary>. It demonstrates how direct clearing occurs as a transaction event, and how it affects transaction status, immediate available balance, and the transaction webhook events that you will receive on a step-by-step basis:

## Direct Clearing

💡 **Scenario: A client rides a bus and taps the card to pay the $10 bus fare.**

<Accordion title="Authorization Stage">
  <div>
    <ol>
      <li>
        <strong>Transaction is initiated:</strong> The client taps their card to pay for the bus fare, and the bus fare transaction is authorized offline. Since the card is not connected to the payment network in real-time, the authorization is stored and will be processed later.
      </li>

      <li>
        <strong>Authorization signal is not sent immediately:</strong> Because the transaction is offline, the authorization request is not sent to the card network or payment processor at this point.
      </li>

      <li>
        <strong>Authorization webhook is not triggered:</strong> Since the transaction is offline, no immediate webhook is triggered.
      </li>
    </ol>

    <p>
      Please note that some POS machines may still have a network connection, so the authorization can still be processed in real-time. In this case, the authorization process works just like in  <strong>Authorized Transaction with Clearing</strong>, and the authorization webhook is triggered as usual.
    </p>

    <p>
      However, regardless of whether the authorization is approved or rejected, the transaction will still be cleared. This is because the merchant assumes that the cardholder has already used the service they provided, such as in the case of a bus ride or similar services.
    </p>
  </div>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/afd40575bb30e648e562779839b50ddf005485f11118cfcaf1ee3b62a3b616e0-Diret_clearing_clearing_stage_1.png" alt="Direct Clearing Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Clearing is initiated:</strong> Later, when the bus company submits all the offline transactions for processing, the clearing process is initiated. The transaction details, including the fare, are sent to the payment processor for settlement.
      </li>

      <li>
        <strong>Clearing signal sent to Visa:</strong> The clearing request for the bus fare is sent from the merchant (the bus company) to Visa or the payment processor.
      </li>

      <li>
        <strong>Visa forwards the clearing signal:</strong> Visa forwards the clearing instruction to the card processor.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor sends the clearing request to <strong>Reap</strong> for further processing.
      </li>

      <li>
        <strong>Clearing webhook is triggered:</strong> Reap sends you a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code> and the status updated to <code>CLEARED</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> The transaction amount for the bus fare is deducted from the client’s available balance when the clearing process is completed, and the transaction is officially settled.
      </li>
    </ol>
  </div>
</Accordion>

### Common Examples of Offline Transactions

Offline transactions occur when the payment system operates without a real-time connection to the payment network. These transactions are stored locally and processed later when a network connection is available. Here are some typical examples:

* **Commuter Transport or Ferry Fares**: Payments made using a card or device for public transport services, such as buses, trains, or ferries, often rely on offline authorization. These transactions are processed in bulk at a later time.
* **In-Flight Transactions**: Purchases made during a flight, such as food, beverages, or duty-free items, are processed offline since the aircraft's payment system may not be connected to the payment network in real time.

***

**Related Materials**:

📖 Guide/ [Transaction Lifecycle](https://reap.readme.io/docs/transaction-scenarios)

📖 Guide/ [Transaction Scenarios/ Authroized Transaction With Clearing](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/)

📖 Guide/ [Transaction Scenarios/ Reversal Of Authorized Transaction](https://reap.readme.io/docs/transaction-scenarios-reversal#/)

📖 Guide/ [Transaction Scenarios/ Refund](https://reap.readme.io/docs/transaction-scenarios-refund#/)

📖 Guide/ [Chargeback ](https://reap.readme.io/docs/chargeback)