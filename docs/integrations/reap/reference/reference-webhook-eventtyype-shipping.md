---
updatedAt: 2025-10-09T03:03:08.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Shipping (Idemia)

Understand the `shipping` webhook for clients using Idemia for card shipping.

The `shipping.shipping_order_confirmation` webhook provides information about physical cards and their assigned Stock-Keeping Units (SKUs). The SKU enables easy card identification for further processing (like last-mile delivery) without opening the packaging.

### Sample Webhook

```json
{
    "eventName": "shipping_order_confirmation",
    "eventType": "shipping",
    "data": {
        "shipment": [
            {
                "sku": "11122233",
                "card_id": "0001edbd-64f3-4942-a867-0ac44ead10f3",
            },
            {
                "sku": "11122244",
                "card_id": "00048ed7-c496-4315-aa90-62efc728be61",
            }
        ]
    }
}
```

### Webhook Event Fields

| **Field**               | **Description**                                                                                                                                                                                                                                                                                                                                                                        | **Possible values**                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `eventName`             | The name of this webhook event.                                                                                                                                                                                                                                                                                                                                                        | String `shipping_order_confirmation`                 |
| `eventType`             | The type of webhook event.                                                                                                                                                                                                                                                                                                                                                             | String `shipping`                                    |
| `data`                  | An object containing data related the shipping of the physical cards.                                                                                                                                                                                                                                                                                                                  | Object                                               |
| `data.shipment`         | An object containing all the physical cards that will be sent within one shipment order.                                                                                                                                                                                                                                                                                               | Object                                               |
| `data.shipment.sku`     | The Stock-Keeping Unit (SKU) is a unique identifier printed on the packaging of each embossed physical card, allowing for easy identification and shipment verification. This ensures the card is matched with the correct cardholder for processing, such as last-mile delivery, and dispatched correctly, all without needing to open and compromise the integrity of the packaging. | String (e.g. `1546456`)                              |
| `data.shipment.card_id` | The unique identifier of the shipped card.                                                                                                                                                                                                                                                                                                                                             | String (e.g. `00048ed7-c496-4315-aa90-62efc728be61`) |

> 🚧 The shipping webhook **will not be** triggered in certain cases:
>
> Expedited shipping will not trigger the shipping webhook.