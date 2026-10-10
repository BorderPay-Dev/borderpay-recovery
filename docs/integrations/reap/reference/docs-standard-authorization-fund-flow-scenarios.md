---
updatedAt: 2025-04-23T03:57:54.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Fund Flow Scenarios

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

# Standard Authorization Card Program Fund Flow Overview

This guide explains how changes in your master account affect the spending power at both the **card program** and **card levels**. It also covers how transactions at the card level impact the master account balance, and vice versa.

**Card Program Configuration:**

* Funding Model: Card Program Owner-Managed
* Authorization Model: <Glossary>Standard Authorization</Glossary>

***

## **Key Endpoints Relevant to Fund Flow Management in a Standard Authorization Card Program**

Below are the key API endpoints and their associated objects that you need to understand to manage the fund flow of your card program. These endpoints will be discussed in detail in this guide:

1. **To check the total available balance of your card program**:

   [`GET /account/balance`](https://reap.readme.io/reference/get_account-balance#/)

   <Table align={["left","left"]}>
     <thead>
       <tr>
         <th>
           Object
         </th>

         <th>
           Description
         </th>
       </tr>
     </thead>

     <tbody>
       <tr>
         <td>
           `availableBalance`
         </td>

         <td>
           The total amount available for all cardholders to spend across the account, shown in fiat currency according to your card program’s currency.

           **Remarks**: This amount includes funds allocated to individual cards as credit limits.
         </td>
       </tr>

       <tr>
         <td>
           `availableToAllocate`
         </td>

         <td>
           The remaining balance of the card program that can be allocated to cards.
         </td>
       </tr>
     </tbody>
   </Table>
2. **Check the total available balance of a specific card:**

   [`GET /card/{cardId}/credit`](https://reap.readme.io/reference/get_cards-cardid#/)

   | Object            | Description                                  |
   | :---------------- | :------------------------------------------- |
   | `availableCredit` | Indicates the card's current spending power. |
3. **Create a new card**:

   [`POST /cards`](https://reap.readme.io/reference/post_cards#/)

   | Object       | Description                                                                                                                                                      |
   | :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `spendLimit` | The initial maximum spending limit for the card at the time of creation by allocating funds from the `availableToAllocate` amount in the master account balance. |
4. **Adjust a card’s balance**:

   [`PUT /card/{cardId}/credit`](https://reap.readme.io/reference/put_cards-cardid-credit#/)

   <Table align={["left","left"]}>
     <thead>
       <tr>
         <th>
           Object
         </th>

         <th>
           Description
         </th>
       </tr>
     </thead>

     <tbody>
       <tr>
         <td>
           `adjustment`
         </td>

         <td>
           Specifies the amount to adjust the card’s balance.

           Positive values increase the `availableCredit`, raising its spending power.
           Negative values decrease the `availableCredit`, reducing its spending power.
           Note: The amount should be denominated in the card’s currency, either HKD or USD.
         </td>
       </tr>
     </tbody>
   </Table>
5. **Deleting a card**:

   [`DEL /card/{cardId}`](https://reap.readme.io/reference/delete_cards-cardid#/)

   | Object            | Description                                                                                                                    |
   | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
   | `remainingCredit` | The credit limit of the card identified by `cardId` before it was deleted.                                                     |
   | `availableCredit` | The credit limit of the card identified by `cardId` after deletion. This value should be 0 after a card is deleted by default. |

***

## **Common Fund Flow Scenarios in a Card Program with Standard Authorization**

The following scenarios illustrate the most common events that impact the balance of your overall card program as well as individual card levels.​

<Accordion title="Adding Funds to Your Card Program">
  When you fund your card program with $10,000:

  <p>
    <strong>Impact on Balances:</strong> Your master account's <code>availableBalance</code> and <code>availableToAllocate</code> should increase by $10,000 (retrieved via <strong>GET /account/balance</strong>).
  </p>

  <p>
    <strong>Note:</strong> You can learn more about the detailed transaction authorization process <a href="https://reap.readme.io/docs/program-owner-managed-funding-model#/">here</a>.
  </p>
</Accordion>

<Accordion title="Creating a New Card and Setting a Spending Capacity">
  When you create a card with a $1,000 spending limit:

  <p>
    <strong>Impact on Balances:</strong>
  </p>

  <ul>
    <li>Your master account's <code>availableToAllocate</code> decreases by $1,000 (retrieved via <strong>GET /account/balance</strong>).</li>
    <li>The card's <code>availableCredit</code> increases by $1,000 (retrieved via <strong>GET /cards/\{cardId}/credit</strong>).</li>
  </ul>
</Accordion>

<Accordion title="Cardholder Makes a Purchase">
  When a cardholder spends $100:

  <p>
    <strong>Impact on Balances:</strong>
  </p>

  <ul>
    <li>The card's <code>availableCredit</code> decreases by $100 (retrieved via <strong>GET /cards/\{cardId}/credit</strong>).</li>
    <li>Your master account's <code>availableBalance</code> decreases by $100 (retrieved via <strong>GET /account/balance</strong>).</li>
  </ul>

  <p>
    <strong>Note:</strong> You can learn more about the detailed transaction authorization process <a href="https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/">here</a>.
  </p>
</Accordion>

<Accordion title="Transaction Reversal">
  If the $100 transaction is reversed:

  <p>
    <strong>Impact on Balances:</strong>
  </p>

  <ul>
    <li>The card's <code>availableCredit</code> increases by $100 (retrieved via <strong>GET /cards/\{cardId}/credit</strong>).</li>
    <li>Your master account's <code>availableBalance</code> increases by $100 (retrieved via <strong>GET /account/balance</strong>).</li>
  </ul>

  <p>
    <strong>Note:</strong> For more details about transaction reversals, refer to <a href="https://reap.readme.io/docs/transaction-scenarios-reversal#/">this guide</a>.
  </p>
</Accordion>

<Accordion title="Transaction Refund">
  If the $100 transaction is refunded:

  <p>
    <strong>Refund Process:</strong>
  </p>

  <p>
    <strong>Impact on Balances:</strong>
  </p>

  <ul>
    <li>The card's <code>availableCredit</code> increases by $100 (retrieved via <strong>GET /cards/\{cardId}/credit</strong>).</li>
    <li>The master account's <code>availableBalance</code> and <code>availableToAllocate</code> of the card program also increase by $100 (retrieved via <strong>GET /account/balance</strong>).</li>
  </ul>

  <p>
    <strong>Note:</strong> For more details about refunds, refer to <a href="https://reap.readme.io/docs/transaction-scenarios-refund#/">this guide</a>.
  </p>
</Accordion>

<Accordion title="Deleting a Card">
  If you delete a card within your card program:

  <p>
    <strong>Impact on Balances:</strong>
  </p>

  <ul>
    <li>The master account's <code>availableToAllocate</code> increases by the remaing amount of the card (e.g., $100) (retrieved via <strong>GET /account/balance</strong>).</li>
  </ul>
</Accordion>

***

**Related Materials**

⚙️ API Reference/ [Get Master Account Balance](https://reap.readme.io/reference/get_account-balance#/)

⚙️ API Reference/ [Create Card](https://reap.readme.io/reference/post_cards#/)

⚙️ API Reference/ [Check Card Balance](https://reap.readme.io/reference/get_cards-cardid#/)

⚙️ API Reference/ [Delete Card](\[https://reap.readme.io/reference/delete_cards-cardid#/]\(https://reap.readme.io/reference/delete_cards-cardid#/\))

📖 Guide/ [Transaction Scenarios/ Lifecycle](https://reap.readme.io/docs/transaction-scenarios#/)