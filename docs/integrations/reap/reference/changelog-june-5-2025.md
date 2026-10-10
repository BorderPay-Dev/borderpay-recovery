---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# June 5, 2025

# New and Improved Decline Reasons

We’re enhancing our decline code system to provide clearer, more actionable responses when transactions are declined. These changes are designed to improve visibility and help you and your cardholders respond more effectively to transaction issues.

***

## **What’s Changing?**

1. **New Decline Codes Added**

We’ve introduced new decline codes to help isolate specific issues and suggest appropriate next steps.

| New Decline Code | New Decline Reason                                                                                                        | Suggested Next Step                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| R15              | `There was an issue in processing the transaction. Please try inserting the card instead of using contactless.`           | Ask the cardholder to retry the transaction by inserting the card into the terminal                                         |
| R16              | `There was an issue in processing the transaction. Please try the transaction again at the same or a different terminal.` | Ask the cardholder to retry the transaction at a different terminal, if possible.                                           |
| R17              | `Real-time authorization response exceeded 1.6 seconds. Please try again later.`                                          | Ask the cardholder to retry the transaction and ensure your system can respond to authorization requests within 1.6 second. |
| R18              | `Transaction timed out. Please try again later.`                                                                          | Ask the cardholder to retry the transaction. Our systems will attempt to process the transaction in time.                   |

> ⚠️ **Note:** Decline code **05** will no longer be used for real-time authorization timeouts exceeding 1.6 seconds. These cases will now be classified under **R17**.

<br />

2. **Modified Decline Reasons**

We've improved several existing decline messages to make them clearer and more actionable:

| Decline Code | New Decline Reasons                                                                          | Suggested Next Step                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 59           | `The transaction has been declined due to suspected fraud.`                                  | Contact the cardholder to verify fraud and report confirmed fraud to Reap. For more information, reach out to Reap |
| 62           | `The card cannot be used for this transaction. Please try using a different payment method.` | Request the cardholder to use an alternative payment method.                                                       |
| 43           | `The card is reported stolen.`                                                               | Follow up with the cardholder to determine if a replacement card needs to be issued.                               |

***

## Why is this happening?

The decline code updates provide clearer, more specific reasons for failed transactions, helping your team resolve issues faster and with greater accuracy. This means fewer support escalations and smoother customer experiences. Ultimately, it enables you to deliver a more transparent and reliable payment journey for your end users.

***

## When is this happening?

The changes will be applied on July 2, 2025.

Please ensure your system integrations and decline code handling processes are reviewed and updated accordingly. This includes:

1. Mapping new and updated decline codes to appropriate messages in your interface
2. Any existing decline code analytics and monitoring processes

***

### **Need Help?**

If you have questions or need guidance, please refer to our API documentation or contact support.