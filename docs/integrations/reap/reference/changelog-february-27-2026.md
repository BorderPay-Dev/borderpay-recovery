---
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# February 27, 2026

# **Update to Restricted MCC List**

## What’s Changing?

All previously blocked MCCs have been removed from the restricted list, except:

5542 — Automated Fuel Dispenser (AFD) (remains blocked)

The following MCCs are no longer automatically declined by the system:
4829, 6010, 6012, 6051, 6540, 7273, 7995, 9223.

***

## Why is this happening?

This change is required to align with card scheme requirements regarding MCCs restriction for retail BIN. Nonetheless, we have implemented this change for the commercial BIN as well.

MCC 5542 (AFD) remains restricted due to its higher operational and authorization risk profile.

***

## When is this happening?

Effective on February 27, 2026.

***

## What does this mean to you?

If you rely on our list of restricted MCCs to block transactions from specific type of merchants, we will no longer block transactions from those MCCs (except 5542 - AFD) by default.

If you wish to continue blocking any of these MCCs, real-time authorization CaaS clients can do so by declining the authorization upon receiving our authorization webhooks, which include the MCC field in the payload.

### **Need Help?**

If you have questions or need guidance, please refer to our API documentation or contact support.