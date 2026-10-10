---
updatedAt: 2025-09-29T02:04:40.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# Files 

An overview of the `files` event type.

The `files` webhook event is triggered when your requested file from the [`GET /files/{fileType}`](https://reap.readme.io/reference/get_files-filetype#/)  endpoint is ready for download. There are five possible eventName values, each corresponding to a different type of file:

There are **five** possible `eventName` values, each corresponding to a different type of file:

| `eventName`                         | File Type That Is Retrieved                                                                                                                                                                                            |
| :---------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daily_file`                        | A settlement report file detailing all transaction events that occur on a given day.                                                                                                                                   |
| `monthly_file`                      | A settlement report file contains all transaction events within a specific month.                                                                                                                                      |
| `fee_file`                          | A report detailing any fees configured in your card program (e.g., FX fees, ATM fees). Refer to the [card program fee markup fee](https://reap.readme.io/docs/issuer-fee-mark-up-dashboard#/)  guide for more details. |
| `monthly_non_transaction_fees_file` | A monthly report detailing non-transactional fees incurred up to the specified date. This includes fees such as card issuance, mobile wallet maintenance, and card maintenance fees.                                   |
| `monthly_transaction_fees_file`     | A monthly report containing only transaction-related fees incurred up to the specified date.                                                                                                                           |
| `daily_transaction_fees_file`       | A daily report containing only transaction-related fees incurred up to the specified date.                                                                                                                             |

For more details about the file type and the data you can retrieve, refer to the [Reporting](https://reap.readme.io/docs/reporting) guide.

## **What You Can Do With This Webhook**

Daily and monthly files help you **track your card program’s balance** by providing insights through **transaction events**.

Other files are useful for **monitoring the total costs** involved in **maintaining your card program**.

Read more about how to use these files in the <Anchor label="Reporting" target="_blank" href="https://reap.readme.io/docs/retrieve-monthly-invoice-billing-details-copy#/">Reporting</Anchor> guide.

***

### Sample Request Payload

```json
{
   "eventName":"daily_file",
   "eventType":"files",
   "data":{
      "link":"link: "https://reap-card-caas-files-sandbox.s3.ap-northeast-2.amazonaws.com/bf410eb8-122b-4f2e-bcff-3970899d4662/acc_i6ZhtK8I/2024/01/31/daily_acc_i6ZhtK8I_2024-01-31.csv?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA4OYT5ZTSVNU6C6Q3%2F20250212%2Fap-northeast-2%2Fs3%2Faws4_request&X-Amz-Date=20250212T041900Z&X-Amz-Expires=300&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEMz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDmFwLW5vcnRoZWFzdC0yIkgwRgIhALWLPVEPKixhz5NWgcg44P%2BkRDssZYJBJs4CEymbVEQiAiEA11YMs1cp%2FeBs3kFdiTxwFn9bDJcurmHUls4JMneagAwqoQMI5f%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARACGgw4NTYzNTA5MDM1MjUiDHCXpyPhTUi9AvucCir1Aux9B%2BuDqq1XgdxqFgRCIXYjGQNjHEGmrxXjZcYXZ%2BME6HWF3PDBzrQeCB%2FXUu3V5Pg7tgJL%2BvtGjfvN4rzSn8p%2Fy8cQ9f3fZ%2BAQrVTX4t467Zw4TMq5GwO2AMOXPWqZhuHNFDHT2qEirZzPFztfSp3KbjfA4%2BwD%2FqAllzRC%2BvtaAV8Kr4im3C6mskDQEl%2BgKdSqNTnlh2sch1%2FTA97%2FCOY4namrJoEDiSyWbo6In8IxqrimWy0jTLE0APZXUvwPxcrbqXZm2mp197pCfF0J447yf1jsZ9MUM1%2FWhdGlaX4gU4Q%2F9ulmayaHtRthqMoqJuNEZ3staMk%2F76nwvVXIXwnrlrDO6hgztTkhh2jvurMxtwKAy6blvFfQBSnO1OMqsRTmzhy2C3gdBNquwtjZqlp8IQVy7fxJ3xnzW2adTbBNMFtp4Im6Xecsc0Kv4DsSZnYUPg3X6phcDbjghxYGjCCaO2HmC%2BOPYTLdH50Pq48obbuZQhcwscKwvQY6nAGLHyl8%2B0LJDX%2FqfTPGmn7bpSE%2FKE7yrvuS71unLZCWErb6cr9gN9OZClcVayGJyybbO8ttOW7sKfYaD92c1wJomBslWuJ8OiS35GsbyrjPVn4sDI0EL7uFva7cj61q312th0ktfFbx86coDP0MF5Hh1fUVJFiDFl3jVxKX7xtwxDscIk1Jv6wRBfoJkqyFHJNc5cyi2y%2B2RrN97mM%3D&X-Amz-Signature=567d32cbee0587530b16498b2197dc64a770835aca58bb26332f834d7775fb0c&X-Amz-SignedHeaders=host&x-id=GetObject",
      "expireAt":1704327865,
      "reference_id": b120432934-234887-834989-30845
   }
}
```

### Webhook Event Fields

<Table align={["left","left","left"]}>
  <thead>
    <tr>
      <th>
        Field
      </th>

      <th>
        Description
      </th>

      <th>
        Possible Values
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        `eventName`
      </td>

      <td>
        The name of this webhook event.
      </td>

      <td>
        String
        `daily_file`|`monthly_file`|`fee_file`| `monthly_transaction_fees_file`| `daily_transaction_fees_file`|`monthly_non_transaction_fees_file`
      </td>
    </tr>

    <tr>
      <td>
        `eventType`
      </td>

      <td>
        The type of webhook event.
      </td>

      <td>
        String
        `files`
      </td>
    </tr>

    <tr>
      <td>
        `data`
      </td>

      <td>
        An object containing data related to your recent request for a settlement file.
      </td>

      <td>
        Object
      </td>
    </tr>

    <tr>
      <td>
        `data.link`
      </td>

      <td>
        The URL to download the settlement file.
      </td>

      <td>
        String
        A valid URL.
      </td>
    </tr>

    <tr>
      <td>
        `data.expireAt`
      </td>

      <td>
        The time when the file link expires, usually
        5 minutes
        after the webhook is sent. It is represented in Unix timestamp format.
      </td>

      <td>
        String
        e.g. `1704327865`
      </td>
    </tr>

    <tr>
      <td>
        `data.reference_id`
      </td>

      <td>
        The unique identifier of the settlement file that is sent
      </td>

      <td>
        String
        representing the `reference_id` (e.g., `b120432934-234887-834989-30845`)
      </td>
    </tr>
  </tbody>
</Table>