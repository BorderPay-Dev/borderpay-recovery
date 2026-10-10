---
updatedAt: 2025-10-23T07:20:08.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Shipping (Thales)

Understand the `shipping` webhook for clients using Thales for card shipping.

The `shipping` webhook is triggered when the Shipping end point is called. There are 2 types of shipping messages with 2 distinct `eventNames`.

| **Event Name**                      | **Description**                                     | **Triggered by**                                               |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `shipping.card_production_tracking` | Shows the physical card production status           | Triggered when the card is shipped via the shipping endpoints. |
| `shipping.card_shipping_tracking`   | Shows the physical card shipping status and details | Triggered when the card is shipped via the shipping endpoints. |

<br />

### Sample Production Tracking Webhooks

```json Individual Shipments
{
  "eventName": "card_production_tracking",
  "eventType": "shipping",
  "data": {
    "status": "CARD_PRODUCTION_REQUESTED",
    "card_id": "ea941896-cf24-443a-8ec6-b5308586ff99"
  }
}
```
```json Bulk Shipments
{
  "eventName": "card_production_tracking",
  "eventType": "shipping",
  "data": {
    "status": "CARD_IN_PRODUCTION",
    "card_id": "859ed84e-96cc-408f-be88-123df4f04fc5",
    "bulkship_id": "2f60586f-cc33-4902-a363-b2a630246522"
  }
}
```

### Production Tracking Event Fields

| Field          | Description                                                                                    | Possible values                                                                                                                                                                                                  |
| :------------- | :--------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventName`    | The name of this webhook event.                                                                | String `card_production_tracking`                                                                                                                                                                                |
| `eventType`    | The type of webhook event.                                                                     | String `shipping`                                                                                                                                                                                                |
| `data`         | An object containing data related to the shipping of the physical cards.                       | Object                                                                                                                                                                                                           |
| `data.card_id` | The unique identifier of the shipped card.                                                     | String (e.g.`00048ed7-c496-4315-aa90-62efc728be61`)                                                                                                                                                              |
| `data.status`  | The current shipping status of the physical card.                                              | Possible values: `NOT_PHYSICAL_CARD`, `CARD_NOT_ORDERED`, `CARD_PRODUCTION_REQUESTED`, `CARD_IN_PRODUCTION`, `CARD_PRODUCTION_COMPLETED`, `CARD_ACTIVATED`, `CARD_PRODUCTION_CANCELED`, `CARD_PRODUCTION_ONHOLD` |
| `bulkship_id`  | The unique identifier of the bulk shipment (only used when the client ships an order in bulk). | String (e.g. `d4a8e732-1f9b-4c6a-8e21-3b9f7a4d2c5b`)                                                                                                                                                             |

### Sample Shipping Tracking Webhook

```json Individual Shipments
{
  "eventName": "card_shipping_tracking",
  "eventType": "shipping",
  "data": {
    "sku": "5ef03166-d3f4-41bc-bbd2-f8831a897223",
    "status": "CARD_OUT_FOR_DELIVERY",
    "card_id": "5ef03166-d3f4-41bc-bbd2-f8831a897223",
    "courier": {
      "name": "DHL",
      "type": "COURIER"
    },
    "tracking_url": "https://www.dhl.com/br-pt/home/tracking/tracking-express.html?submit=1&amp;tracking-id=4804055852",
    "tracking_number": "4804055852"
  }
}
```
```json Bulk Shipments
{
  "eventName": "card_shipping_tracking",
  "eventType": "shipping",
  "data": {
    "sku": "5ef03166-d3f4-41bc-bbd2-f8831a897223",
    "status": "CARD_OUT_FOR_DELIVERY",
    "card_id": "5ef03166-d3f4-41bc-bbd2-f8831a897223",
    "courier": {
      "name": "DHL",
      "type": "COURIER"
    },
		"bulkship_id": "06bbfbc4-6f2a-43de-a640-9f9c23253a9b",
    "tracking_url": "https://www.dhl.com/br-pt/home/tracking/tracking-express.html?submit=1&amp;tracking-id=4804055852",
    "tracking_number": "4804055852"
  }
}
```

### Shipping Tracking Event Fields

| Field                  | Description                                                                                    | Possible values                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eventName`            | The name of this webhook event.                                                                | String `card_shipping_tracking`                                                                                                                                                                                               |
| `eventType`            | The type of webhook event.                                                                     | String `shipping`                                                                                                                                                                                                             |
| `data`                 | An object containing data related to the shipping of the physical cards.                       | Object                                                                                                                                                                                                                        |
| `data.card_id`         | The unique identifier of the shipped card.                                                     | String (e.g.`00048ed7-c496-4315-aa90-62efc728be61`)                                                                                                                                                                           |
| `data.sku`             | The unique identifier of the shipped card (`card_id`)                                          | String (e.g.`00048ed7-c496-4315-aa90-62efc728be61`)                                                                                                                                                                           |
| `data.status`          | The current shipping status of the physical card.                                              | Possible values: `CARD_SHIPPING_REQUESTED`, `CARD_SHIPPING_INFO_AVAILABLE`, `CARD_IN_TRANSIT`, `CARD_OUT_FOR_DELIVERY`, `CARD_DELIVERED`, `CARD_SHIPPING_ATTEMPT_FAILED`, `CARD_SHIPPING_EXCEPTION`, `CARD_SHIPPING_CANCELED` |
| `data.courier`         | The service provider that is chosen to deliver the cards.                                      | Object                                                                                                                                                                                                                        |
| `data.courier.type`    | The type of courier                                                                            | Possible values: `FEDEX`, `DHL`, `POSTAL`                                                                                                                                                                                     |
| `data.courier.name`    | The name of the courier.                                                                       | For `POSTAL` type couriers, name may not be available.                                                                                                                                                                        |
| `data.tracking_number` | The unique number that is used to track the shipment.                                          | String                                                                                                                                                                                                                        |
| `data.tracking_url`    | The URL that can be used to track the shipment online.                                         | String                                                                                                                                                                                                                        |
| `bulkship_id`          | The unique identifier of the bulk shipment (only used when the client ships an order in bulk). | String (e.g. `d4a8e732-1f9b-4c6a-8e21-3b9f7a4d2c5b`)                                                                                                                                                                          |