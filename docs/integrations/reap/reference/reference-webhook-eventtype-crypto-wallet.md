---
updatedAt: 2025-02-14T09:16:35.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Crypto Wallet 

An overview of the `crypto_wallet` event type.

If your card program opts into the <Glossary>Cardholder Managed Funding Model</Glossary>, the `crypto_wallet` webhook is triggered whenever a card balance changes due to a fund-in or withdrawal.

| Webhook eventName          | Scenario                     | Description                                       |
| -------------------------- | ---------------------------- | ------------------------------------------------- |
| `wallet_top_up`            | Fund-in to card balance      | Triggered when funds are added to a card balance. |
| `wallet_withdrawal`        | Withdrawal from card balance | Triggered when a withdrawal is successful.        |
| `wallet_withdrawal_failed` | Withdrawal failure           | Triggered when a withdrawal request fails.        |

## **What You Can Do With This Webhook**

This webhook is useful for sending real-time notifications to cardholders when their card balance is updated. It provides essential details such as the adjustment amount, currency, and transaction details, helping users track their funding and withdrawals effectively.

***

## Increase in card balance: `wallet_top_up`

The `wallet_top_up` webhook is triggered whenever a fund-in is reconciled by Reap and there is an increase in a card's balance.

### Sample Request Payload

```json
{
  "eventName": "wallet_top_up",
  "eventType": "crypto_wallet",
  "cardID": "1dbc55e1-d42f-41a3-bdd7-97623f06c1dc",
  "data": {
    "amount": "4.94",
    "wallet": {
      "address": "0x8E034fA79cD73D067F394a7B6695ABfbE534FdC2",
      "network": "Polygon"
    },
    "txnHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "currency": "USD"
  }
```

### Webhook Event Fields

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Description
      </th>

      <th style={{ textAlign: "left" }}>
        Possible values
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        `eventName`
      </td>

      <td style={{ textAlign: "left" }}>
        The name of this webhook event.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `wallet_top_up`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `eventType`
      </td>

      <td style={{ textAlign: "left" }}>
        The type of webhook event.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `crypto_wallet`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `cardId`
      </td>

      <td style={{ textAlign: "left" }}>
        The unique identifier of the card whose balance is adjusted after the cardholder sends funds to the card’s dedicated wallet address.
      </td>

      <td style={{ textAlign: "left" }}>
        String
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data`
      </td>

      <td style={{ textAlign: "left" }}>
        An object containing details about the fund-in transaction.
      </td>

      <td style={{ textAlign: "left" }}>
        Object
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.amount`
      </td>

      <td style={{ textAlign: "left" }}>
        The amount by which the card balance has increased.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `4.94`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet`
      </td>

      <td style={{ textAlign: "left" }}>
        An object containing details about the wallet used for the fund transfer.
      </td>

      <td style={{ textAlign: "left" }}>
        Object
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet.address`
      </td>

      <td style={{ textAlign: "left" }}>
        The wallet address that received the funds.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `0x8E034fA79cD73D067F394a7B6695ABfbE534FdC2`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet.network`
      </td>

      <td style={{ textAlign: "left" }}>
        The blockchain network used to send funds to the card.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `Polygon`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.hxnHash`
      </td>

      <td style={{ textAlign: "left" }}>
        The transaction hash of the fund-in transaction.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.currency`
      </td>

      <td style={{ textAlign: "left" }}>
        The currency of the card.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `USD`| `HKD`)
      </td>
    </tr>
  </tbody>
</Table>

***

## Decrease In Card Balance: `wallet_withdrawal`

The `wallet_withdrawal` or `wallet_withdrawal_failed` webhook will be triggered whenever a cardholder **initiates a withdrawal** from their card balance to an **external wallet**.

**There are two possible value of the event names**:

* `wallet_withdrawal` – Triggered when a withdrawal is **successful**.
* `wallet_withdrawal_failed` – Triggered when a withdrawal **fails**.

### Sample Request Payload

```json
{
  "eventName": "wallet_withdrawal",
  "eventType": "crypto_wallet",
  "cardID": "1dbc55e1-d42f-41a3-bdd7-97623f06c1dc",
  "data": {
    "amount": "203.45",
    "wallet": {
      "address": "0x8E034fA79cD73D067F394a7B6695ABfbE534FdC2",
      "network": "Polygon"
    },
    "txnHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "currency": "USD"
  }
```

### Webhook Event Fields

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th style={{ textAlign: "left" }}>
        Field
      </th>

      <th style={{ textAlign: "left" }}>
        Description
      </th>

      <th style={{ textAlign: "left" }}>
        Possible values
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{ textAlign: "left" }}>
        `eventName`
      </td>

      <td style={{ textAlign: "left" }}>
        The name of this webhook event.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `wallet_withdrawal`| `wallet_withdrawal_failed`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `eventType`
      </td>

      <td style={{ textAlign: "left" }}>
        The type of webhook event.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `crypto_wallet`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `cardId`
      </td>

      <td style={{ textAlign: "left" }}>
        The unique identifier of the card whose balance is adjusted after the cardholder sends funds to the card’s dedicated wallet address.
      </td>

      <td style={{ textAlign: "left" }}>
        String
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data`
      </td>

      <td style={{ textAlign: "left" }}>
        An object containing details about the withdrawal.
      </td>

      <td style={{ textAlign: "left" }}>
        Object
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.amount`
      </td>

      <td style={{ textAlign: "left" }}>
        The amount withdrawn from the card balance in card currency.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `4.94`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet`
      </td>

      <td style={{ textAlign: "left" }}>
        An object containing details about the destination wallet.
      </td>

      <td style={{ textAlign: "left" }}>
        Object
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet.address`
      </td>

      <td style={{ textAlign: "left" }}>
        The wallet address receiving the withdrawn funds.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `0x8E034fA79cD73D067F394a7B6695ABfbE534FdC2`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.wallet.network`
      </td>

      <td style={{ textAlign: "left" }}>
        The blockchain network used for the withdrawal.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `Polygon`
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.hxnHash`
      </td>

      <td style={{ textAlign: "left" }}>
        The transaction hash of the withdrawal.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `data.currency`
      </td>

      <td style={{ textAlign: "left" }}>
        The currency of the card.
      </td>

      <td style={{ textAlign: "left" }}>
        String (e.g. `USD"`, `HKD`)
      </td>
    </tr>

    <tr>
      <td style={{ textAlign: "left" }}>
        `failedReason`
      </td>

      <td style={{ textAlign: "left" }}>
        If `eventName` is `wallet_withdrawal_failed`, this field provides the reason for the failure.
      </td>

      <td style={{ textAlign: "left" }}>
        String
        `An unexpected error occurred. Please try again later.`| `The request took too long to process. Please try again later.`| `Invalid address format. Please check the withdrawal wallet address and try again.` | `AMOUNT_TOO_SMALL`
      </td>
    </tr>
  </tbody>
</Table>

For more details on how <Glossary>Cardholder Managed Funding Model</Glossary> works and how to handle webhook notifications, refer to the [Cardholder-Managed Funding](https://reap.readme.io/update/docs/cardholder-managed-funding-model#/)  guide.