---
updatedAt: 2025-04-23T02:47:23.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Card Program Owner Managed Funding Model

The **Card Program Owner Managed** funding model is ideal if you want full control over the total spending power of your card program. You manage the collateral by transferring funds to a master collateral account, which holds a 1:1 ratio of your program’s total credit limit. This determines the credit lines for all cards. In this model, cardholders do not influence the program’s overall credit line.

# Example Use Cases

## **Centralised Exchange**

Centralized exchanges offer cards to their platform users, allowing them to spend with their assets. By collateralizing directly with Reap, centralized exchanges can secure a credit line for their cardholders. Using internal business logic, they can determine each cardholder’s credit limit based on the user’s account balance of various currencies held within the exchange's system.

## **Corporate Expense Management**

Companies can provide corporate cards to employees for expense management. By collateralizing directly with Reap, the company can set up an overall credit line for the entire organization. They can provide employees with company-branded cards and assign credit lines based on internal policies and employee roles.

# How to fund your card program using the Card Program Owner Managed funding method:

1. Access your Reap Card Issuing dashboard
2. Select **Prefund** from the left-side menu
3. View your card program's available balance on the **Prefund** page. This shows the total credit limit available for issuing cards.

   ![](https://files.readme.io/807dfb3-Screenshot_2023-12-29_at_2.20.48_PM.png)
4. Click the **Prefund** button to add funds and increase credit limit
5. Choose from available payment methods in the pop-up window:

   Supported currencies:

   * USD
   * HKD
   * USDC (via ETH, Polygon, Solana, TRON)
   * USDT (via ETH, Polygon, Solana, TRON)
6. Select your preferred currency for collateralization
7. View the provided bank account or wallet address for fund transfer
8. Complete the fund transfer. Once Reap’s system receives your collateral, the total credit line of your card program will be adjusted accordingly. You will receive a [prefund webhook](https://reap.readme.io/reference/webhook-events#account) confirming each successful addition to the master account.
9. If your card program opts in for <Glossary>Standard Authorization</Glossary>, you can adjust and assign individual card credit lines in the next step.

***

**Related Materials**:

📖 Guide/ [Funding model](https://reap.readme.io/docs/funding)

📖 Guide/ [Cardholder Managed Funding Model](https://reap.readme.io/docs/cardholder-managed-funding-model#/)