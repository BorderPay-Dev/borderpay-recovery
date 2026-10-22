---
updatedAt: 2025-04-23T03:48:01.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Authorization Flow 

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

# Authorization Flow

After completing the setup, your card program is ready for cardholders to start making purchases. In this guide, we’ll walk you through how transaction authorizations are processed, using a real-life example to illustrate the standard authorization flow.

When a cardholder uses their card:

1. **Authorization Request:**

   Upon receiving the authorization request from the card processor, Reap:

   * Verifies the card's **`availableCredit`** is sufficient.
   * Evaluates predefined spending rules you configured via the API.
   * Executes internal logic, such as validating your program’s total **`availableBalance`** or the card’s status.

2. **Authorization Decision:**

   Reap sends the decision back to the card processor, which forwards the response to approve or decline the transaction. The goods or services will be released.

3. **Transaction Webhook Triggered:**

   If the transaction is authorized, Reap sends a **transaction webhook** with `eventName: authorization` and `status: PENDING` to your server.

4. **Temporary Hold on Available Balance:**

   If the transaction is authorized, Reap places a temporary hold on the equivalent transaction amount in both your card program's and the cardholder’s spending capabilities. This means that both the `availableCredit` (card level) and `availableBalance` (card program master account level) will decrease. You can verify this by retrieving the relevant endpoints: `GET card/{cardId}/credit` and `GET account/balance`. However, this is only a temporary hold, and no settlement has occurred yet.

<br />

To know more about how authorization works in the complete transaction lifecycle, read the [Transaction Scenarios  ](https://reap.readme.io/docs/transaction-scenarios)Section.

***

**Related Materials**

⚙️ API Reference/ [Webhook- Authorization](https://reap.readme.io/reference/webhook-eventtype-authorization-request#/)

⚙️ API Reference/ [Webhook- Transaction](https://reap.readme.io/reference/webhook-eventtype-transaction#/)

📖 Guide/ [Transaction Scenarios/ Lifecycle](https://reap.readme.io/docs/transaction-scenarios#/)