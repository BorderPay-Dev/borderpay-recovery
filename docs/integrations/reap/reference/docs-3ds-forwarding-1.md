---
updatedAt: 2025-05-21T01:54:58.000Z
agentTools:
  projectIndex: https://reap.readme.io/llms.txt
---

# 3DS Forwarding

Provide alternative options for you to authenticate cardholder's identity during a 3DS checkout.

During a [3D Secure](https://reap.readme.io/docs/3ds) transaction authentication, the default option to verify the cardholder’s identity is to send a one-time password (OTP) via SMS. To give you, the card program owner, more control over how cardholders are verified during a 3DS checkout, you can enable the  [3DS Forwarding](https://reap.readme.io/reference/3ds-forwarding) feature as an add-on.

By enabling 3DS Forwarding, the responsibility for sending, forwarding, and handling the 3DS authentication flow is transferred to you. This means you’re no longer limited to using only SMS as the verification method.

## Alternative methods to verify a cardholder using 3DS Forwarding

As a card program owner, you have full autonomy to design your own authentication workflow, as long as you can verify the cardholder’s identity and notify Reap of the result.

### 3DS Verification Method Comparison

<Table align={["left","left","left","left","left"]}>
  <thead>
    <tr>
      <th>
        3DS Verification Method
      </th>

      <th>
        Channel to verify
      </th>

      <th>
        Cost Structure
      </th>

      <th>
        Pros
      </th>

      <th>
        Cons
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>
        Default Option
      </td>

      <td>
        SMS only
      </td>

      <td>
        Out of the box unit cost per SMS sent
      </td>

      <td>
        Minimal configuration required
      </td>

      <td>
        Less intuitive user experience
        Requires up-to-date cardholder phone numbers
        High per-SMS cost
      </td>
    </tr>

    <tr>
      <td>
        3DS Forwarding
      </td>

      <td>
        Multiple options according to your business needs (e.g., email, app notification, in-app messaging
      </td>

      <td>
        * One-time setup fee
        * Monthly subscription fee
      </td>

      <td>
        * More reliable delivery of the authentication code
        * Full control over authentication flow
      </td>

      <td>
        * Requires additional workflow and configuration during card program setup
      </td>
    </tr>
  </tbody>
</Table>

> 🚧 3DS Fowarding
>
> 3DS Forwarding is an add-on feature. Please reach out to your Relationship Manager if you wish to activate this feature for your card program.

Read more on how 3DS Forwarding works during a 3DS checkout. Read our API reference page [3DS Forwarding](https://reap.readme.io/reference/3ds-forwarding).

***

**Related Materials**:

📖 Guide/ [3D Secure](https://reap.readme.io/docs/3ds)

⚙️ API Reference/ [3DS Forwarding API reference page](https://reap.readme.io/reference/post_cards-cardid-3ds-answer-initiateactionid#/)

⚙️ API Reference/ [Webhook/ Notification](https://reap.readme.io/reference/webhook-eventtype-notification#/)