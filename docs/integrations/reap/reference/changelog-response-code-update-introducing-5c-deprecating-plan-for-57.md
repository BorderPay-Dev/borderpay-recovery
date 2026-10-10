---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# August 7, 2025

## **Response Code Update: Introducing 5C, Deprecating Plan for 57**

We're introducing support for the new VISA Response Code 5C ("Transaction not supported / blocked by issuer") and implementing a strategy to replace Response Code 57 ("Transaction not permitted to cardholder") to comply with VISA's new classification of error codes.

## **What’s Changing?**

### Key Changes

* **New Response Code Support:** The platform now supports Response Code 5C in Authorization Response messages
* **Backward Compatibility:** Response Code 57 will be temporarily mapped to 5C in Authorization response messages to VISA to maintain backward compatibility until Response Code 57 deprecation
* **Deprecation of Response Code 57**: Response Code 57 will be deprecated from the list of supported response code in Authorization Webhook API Response

## Why is this happening?

From October 18, 2025, VISA will reclassify Response Code 57 as a generic response code decline, which will count towards Generic Code Excessive Usage Fees, and it will be reserved for Visa and Visa services only. This change is part of VISA's April 2025 Global Technical Letter initiative to improve the specificity of authorization response codes.

**All issuers are advised to use Response Code 5C (Transaction not supported/blocked by issuer) instead of Response Code 57 (Transaction not permitted to cardholder)**.

## When is this happening?

| **Date**         | **Change**                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| August 7, 2025   | Initial rollout with dual support for Response Codes 57 and 5C                |
| October 1, 2025  | Feature flag enabled to map Response Code 57 to 5C in outgoing messages       |
| November 1, 2025 | Deprecation of Response Code 57 support in Authorization Webhook API Response |

## What does this mean for you?

Please ensure your system integrations and decline code handling processes are reviewed and updated accordingly.

* Begin using Response Code 5C instead of 57 in your Authorization Webhook Responses
* Update any internal systems that process response codes to recognize and handle Response Code 5C
* Test your implementation to ensure smooth transition
* Please take note that you might still receive response code 57 in Transaction Webhook since it is still a valid code that might be used by Visa and Visa’s internal systems.

## **Need Help?**

If you have questions or need guidance, please refer to our API documentation or contact support.