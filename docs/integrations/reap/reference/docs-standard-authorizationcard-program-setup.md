---
updatedAt: 2025-05-13T06:25:26.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Card Program Setup

Once you’ve chosen your authorization model, you can start building your card program. The following three guides will walk you through the key concepts required to successfully implement a card program with standard authorization:

<Cards columns={3}>
  <Card title="Setup Guide" href="https://reap.readme.io/docs/standard-authorizationcard-program-setup#card-program-setup-standard-authorization">
    Suggested steps to build your card program with key configurations and setup requirements.
  </Card>

  <Card title="Authorization Flow" href="https://reap.readme.io/docs/standard-authorization-authorization-flow#authorization-flow">
    An illustrated example of an authorization request and approval flow in a card program with Standard Authorization.
  </Card>

  <Card title="Card Program Fund Flow" href="https://reap.readme.io/docs/standard-authorization-fund-flow-scenarios#standard-authorization-card-program-fund-flow-overview">
    An illustration of the relationship between card balance adjustments and the card program’s master account balance when transactions are processed.
  </Card>
</Cards>

We recommend reading through all three guides to gain a comprehensive understanding of how a card program works with the standard authorization model.

***

# Card Program Setup: Standard Authorization

Once you’ve chosen your authorization model, follow the suggested steps below to start building your card program. While the sequence is not mandatory, understanding these key configurations and setup requirements is essential to ensure smooth processing of authorization requests.

## Step 1: Fund Your Program

Start by increasing your card program's spending capability by sending funds as collateral. The **`availableBalance`** represents the total spending capability of all your cards created within your card program.

* **How to send funds to your card program:** Refer to the [Funding page](https://reap.readme.io/docs/funding).
* **Check your card program’s total available balance:** `GET /account/balance`

***

## Step 2: Create Cards and Adjust Card Balance

Create a card for a cardholder using the **`POST /cards/`** endpoint. Adjust and check the card balance as needed:

<Accordion title="Adjust Balance During Card Creation">
  <ol>
    <li>
      Call the <strong><code>POST /cards</code></strong> endpoint.
    </li>

    <li>
      Put the card balance in the <code>spendLimit</code> field.
    </li>
  </ol>

  <p>
    <strong>Remarks:</strong> The <code>spendLimit</code> object represents the initial total maximum spending power of a card upon creation, it is a required field if you use Standard Authorization model. You can still adjust the card balance later by using the <strong><code>PUT /cards/\{cardId}/credit</code></strong> endpoint.
  </p>
</Accordion>

<Accordion title="Adjust Balance After Card Creation">
  <p><strong>Adjust Balance After Card Creation:</strong></p>

  <ol>
    <li>
      Call the <strong><code>PUT /cards/\{cardId}/credit</code></strong> endpoint.
    </li>

    <li>
      Use the <code>adjustment</code> field to adjust the card balance:

      <ul>
        <li>Enter a positive value to increase the credit limit.</li>
        <li>Enter a negative value to decrease the credit limit.</li>
      </ul>
    </li>
  </ol>
</Accordion>

<Accordion title="Check Card Balance">
  <p><strong>Check Card Balance:</strong></p>

  <ol>
    <li>
      Call the <strong><code>GET /cards/\{cardId}/balance-history</code></strong> endpoint to view the complete balance history of a specific card.
    </li>
  </ol>
</Accordion>

Once the card's `spendLimit` or `availableCredit` becomes positive, the card is ready for transactions.

> 📘 `spendLimit` V.S. `availableCredit`
>
> `spendLimit` and `availableCredit` both represent the **total spending capacity** of a given card. The spendLimit object is used to set the card’s balance **at the time of creation** via the `POST /cards` endpoint. On the other hand, `availableCredit` is used to adjust the card's balance **after the card has been created** via the `PUT /cards/{cardId}/credit` endpoint.

***

## Step 3: Configure Spend Controls

By default, Reap performs three core checks on your card program when a transaction authorization request is received: **card status**, **card balance**, and **card program funds**.

If you need to enforce additional spend control rules, you can use the following endpoints to configure custom controls:

1. **Card-Level Controls:** Use **`PUT /cards/{cardId}/spend-control`** to update spending limits for specific cards.
2. **Merchant-Level Controls:** Use **`POST /account/mcc-padding`** to configure padding rule for each MCC (Merchant Category Code).

***

## Step 4: Subscribe to Webhooks

To ensure you receive transaction-related webhooks, subscribe to Reap’s webhook using **`POST /webhooks`**.

> ❗️ Subscription To Webhooks
>
> You must subscribe to our webhooks to ensure you receive all transaction-related webhooks after any transaction event occurs. This is a prerequisite before your card program can go live.

***

With your card program successfully set up, you’re now ready to enable transactions for your cardholders. In the next guide, we’ll explore how the authorization flow works in a standard authorization model, followed by an explanation of how these transactions impact the overall fund flow of your card program. Continue reading to gain a complete understanding of these critical processes.

***

**Related Materials**

⚙️ API Reference/ [Create Card](https://reap.readme.io/reference/post_cards#/)

⚙️ API Reference/ [Spend control ](https://reap.readme.io/reference/put_cards-cardid-spend-control#/)

⚙️ API Reference/ [MCC Padding](https://reap.readme.io/reference/post_account-mcc-padding#/)

⚙️ API Reference/ [Subscribe To Webhook](https://reap.readme.io/reference/post_webhooks#/)

📖 Guide/ [Funding Master Account Balance](https://reap.readme.io/docs/program-owner-managed-funding-model#/)