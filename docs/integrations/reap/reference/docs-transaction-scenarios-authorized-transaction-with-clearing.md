---
updatedAt: 2025-12-11T07:11:55.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Authorized Transaction with Clearing

In this page, we will explore three real-life examples of authorized transactions with clearing. These scenarios demonstrate how the clearing amount can vary relative to the authorized amount, providing valuable insights into common transaction flows:

## **Clearing Amount = The Authorized Amount**

💡 **Scenario 1: The cardholder buys a pair of shoes for $200.**

<Accordion title="Authorization Stage">
  <div>
    <img src="https://files.readme.io/1ddb8b62af21bddb4b5fd2be61558e6be7cbb15582be186739cb88ef6ea69c1c-Clearing_amount__The_authorized_amount_authorized_stage.png" alt="Authorization Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Transaction is initiated:</strong> When the cardholder taps, swipes, or enters their card details at the terminal, an <strong>authorization request</strong> for $200 is initiated and sent to Visa by the merchant’s payment terminal.
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
        <strong>Temporary block on available balance:</strong> Reap places a <strong>hold of $200</strong> on the <code>availableCredit</code> of the card and also on your card program's master account's <code>availableBalance</code>. The balance will be reduced by $200 if you retrieve the relevant endpoints. However, this is a temporary hold, and no settlement has occurred yet.
      </li>
    </ol>
  </div>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/5b33578acf34dbcf5c28511c815afb7dd307f7eb508a9443569c51b0337510e1-Clearing_amount__The_authorized_amount_clearing_stage.png" alt="Clearing Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

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
        🔔 <strong>Webhook Triggered:</strong> Reap sends you a <strong>transaction webhook</strong> with <code> eventName: authorization.clearing </code> and <code> status: CLEARED </code>.
      </li>

      <li>
        <strong>Adjustment on Balance:</strong> $200 will be cleared and transferred to Reap's account. Since the amount was already blocked and deducted from both the card level (<code>availableCredit</code>) and master account level (<code>availableBalance</code>) during the authorization stage, no numerical changes will be tracked when calling relevant endpoints at this stage.

        For additional details on how clearings are handled, please refer to the [Important Visa Rules](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#visa-rules-for-clearings) section.
      </li>
    </ol>
  </div>
</Accordion>

***

## **Clearing Amount < The Authorized Amount**

💡 **Scenario 2: The cardholder stays at a hotel and pays $200 upfront, including a security deposit.**

<Accordion title="Authorization Stage">
  <p>The authorization process is the same as in Scenario 1. In this case the merchant authorizes a total of $200, which includes $150 for the room rate and a $50 security deposit that is held temporarily.</p>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/a8330b2ff946e6c4f9876f1b5e117debddb5a76c911d1dbb00f90e87a155cd85-Clearing_amount___The_authorized_amount_authorized_stage.png" alt="Clearing Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Clearing is initiated:</strong> After the client checks out, the merchant calculates the final amount to be charged. There are no additional fees, so only $150 is needed to cover the room cost. The merchant initiates the <strong>clearing process</strong> for this amount.
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
        🔔 <strong>Authorization webhook is triggered:</strong> Reap sends you a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code> and the status updated to <code>CLEARED</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> A total of $150 of the original $200 authorization has now been cleared. The first clearing always releases any unused portion of the original authorized amount. The remaining $50 from the security deposit is released immediately back to your <code>availableBalance</code> in your master account once the clearing is processed.

        Additional clearings may still be submitted by the merchant for up to 30 days from the original authorization. To reduce the risk of late or additional clearings within this 30 day period, many clients hold a buffer of funds on their side for the full duration so they can ensure sufficient balance in case further clearings are submitted.

        For additional details on how clearings are handled, please refer to the [Important Visa Rules](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#visa-rules-for-clearings) section.
      </li>
    </ol>
  </div>
</Accordion>

***

## Clearing Amount > The Authorized Amount

💡 **Scenario 3: The cardholder dines in at a restaurant for $200 and the tip is $20.**

<Accordion title="Authorization Stage">
  <p>The authorization process is the same as in Scenario 1,while the authorized amount is $200.</p>
</Accordion>

<Accordion title="Clearing Stage">
  <div>
    <img src="https://files.readme.io/383c7ce524743b51d54cc229315dc7c112a7a6609392e2ca99491c55ff9cb402-Clearing_amount___The_authorized_amount_authorized_stage.png" alt="Clearing Stage Diagram" style={{ width: "100%", height: "auto", marginBottom: "16px" }} />

    <ol>
      <li>
        <strong>Clearing is initiated:</strong> After the client initiates the payment, the restaurant calculates the final amount, which includes a $20 tip, totaling $220. The merchant initiates the clearing process for $220.
      </li>

      <li>
        <strong>Clearing signal sent to Visa:</strong> The clearing request for the total amount of $220 is sent from the merchant to Visa.
      </li>

      <li>
        <strong>Visa forwards the clearing signal:</strong> Visa forwards the clearing instruction to the card processor.
      </li>

      <li>
        <strong>Card processor forwards the signal:</strong> The card processor passes the clearing request to <strong>Reap</strong>.
      </li>

      <li>
        🔔 <strong>Clearing webhook is triggered:</strong> Reap sends you a <strong>transaction webhook</strong> with <code>eventName</code> set to <code>authorization.clearing</code> and the status updated to <code>CLEARED</code>.
      </li>

      <li>
        <strong>Adjustment of available balance:</strong> Since the authorized amount was only $200, the $20 tip causes a clearing amoung that is higher that the initial authorized amount, which aka is over-clearing. As a result, Reap needs deduct $220 in total from your master account balance to settle the finalized clearing amount. As $200 was already blocked in both card and mastera ccount level, curerntly Reap needs to deduce $20 in <code>availableCredit</code> (card level) and <code>availableBalance</code> (master account lelve) to cover this extra clearing amount. In total, to settle this clearing, $220 was deduced in both card and program level.

        For additional details on how clearings are handled, please refer to the [Important Visa Rules](https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#visa-rules-for-clearings) section.
      </li>
    </ol>
  </div>
</Accordion>

### Common Examples Where the Clearing Amount Exceeds the Authorized Amount

* **Automated Fuel Dispensers (AFD)**: Self-service fuel pumps at gas stations.
* **Tipping**: Tips given at places like restaurants, bars, fast food outlets, and beauty salons.
* **Additional airline charges**: Extra fees, such as for additional baggage, when booking a flight.
* **Additional hotel charges**: Extra costs at hotels, motels, or resorts, like spending on services during your stay.

***

## Visa Rules for Clearings

<Callout icon="❗️" theme="error">
  Merchants may submit additional clearing requests for **up to 30 days** from the date of the original authorization, even if the authorization has already been captured. It is important to maintain a sufficient buffer in your program balance during this period.

  Any clearings submitted after the 30 day period is considered **a violation of Visa rules**. These late clearings may still be transmitted and can appear in your ledger, but they are not considered valid. Your program is entitled to **dispute such transactions**. When necessary, Reap can also file a **merchant complaint** on your behalf.
</Callout>

***

**Related Materials**:

📖 Guide/ [Transaction Authorization](https://reap.readme.io/docs/authorization)

📖 Guide/ [Transaction Scenarios/ Reversal Of Authorized Transaction](https://reap.readme.io/docs/transaction-scenarios-reversal#/)

📖 Guide/ [Transaction Scenarios/ Refund](https://reap.readme.io/docs/transaction-scenarios-refund#/)

📖 Guide/ [Transaction Scenarios/ Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)

📖 Guide/ [3D Secure](https://reap.readme.io/docs/3ds)

📖 Guide/ [Chargeback ](https://reap.readme.io/docs/chargeback)