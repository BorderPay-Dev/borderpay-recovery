---
updatedAt: 2025-03-24T04:19:28.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Card Status

Learn how does card statuses transition and what they mean due to various scenarios.

By default, all cards created using the **POST /cards** endpoint are in an **`active`** state. Transactions will **not** be processed if the card status is not `active`.

This guide explains:

* The different **card statuses** and what triggers them.
* How to **check card status** via API.
* How to **reactivate cards** to allow transactions.

***

# **Reasons for Non-Active Card Status**

1. **Security-Triggered Statuses**
   * **Blocked**: Automatically triggered after multiple failed authentication attempts or manually blocked due to suspected fraud.
   * **Frozen**: Temporarily deactivated by the cardholder to prevent unauthorized usage (e.g., misplaced card). Can be unfrozen when needed.
2. **Lifecycle-Related Statuses**
   * **Expired**: The card has reached its expiration date and needs to be replaced.
   * **Inactive**: A replacement card has already been created, causing the original physical card to become inactive. Alternatively, if a card is created manually and the KYC verification is incomplete, it will remain inactive.
3. **Permanently Deactivated Statuses**
   * **Deleted**: The card has been permanently removed from the system and cannot be recovered. A new card must be issued if needed.

***

# **Card Statuses & How to Reactivate Them**

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Card Status
      </th>

      <th>
        Trigger Action
      </th>

      <th>
        How to Reactivate
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        BLOCK
      </td>

      <td>
        * Reap blocks the card after three consecutive failed attempts to enter sensitive information (card PIN, CVV, expiry date).
        * Manually blocked using `PUT /cards/\{cardId\}/block`.
      </td>

      <td>
        Use `PUT /cards/\{cardId\}/unblock` to reactivate the card.
      </td>
    </tr>

    <tr>
      <td>
        DELETED
      </td>

      <td>
        The card is permanently removed using `DELETE /cards/{cardId}`.
      </td>

      <td>
        No action is needed (The card is permanently deleted).
      </td>
    </tr>

    <tr>
      <td>
        EXPIRED
      </td>

      <td>
        The card reaches its expiration date.
      </td>

      <td>
        Issue a new card using `PUT /cards/\{cardId\}/replace`.
      </td>
    </tr>

    <tr>
      <td>
        FROZEN
      </td>

      <td>
        The cardholder manually freezes the card via PUT /cards/\{cardId}/status.
      </td>

      <td>
        Unfreeze using `PUT /cards/\{cardId\}/status`.
      </td>
    </tr>

    <tr>
      <td>
        INACTIVE
      </td>

      <td>
        * A new set of card details (card PAN, CVV, expiry date) is created using the `PUT /cards/\{cardId\}/status`, if the cardholder uses the original physical card for a transaction, it will be declined and the card status will be `inactive`.
        * The card was created manually, but KYC verification was not completed.
      </td>

      <td>
        * No action is needed if a new replacement card is already issued.
        * Use `PUT /cards/\{cardId\}/identity` to activate the card if KYC verification is completed.
      </td>
    </tr>

    <tr>
      <td>
        ACTIVE
      </td>

      <td>
        * Upon card creation using POST /cards
      </td>

      <td>
        NA
      </td>
    </tr>
  </tbody>
</Table>

***

# **How to Check Card Status via API**

1. **Retrieve the Card Status**
   * Call the [`GET /cards/\{cardId\}`](https://reap.readme.io/reference/get_cards-cardid#/)  endpoint to check the card’s status.
   * The response includes the `status` field and, if applicable, `freezeReason` or `statusReason` fields.
2. **Transaction Declined Due to Inactive Card**
   * When a transaction **authorization request** is received, Reap will check if the card status allows processing.
   * If the card is **not active**, the authorization request will be **declined**.
   * Your system will receive a `transaction` webhook with `eventName=authorization.advice` and `status=decline`.
3. **Retrieve a Declined Transaction**
   * If a transaction is declined due to an **inactive card**, you can check the reason using the [`GET /transactions/\{transactionid\}`](https://reap.readme.io/reference/get_transactions-transactionid#/)  endpoint.
   * The `decline_reason` field will indicate that the card status is not active.

***

# **Common Confusion About Card Statuses**

## **1. Difference Between`cardStatus` and `physicalCardStatus`**

* **`cardStatus`**: Defines whether the card can be used for transactions.
* **`physicalCardStatus`**: Refers to the production and shipping status of a **physical** card (e.g., printing, embossing, delivery).

## **2. Difference Between Frozen and Blocked Cards**

| **Aspect**               | **Frozen Card**                                                                                        | **Blocked Card**                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**              | Temporary restriction (e.g., lost card, security concern).                                             | Security measures for fraud, compliance, or risk-related issues.                                                                                                                                                        |
| **Who Can Initiate**     | - **Cardholder** via UI.  - **Operations Team** (on behalf of the client).                             | - Your **Operations Team** only (manual intervention required).                                                                                                                                                         |
| **Reactivation**         | Can be **unfrozen** by the cardholder to resume transactions.                                          | Only the **operations team** can **unblock** the card.                                                                                                                                                                  |
| **How to Implement**     | Use [`PUT /cards/\{cardId\}/status`](https://reap.readme.io/reference/put_cards-cardid-status#/)  API. | Use [`PUT /cards/\{cardId\}/block`](https://reap.readme.io/reference/put_cards-cardid-block#/)  to block, and [`PUT /cards/{cardId}/unblock`](https://reap.readme.io/reference/put_cards-cardid-unblock#/)  to unblock. |
| **Automatic Trigger**    | No automatic triggers.                                                                                 | Triggered after **three failed authentication attempts** (PIN, CVV, expiry date).                                                                                                                                       |
| **Webhook Notification** | No webhook notification.                                                                               | A webhook event with `eventType=card` will be received when the card is blocked by Reap.                                                                                                                                |

***

# **Summary**

* All cards are **active** by default upon creation.
* A card may become **non-active** due to security measures, lifecycle events, or permanent deactivation.
* The [**GET /cards/\{cardId}**](https://reap.readme.io/reference/get_cards-cardid#/)  endpoint can be used to check the card’s status.
* The **PUT** and **DELETE** API endpoints can be used to reactivate or replace cards when necessary.
* A **frozen** card is **temporarily disabled** by the cardholder, while a **blocked** card is disabled due to **security reasons**.

By understanding and managing **card statuses** effectively, you can ensure smooth transaction processing and minimize disruptions.

***

**Related Materials:**

⚙️ API Reference/ [Retrieve Card](https://reap.readme.io/reference/get_cards-cardid#/)

⚙️ API Reference/ [Get Single Transaction](https://reap.readme.io/reference/get_transactions-transactionid#/)