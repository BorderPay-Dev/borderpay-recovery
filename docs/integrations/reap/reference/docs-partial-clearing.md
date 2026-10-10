---
updatedAt: 2026-05-14T19:42:05.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Partial Clearing 

This page explores a real-life example of partial clearing, also known as <Glossary>Clearing</Glossary>. It demonstrates how partial clearing occurs as a transaction event, and how it affects transaction status, immediate available balance, and the transaction webhook events that are received on a step-by-step basis:

## Partial Clearing

💡 **Scenario: A client checks into a hotel that pre-authorizes $200 (covering a $150 room rate plus a $50 incidental deposit). At checkout, only the $150 room rate is actually charged.**

<Accordion title="Authorization Stage">
  <div>
    <ol>
      <li>
        <strong>Transaction is initiated:</strong> The client presents the card at hotel check-in, and the hotel requests an authorization for the full estimated amount of $200 to cover the room rate and a deposit for potential incidentals.
      </li>

      <li>
        <strong>Authorization signal is sent in real-time:</strong> Because authorization is always processed online, the authorization request is forwarded through the card network to the card processor and then to <strong>Reap</strong> for approval. Reap is required to respond within the time window expected by the card processor.
      </li>

      <li>
        <strong>Authorization webhook is triggered:</strong> Once the authorization is approved, Reap sends a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.created</code> and the status set to <code>PENDING</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> The full authorized amount of $200 is added to the client's <code>blocked\_balance</code>, reducing the <code>available\_balance</code> by the same amount. At this stage, no funds have been moved out of the account; the amount is simply held against the pending transaction.
      </li>
    </ol>

    <p>
      Note that the entire authorized amount is reserved upfront, even though the final settled amount may turn out to be lower. This ensures the merchant has sufficient funds available to cover the maximum possible charge until the final amount is known at clearing.
    </p>
  </div>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <ol>
      <li>
        <strong>Clearing is initiated:</strong> At checkout, the hotel determines the final amount owed, which is $150 — lower than the original $200 authorization. The hotel submits the clearing request for the actual amount used.
      </li>

      <li>
        <strong>Clearing signal sent to Visa:</strong> The clearing request for $150 is sent from the merchant (the hotel) to Visa or the relevant payment processor.
      </li>

      <li>
        <strong>Visa forwards the clearing signal:</strong> Visa forwards the clearing instruction to the card processor.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor sends the clearing request to <strong>Reap</strong> for further processing.
      </li>

      <li>
        <strong>Clearing webhook is triggered:</strong> Reap sends a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code> and the status updated to <code>CLEARED</code>. The <code>bill\_amount</code> reflects the actual cleared amount of $150 rather than the original authorized $200.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> Once clearing is processed, the full $200 <code>blocked\_balance</code> is released, and $150 is moved into <code>outstanding\_balance</code>. The remaining $50 difference is returned to the client's <code>available\_balance</code>.
      </li>
    </ol>
  </div>
</Accordion>

<Accordion title="Subsequent Clearing Stage (Optional)">
  <div>
    <ol>
      <li>
        <strong>Additional clearing is initiated:</strong> In some scenarios, the merchant may submit more than one clearing request against a single authorization. For example, an airline may issue separate clearings for the base fare and additional services such as baggage or seat upgrades.
      </li>

      <li>
        <strong>Clearing webhook is triggered again:</strong> Reap sends another <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code>. The transaction status remains <code>CLEARED</code>, and the <code>bill\_amount</code> is updated to reflect the cumulative cleared amount across all clearing events.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> Each subsequent clearing increases the <code>outstanding\_balance</code> by the additional cleared amount, further reducing the client's <code>available\_balance</code>.
      </li>
    </ol>

    <p>
      The transaction status does not change with subsequent clearings. To determine whether more clearings are still expected, the cumulative <code>bill\_amount</code> should be compared against the original authorized amount rather than relying on status alone.
    </p>
  </div>
</Accordion>

### Common Examples of Partial Clearing

Partial clearing typically occurs in scenarios where the final transaction amount is not known at the time of authorization, or where the merchant settles the transaction in stages. Here are some typical examples:

* **Hotel Stays**: Hotels often authorize an amount that includes the room rate plus a buffer for incidentals such as minibar use or damages. At checkout, only the actual amount used is cleared, releasing the unused portion.
* **Car Rentals**: Rental agencies pre-authorize an estimated amount that covers the rental period plus potential additional fees (e.g. fuel charges or late returns). The final clearing reflects the actual usage, which is often lower than the authorized amount.
* **Airline Tickets and Ancillary Services**: Airlines may issue multiple clearing events against a single authorization to cover the base fare and additional services such as baggage, seat selection, or in-flight purchases, particularly for multi-leg itineraries.
* **Restaurant Tabs**: Restaurants may authorize an estimated amount when a tab is opened and clear the actual bill amount once the customer settles, which may include or exclude tips depending on the merchant's process.

***

**Related Materials**:

📖 Guide/ [Transaction Lifecycle](https://reap.readme.io/docs/transaction-scenarios)

📖 Guide/ [Transaction Scenarios/ Authorized Transaction With Clearing](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/)

📖 Guide/ [Transaction Scenarios/ Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)

📖 Guide/ [Transaction Scenarios/ Reversal Of Authorized Transaction](https://reap.readme.io/docs/transaction-scenarios-reversal#/)

📖 Guide/ [Transaction Scenarios/ Refund](https://reap.readme.io/docs/transaction-scenarios-refund#/)

📖 Guide/ [Chargeback](https://reap.readme.io/docs/chargeback)