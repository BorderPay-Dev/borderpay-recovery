# Transaction email receipts

The pending-event worker passes an explicitly mapped `email_receipt` to business
and individual transaction status and wallet activity emails. The renderer uses
the same rows for HTML and plain text. Dashboard activity remains compact.

Customer-visible fields include sender, recipient, transaction/activity/deposit
IDs, payment reference, source and destination amounts/currencies, BorderPay
charge, exchange/network fees, payment rails, sender bank details, source and
destination tracking numbers, bank trace/IMAD/OMAD/UETR and blockchain hashes.
Missing provider fields are omitted. Raw webhook objects, internal wallet IDs,
credentials and internal risk metadata are not passed to the renderer.

The Bridge adapter reads each transfer receipt's explicit fee currency. On VA
settlement events, the event amount is the destination amount; source amount
comes from the source receipt. A fee percentage is taken from the event or
calculated only from a known charge and positive gross amount in the same
currency. Unknown fees are not zero. A known zero remains visible. No FX rate,
fee or source amount is invented from an outgoing settlement amount.

Review and refund emails display receipt facts without claiming settlement or
available funds. Existing event recipients, email idempotency keys, transaction
states, financial projections and balance mutations are unchanged.

The contract is provider independent; each additional provider needs its own
explicit adapter and fixture tests before its events can use these fields.

Deployment: deploy the tested `send-email` function first, then
`process-pending-events`, from the same merged commit. There is no migration or
native app build. Do not replay old financial events to populate historical
emails. Validate with synthetic worker tests and observe future deliveries.
