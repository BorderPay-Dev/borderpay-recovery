---
updatedAt: 2025-02-26T02:41:47.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Account

An overview of the `prefund` event type. 

The `prefund` webhook event is triggered when Reap receives and reconciles the funds you send to your card program’s master account. This event applies only to card programs that have opted into the *Card Program Owner Managed-Funding* model.

The `adjustmentAmount` field in the webhook reflects how the recent fund deposit affects the spending power of your card program. By calling the `GET /account/balance` endpoint, you can see the impact of this adjustment on your card program’s total spending power.

## What You Can Do With This Webhook

This webhook notifies your system when Reap has reconciled the fund-in. Upon receiving it, you can begin creating cards with spending limits (for card programs using the Standard Authorization model) or processing transactions using the newly added funds (for programs using the Real-Time Authorization Funding model).

### Sample Request Payload

```json
{
  "eventName": "prefund",
  "eventType": "account",
  "data": {
    "transferDetails": {
      "cryptoAmount": "3.00000000",
      "cryptoCurrency": "USDC",
      "transactionHash": "619SWxRrmZEihX1udS2akEUoGxjpLXJg4E3F68RZonXovWtMjno2pVEsD8zzzvN2g5wHgdURzAVpFVB1867vdaXf",
      "instructionIndex": 0
    },
    "adjustmentAmount": 2.5
  }
}
```

### Webhook Event Fields

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Field
      </th>

      <th>
        Description
      </th>

      <th>
        Possible values
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        `eventName`
      </td>

      <td>
        The name of this webhook event.
      </td>

      <td>
        String
        `prefund`
      </td>
    </tr>

    <tr>
      <td>
        `eventType`
      </td>

      <td>
        The type of webhook event.
      </td>

      <td>
        String
        `account`
      </td>
    </tr>

    <tr>
      <td>
        `data`
      </td>

      <td>
        An object containing data related to your recent fund deposit into the master account balance.
      </td>

      <td>
        Object
      </td>
    </tr>

    <tr>
      <td>
        `data.transferDetails`
      </td>

      <td>
        An optional object containing details about the recent fund-in to your master account balance using cryptocurrency.
      </td>

      <td>
        Object
      </td>
    </tr>

    <tr>
      <td>
        `data.transferDetails.cryptoAmount`
      </td>

      <td>
        The amount of cryptocurrency funded into your master account balance.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        `data.transferDetails.cryptoCurrency`
      </td>

      <td>
        The type of cryptocurrency used for the fund-in.
      </td>

      <td>
        String `USDC` | `USDT`
      </td>
    </tr>

    <tr>
      <td>
        `data.transferDetails.transactionHash`
      </td>

      <td>
        The transaction hash associated with the cryptocurrency fund-in.
      </td>

      <td>
        String
      </td>
    </tr>

    <tr>
      <td>
        `data.transferDetails.instructionIndex`
      </td>

      <td>
        Used to identify and differentiate multiple transfers within a single transaction. Transfers are grouped by currency, so each transfer within the same transaction is assigned a unique instructionIndex. For example:\\
        • 55 USDC -> `0`
        • 10 USDC -> `1`
        • 23 USDT -> `0`
        • 12 USDC -> `2`
        • 16 USDT -> `1`
        • 30 USDC -> `3`
      </td>

      <td>
        Integer
      </td>
    </tr>

    <tr>
      <td>
        `data.adjustmentAmount`
      </td>

      <td>
        The amount that has been reconciled in your master account after your recent fund-in, serves as collateral to unlock the spending power of your card program and its associated cards.
      </td>

      <td>
        Number
      </td>
    </tr>
  </tbody>
</Table>