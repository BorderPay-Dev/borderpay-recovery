---
updatedAt: 2026-05-14T19:46:09.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Transaction Scenarios/ Lifecycle

Understanding transaction scenarios is crucial for all card program owners aiming to build a successful card program. Within a transaction lifecycle, there are various events or stages—<Glossary>Authorization</Glossary>, <Glossary>Clearing</Glossary>, <Glossary>Reversal</Glossary>, <Glossary>Refund</Glossary>. While not every transaction undergoes all these stages, understanding their concepts and implications is essential.

In this section, we explore the most common transaction scenarios, offering a detailed overview of how each is managed within our API framework and providing actionable insights to help you optimize your card program.

## Common Transaction Scenarios Types

<Cards columns={2}>
  <Card title="Authorized Transaction with Clearing" href="https://reap.readme.io/docs/transaction-scenarios-authorized-transaction-with-clearing#/">
    Transactions that include both an authorization event and a subsequent clearing event.
  </Card>

  <Card title="Authorization Reversal" href="https://reap.readme.io/docs/transaction-scenarios-reversal#/">
    Transactions where an authorization event occurs but is later followed by a reversal event.
  </Card>

  <Card title="Refund" href="https://reap.readme.io/docs/transaction-scenarios-refund#/">
    Transactions with an authorization event, followed by a refund event instead of clearing.
  </Card>

  <Card title="Direct Clearing" href="https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/">
    Transactions that are cleared directly with or without prior authorization approval. This process is also known as an "Offline Transaction."
  </Card>

<Card title="Partial Clearing" href="https://reap.readme.io/update/docs/partial-clearing#/">
  Transactions where the final cleared amount is lower than the original authorized amount. The unused authorized amount is released back to the available balance, while the cleared amount is moved to outstanding balance.
</Card>

</Cards>

***

**Related Materials**:

📖 Guide/ [Transaction Authorization](https://reap.readme.io/docs/authorization)

📖 Guide/ [Transaction Scenarios/ Reversal Of Authorized Transaction](https://reap.readme.io/docs/transaction-scenarios-reversal#/)

📖 Guide/ [Transaction Scenarios/ Refund](https://reap.readme.io/docs/transaction-scenarios-refund#/)

📖 Guide/ [Transaction Scenarios/ Direct Clearing](https://reap.readme.io/docs/transaction-scenarios-direct-clearing#/)

📖 Guide/ [3D Secure](https://reap.readme.io/docs/3ds)

📖 Guide/ [Chargeback ](https://reap.readme.io/docs/chargeback)