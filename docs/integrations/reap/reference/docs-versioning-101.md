---
updatedAt: 2025-11-11T02:55:24.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# API Versioning

Learn about API versioning and manage changes over time.

The API version determines how the API behaves and what webhooks you receive—for example, which parameters can be included in requests and what properties appear in responses. We periodically release changes to our API in our continued effort to provide clients with the best, most stable, and most customizable API experience. Some of these updates introduce breaking changes, which may require adjustments to your integration. We will always give you advanced notice, publish clear documentation, and post details on our [changelog](https://reap.readme.io/changelog).

To check which API version your company is using, go to the `Reap Dashboard` > `Settings` > `Product Settings` > `API` > `CaaS Production Configurations`.  New Reap clients automatically start on the latest version.

***

# Version Headers

Reap requires clients to include version headers during implementation and throughout their integration. Specifying the API version in the request header provides a clean and consistent way to manage versioning across endpoints. This makes it easy to identify which version is in use and simplifies future upgrades.

For every API endpoint, set the `Accept-Version` header. For example, to use version 1, assign the value `v1.0`. When version 2 is released, you would update the header to `v2.0`.

*A sample curl for the GET /transactions endpoint with the new header:*

```curl
curl --location 'https://prod.api.caas.reap.global/transactions' \
--header 'Accept-Version: v1.0' \
--header 'x-reap-api-key: {API_KEY}'
```

Below are `400 error` responses you can expect, if the `Accept-Version` header is not valid:

```json Invalid API Header
{
"code" : "1301004",
"message" : "Invalid ‘Accept-Version’ header"
}
```
```json Missing API Header
{
"code" : "1301002",
"message" : "Missing ‘Accept-Version’ header"
}
```

***

# Upgrade and Testing

If you’re using a legacy version of the API, we recommend upgrading to the latest release to benefit from new features, improvements, and ongoing support. Upgrading may change how your integration works, including:

* The parameters you can send and the objects returned in API calls
* The types and payloads of webhooks
* The structure and availability of certain endpoints

To upgrade to a new API version, take the following steps. Note that clients cannot upgrade without assistance from Reap.

1. Contact your Customer Success Manager (CSM) or Customer Success Business Partner (CSBP) for access to the new API version in your sandbox.
2. In the sandbox, complete the integration with the new API version and test thoroughly. In particular, check for:
   * **Request/response compatibility** — confirm that required parameters and returned fields still match your integration logic
   * **Error responses** — review how your application handles new or changed error codes, if any.
   * **Deprecation impacts** — identify if any endpoints, properties, or behaviors you rely on have been removed or altered
3. When you are satisfied with testing, contact Reap again for access to V2.0 on production.
4. Go live in production.

***

# Roll back your API Version

After upgrading to a new API version, both the new and previous versions remain accessible for 7 days to give you time to validate your integration. If no issues are found within this period, the older version will be permanently removed once the 7 days have passed.

If you encounter issues, you can roll back to the previous version at any time within the 7-day window to ensure your business operations continue without interruption. Once a rollback is initiated, the previous version will stay active so your integration remains functional while you test and fix issues in your sandbox.

You can perform a rollback directly from your Reap Dashboard by navigating to `Settings` → `Product Settings` → `API` → `CaaS Production Configurations`, then selecting “Roll Back.”

<Image align="center" border={false} width="300px" src="https://files.readme.io/610908b5bf27e0ef87bf77e817b1f89b6a68fe1b674cb6c9c30bd7bc573d8ba5-Screenshot_2025-11-11_at_10.54.31.png" />

We recommend completing thorough sandbox testing before upgrading to minimize the need for rollbacks.

# Deprecation of Legacy API Versions

When Reap releases a new API version, we provide a grace period where multiple API versions are supported. The amount of time varies with each upgrade, but it will always allow sufficient time for planning, testing, and deployment. We’ll always give you advance notice before retiring a legacy version.

We recommend that clients start planning their upgrade process as soon as a new version is announced. Legacy versions are not maintained indefinitely, and once deprecated, they will return errors.

As always, we welcome [your feedback](https://reap.readme.io/page/send-feedback#/)! Thanks for using Reap.