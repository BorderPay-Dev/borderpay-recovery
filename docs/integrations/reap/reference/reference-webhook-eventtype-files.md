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
      "link":"link: "https://example.invalid/reap/sanitized-document-download",
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