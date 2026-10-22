---
updatedAt: 2026-07-31T11:21:40.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Transaction Decline Reasons

Learn why transactions may be declined and how to access detailed decline reasons.

Payments can fail for various reasons, such as insufficient funds, card configuration issues, or technical errors. During a transaction's lifecycle, it passes through multiple parties—including the merchant, card processor, Visa, Reap, and your system—any of which can decline the transaction for valid reasons.

To enhance transparency and streamline issue resolution, you can retrieve the specific reason for a transaction decline via our API endpoints. When a transaction is declined by our service provider, Reap forwards the transaction event to your gateway through a webhook.

***

## How to Check a Transaction Decline Reason

You can access transaction decline reasons using the following methods:

1. **API Endpoints**

   Decline reasons are stored in the `decline_reason` object. You can retrieve them using these endpoints:

   * [`GET /transactions`](https://reap.readme.io/reference/get_transactions)  — Retrieve all transactions within a card program.
   * [`GET /cards/\{cardId}\/transactions`](https://reap.readme.io/reference/get_cards-cardid-transactions)  — Retrieve all transactions for a specific card.
   * [`GET /transactions/{transactionId}`](https://reap.readme.io/reference/get_transactions-transactionid)  — Retrieve details for a specific transaction.
2. **Authorization Advice Webhook**

   For real-time updates, the `authorization.advice` webhook includes decline reasons in its payload. Use this method to handle transaction declines as they occur.

***

## Decline Codes

The following table lists common decline codes used by Reap, Visa, our payment processor, and your system. Each code includes a description, explanation, and suggested next steps to resolve the issue.

<Callout icon="❗️" theme="error">
  ### Important Note for Real-Time Authorization Card Programs

  When declining a transaction in response to an authorization request, clients should return the response code that best reflects the reason for the decline. For details on responding to authorization request webhooks, refer to the [Response To Real-Time Authorization Request](https://reap.readme.io/docs/response-to-real-time-authorization-request#/) Guide.
</Callout>

<Table align={["left","left","left","left"]}>
  <thead>
    <tr>
      <th>
        Decline Code
      </th>

      <th>
        Description
      </th>

      <th>
        Remarks
      </th>

      <th>
        Suggested Next Step
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        **03**
      </td>

      <td>
        The merchant is not set up to accept this type of card. Please try using a different payment method.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to use a different payment method.
      </td>
    </tr>

    <tr>
      <td>
        **04**
      </td>

      <td>
        Rejected by VISA.
      </td>

      <td>
        The card cannot be used for this transaction. Please try using a different payment method.
      </td>

      <td>
        Inform the cardholder to use a different payment method.
      </td>
    </tr>

    <tr>
      <td>
        **05**
      </td>

      <td>
        The transaction has been declined due to do not honor.
      </td>

      <td>
        /
      </td>

      <td>
        /
      </td>
    </tr>

    <tr>
      <td>
        **5C**
      </td>

      <td>
        Something went wrong when processing the transaction. Please contact support.
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **5E**
      </td>

      <td>
        Transaction declined due to insufficient funds.
      </td>

      <td>
        Returned (in both webhook and GET /\{cardId/\}/transactions/) when `51` is sent in response to an authorization request.
      </td>

      <td>
        Inform the cardholder about insufficient funds.
      </td>
    </tr>

    <tr>
      <td>
        **6P**
      </td>

      <td>
        Verification of the provided data failed. Please verify and try again.
      </td>

      <td>
        Entering incorrect card information such as expiration date or CVV during a transaction
      </td>

      <td>
        Verify the data and retry.
      </td>
    </tr>

    <tr>
      <td>
        **14**
      </td>

      <td>
        Invalid card number.
      </td>

      <td>
        Incorrect PAN (card number). Card number does not exist.
      </td>

      <td>
        Verify the data and retry.
      </td>
    </tr>

    <tr>
      <td>
        **41**
      </td>

      <td>
        The card is reported lost.
      </td>

      <td>
        /
      </td>

      <td>
        Follow up with the cardholder to determine if a replacement card needs to be issued.
      </td>
    </tr>

    <tr>
      <td>
        **43**
      </td>

      <td>
        The card is reported stolen.
      </td>

      <td>
        /
      </td>

      <td>
        Follow up with the cardholder to determine if a replacement card needs to be issued.
      </td>
    </tr>

    <tr>
      <td>
        **46**
      </td>

      <td>
        The card is no longer active.
      </td>

      <td>
        /
      </td>

      <td>
        Confirm with the cardholder if further action is required.
      </td>
    </tr>

    <tr>
      <td>
        **51**
      </td>

      <td>
        Not enough balance to complete the transaction. Please add funds or use a different payment method.
      </td>

      <td>
        Reap declines this transaction after checking the card balance.
      </td>

      <td>
        Ask the cardholder to add funds to their account to enable future transactions.
      </td>
    </tr>

    <tr>
      <td>
        **54**
      </td>

      <td>
        The card has expired. Please use a valid card.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to use another card or create a new one to retry the transaction.
      </td>
    </tr>

    <tr>
      <td>
        **55**
      </td>

      <td>
        The entered PIN is incorrect. Please try again.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to verify and retry with the correct PIN.
      </td>
    </tr>

    <tr>
      <td>
        **57**
      </td>

      <td>
        Something went wrong when processing the transaction. Please contact support.
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **58**
      </td>

      <td>
        The transaction is not allowed at this point of sale.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to use another card to continue the transaction.
      </td>
    </tr>

    <tr>
      <td>
        **59**
      </td>

      <td>
        The transaction has been declined due to suspected fraud.
      </td>

      <td>
        /
      </td>

      <td>
        Contact the cardholder to verify fraud and report confirmed fraud to Reap. For more information, contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **61**
      </td>

      <td>
        You have exceeded your approval limit. Please try a smaller amount or wait for the limit to reset.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder about the approval limit and suggest retrying with a smaller amount.
      </td>
    </tr>

    <tr>
      <td>
        **62**
      </td>

      <td>
        The card cannot be used for this transaction. Please try using a different payment method.
      </td>

      <td>
        /
      </td>

      <td>
        Request the cardholder to use an alternative payment method.
      </td>
    </tr>

    <tr>
      <td>
        **64**
      </td>

      <td>
        Description unavailable. Please contact support
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **65**
      </td>

      <td>
        You have exceeded the allowed number of ATM withdrawals. Please try again later.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder about exceeding the allowed withdrawal frequency.
      </td>
    </tr>

    <tr>
      <td>
        **70**
      </td>

      <td>
        There is an issue with the card status.
      </td>

      <td>
        Triggered if the card status is frozen.
      </td>

      <td>
        Notify the cardholder about the frozen status and discuss next steps.
      </td>
    </tr>

    <tr>
      <td>
        **75**
      </td>

      <td>
        The card has been blocked due to exceeding the maximum number of incorrect ATM PIN attempts.
      </td>

      <td>
        The card is blocked until manually unblocked.
      </td>

      <td>
        Investigate for potential fraud. If appropriate, use  PUT cards/\{cardId\}/unblock end point to unblock the card.
      </td>
    </tr>

    <tr>
      <td>
        **77**
      </td>

      <td>
        This transaction is not supported.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to use a different payment method.
      </td>
    </tr>

    <tr>
      <td>
        **78**
      </td>

      <td>
        Declined due to card status.
      </td>

      <td>
        /
      </td>

      <td>
        Verify the card status
      </td>
    </tr>

    <tr>
      <td>
        **81**
      </td>

      <td>
        Description unavailable. Please contact support
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **82**
      </td>

      <td>
        Transaction took too long to process, please try again.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to retry the transaction.
      </td>
    </tr>

    <tr>
      <td>
        **86**
      </td>

      <td>
        The system was unable to verify your PIN due to a technical issue or incorrect input, so the transaction could not be completed.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to verify their PIN and retry.
      </td>
    </tr>

    <tr>
      <td>
        **91**
      </td>

      <td>
        Temporary System Issue. Please contact support.
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **95**
      </td>

      <td>
        There is a reconciliation mismatch identified between systems (e.g., acquirer and issuer). Please contact support.
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **N0**
      </td>

      <td>
        An unexpected error happened before the payment could be fully processed. Please contact support.
      </td>

      <td>
        /
      </td>

      <td>
        Contact Reap support with the `transactionId`.
      </td>
    </tr>

    <tr>
      <td>
        **N3**
      </td>

      <td>
        Something went wrong when processing the transaction.
      </td>

      <td>
        Cash service not available. Card holder may be attempting a cash advance, which has not been enabled.
      </td>

      <td>
        Inform cardholder that cash advance is not available and to use a different payment method.
      </td>
    </tr>

    <tr>
      <td>
        **N7**
      </td>

      <td>
        The CVV entered is incorrect. Please check and try again.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to verify the CVV and retry.
      </td>
    </tr>

    <tr>
      <td>
        **R1**
      </td>

      <td>
        The card is currently frozen.
      </td>

      <td>
        The transaction is declined, and further transactions will not be processed while the card remains frozen.
      </td>

      <td>
        Contact the cardholder to confirm if they want to unfreeze the card.
      </td>
    </tr>

    <tr>
      <td>
        **R2**
      </td>

      <td>
        The card has been blocked due to multiple incorrect CVV attempts.
      </td>

      <td>
        /
      </td>

      <td>
        Verify the cardholder's identity to unblock the card.
      </td>
    </tr>

    <tr>
      <td>
        **R3**
      </td>

      <td>
        The card has been blocked due to multiple incorrect expiry date attempts.
      </td>

      <td>
        /
      </td>

      <td>
        Verify the cardholder's identity to unblock the card.
      </td>
    </tr>

    <tr>
      <td>
        **R4**
      </td>

      <td>
        The card is not activated.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to activate the card.
      </td>
    </tr>

    <tr>
      <td>
        **R5**
      </td>

      <td>
        Withdrawals are not allowed for this card.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder about this limitation.
      </td>
    </tr>

    <tr>
      <td>
        **R6**
      </td>

      <td>
        The daily spending limit has been exceeded.
      </td>

      <td>
        /
      </td>

      <td>
        Notify the cardholder about the spending limit.
      </td>
    </tr>

    <tr>
      <td>
        **R7**
      </td>

      <td>
        The allowed transaction limit has been exceeded for this card.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder about the limit and suggest revising limits if necessary.
      </td>
    </tr>

    <tr>
      <td>
        **R8**
      </td>

      <td>
        The card is blocked.
      </td>

      <td>
        /
      </td>

      <td>
        Investigate the reason for the card being blocked. If appropriate, use  PUT cards/\{cardId\}/unblock end point to unblock the card.
      </td>
    </tr>

    <tr>
      <td>
        **R10**
      </td>

      <td>
        The assigned budget balance is insufficient. Please add funds.
      </td>

      <td>
        /
      </td>

      <td>
        Add funds to the card program master account to enable authorization.
      </td>
    </tr>

    <tr>
      <td>
        **R11**
      </td>

      <td>
        The budget has been frozen.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder about the frozen budget status.
      </td>
    </tr>

    <tr>
      <td>
        **R12**
      </td>

      <td>
        Transaction declined. Reap received an invalid code from client.
      </td>

      <td>
        Only applicable to clients who opt in for real-time authorization. This decline code will be returned if you don't use a code from the selected list of decline codes as a response to the authorization request webhook.
      </td>

      <td>
        Check the list of suggested decline codes and use the correct code when the transaction authorization request comes in again.
      </td>
    </tr>

    <tr>
      <td>
        **R13**
      </td>

      <td>
        The card spending limit has been exceeded.
      </td>

      <td>
        /
      </td>

      <td>
        Talk to your relationship manager to get to know further.
      </td>
    </tr>

    <tr>
      <td>
        **R14**
      </td>

      <td>
        Visa Stand-in Decline
      </td>

      <td>
        In some cases, after receiving an  `R14` in an  `authorization.advice` webhook, you may still receive a clearing event for the same transaction.

        This happens when a timeout occurs between Visa (the card network) and our processor. Visa may step in and approve the transaction (a process known as "stand-in processing"), while our processor returns a decline. Despite the decline, the transaction can proceed due to Visa’s approval, and a clearing transaction may follow.
      </td>

      <td>
        You may decide whether or not to block the customer’s balance based on your business needs and risk appetite.

        Note: Reap will not block the balance for transactions declined with `R14`.
      </td>
    </tr>

    <tr>
      <td>
        **R15**
      </td>

      <td>
        There was an issue in processing the transaction. Please try inserting the card instead of using contactless.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to retry the transaction by inserting the card into the terminal
      </td>
    </tr>

    <tr>
      <td>
        **R16**
      </td>

      <td>
        There was an issue in processing the transaction. Please try the transaction again at the same or a different terminal.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to retry the transaction at a different terminal, if possible.
      </td>
    </tr>

    <tr>
      <td>
        **R17**
      </td>

      <td>
        Real-time authorization response exceeded 1.6 seconds. Please try again later.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to retry the transaction and ensure your system can respond to authorization requests within 1.6 second.
      </td>
    </tr>

    <tr>
      <td>
        **R18**
      </td>

      <td>
        Transaction timed out. Please try again later.
      </td>

      <td>
        /
      </td>

      <td>
        Ask the cardholder to retry the transaction. Our systems will attempt to process the transaction in time.
      </td>
    </tr>

    <tr>
      <td>
        **R19**
      </td>

      <td>
        This merchant category code (MCC) is not allowed.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to use a different payment method.
      </td>
    </tr>

    <tr>
      <td>
        **R22**
      </td>

      <td>
        Funding an account belonging to the same cardholder is not allowed.
      </td>

      <td>
        /
      </td>

      <td>
        Inform the cardholder to use a different payment method or to retry the transaction again.
      </td>
    </tr>

    <tr>
      <td>
        **R23**
      </td>

      <td>
        Invalid card number. Payment token not found.
      </td>

      <td>
        Card re-tokenization required.
      </td>

      <td>
        Contact Reap support with `transactionId`.
      </td>
    </tr>
  </tbody>
</Table>

Understanding and correctly utilizing these codes ensures efficient handling of transaction declines and improves the payment experience for your customers.

<Callout icon="❗️" theme="error">
  ### Important Note for Real-Time Authorization Card Programs

  Only the codes listed [here](https://reap.readme.io/docs/response-to-real-time-authorization-request#response-codes-available-to-use) can be used by your system to send responses back to Reap's system after receiving the authorization webhook. Using any other codes from this table will result in a declined transaction with a decline code `R12` from our system.
</Callout>

***

**Related Materials**:

📖 Guide/ [Response To Real-Time Authorization Request](https://reap.readme.io/docs/response-to-real-time-authorization-request#/)

⚙️ API Reference/ [Get Transaction](https://reap.readme.io/reference/get_transactions)

⚙️ API Reference/ [Webhook/ Transaction](https://reap.readme.io/reference/webhook-eventtype-transaction#/)