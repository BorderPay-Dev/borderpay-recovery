# Yellow Card public API review for BorderPay

Reviewed 3 October 2026. Production implementation target; no additional environment or live payment is created by this documentation update. Product access is enabled by Yellow Card separately from this engineering work.

This review covers all 135 pages in the published index: 47 guides, 69 API references, nine recipes and ten changelog entries. All pages were retrieved successfully, and 69 functional OpenAPI operations were extracted. `public-docs-index.json` records retrieval results, dates and hashes. `public-openapi-sources.json` preserves the functional reference schemas with their original source URLs, without combining conflicting operations into an invented specification. Retrieved documentation is evidence of a published contract, not proof of account entitlement or a successful integration test.

## Selected scope

| Area | BorderPay implementation | Public reference |
| --- | --- | --- |
| Named accounts | USD ACH/Wire/SWIFT; EUR SEPA; GBP Faster Payments. Additional outgoing SWIFT routes only where enabled. Preserve account holder, currency, account number/IBAN, routing/sort code and bank details returned by the provider. | [Virtual accounts](https://docs.yellowcard.engineering/docs/virtual-accounts), [VA sends](https://docs.yellowcard.engineering/docs/initiating-sends) |
| Fiat balances | One merchant-bound sub-wallet per required currency; spendable balance belongs to the sub-wallet. VA instructions are not another balance. | [Create wallet](https://docs.yellowcard.engineering/reference/create-sub-wallet), [wallet lookup](https://docs.yellowcard.engineering/reference/get-sub-wallet-by-sequence) |
| Custody | Merchant-specific vaults and deposit addresses; USDC, EURC and USDT only where the enabled asset/network configuration supports them. Preserve memo/tag requirements. | [Wallet infrastructure](https://docs.yellowcard.engineering/docs/wallet-infrastructure-guide), [asset config](https://docs.yellowcard.engineering/reference/get-crypto-config) |
| African rails | Retain existing collections and bank/mobile-money payouts. Resolve channels, networks, currencies, recipient requirements and limits dynamically. | [Send](https://docs.yellowcard.engineering/reference/submit-send), [receive](https://docs.yellowcard.engineering/reference/submit-receive), [country configuration](https://docs.yellowcard.engineering/reference/get-country-config) |
| Bank and crypto payouts | Separate local-channel send, VA-funded send and custody-send contracts. Persist source ownership, destination details, quote/fee context and sequence ID before provider submission. | [USD/EUR recipe](https://docs.yellowcard.engineering/recipes/submit-your-first-usdeur-send-request), [custody send](https://docs.yellowcard.engineering/reference/create-send), [crypto send](https://docs.yellowcard.engineering/reference/initiate-crypto-conversion) |
| Conversion within payments | Use direct settlement or other agreed conversion routes inside the existing payment flow; preserve both legs and rate provenance. RFQ accept/expiry controls are required when the provider requires a trader quote. No new exchange screen. | [Direct settlement](https://docs.yellowcard.engineering/docs/direct-settlement), [RFQ](https://docs.yellowcard.engineering/docs/request-for-quote), [eligibility](https://docs.yellowcard.engineering/reference/check-eligibility) |
| Fees | Read service/partner fee configuration and network fees; reconcile quoted versus settled costs. Existing BorderPay pricing is not overwritten by example rates or assumed revenue-share terms. | [Fee configuration](https://docs.yellowcard.engineering/reference/get-transaction-fee-config), [network fee](https://docs.yellowcard.engineering/reference/estimate-fee) |
| Records and receipts | Build BorderPay receipts/statements from authoritative transaction lookups, amounts, currency, fees, status, settlement references and on-chain hash where present. Do not invent a provider PDF download route. | [Send lookup](https://docs.yellowcard.engineering/reference/get-send), [receive lookup](https://docs.yellowcard.engineering/reference/get-receive), [custody lookup](https://docs.yellowcard.engineering/reference/get-custody-send), [reconciliation](https://docs.yellowcard.engineering/reference/get-consolidated-recon) |
| Operations | Webhooks plus polling reconciliation, cancellation/refund controls, failed-payment handling, liquidity alerts and provider-specific access restrictions. | [Webhooks](https://docs.yellowcard.engineering/docs/webhooks-api), [events](https://docs.yellowcard.engineering/docs/events-api), [refunds](https://docs.yellowcard.engineering/docs/cancellation-refunds-collection-requests) |

Do not implement retail/Tier-0 onboarding, hosted consumer buy/sell widgets, additional unsupported assets, a customer FX screen, or Treasury Portal SSO as part of this release. Latin-American receive-account issuance and additional Asian corridors remain documented but deferred until explicitly selected and entitled. Sandbox simulation endpoints remain test references and must never be allowed on a production financial path.

## KYC metadata and business identity

Sources: [KYC metadata](https://docs.yellowcard.engineering/docs/kyc-metadata), [send schema](https://docs.yellowcard.engineering/reference/submit-send), [receive schema](https://docs.yellowcard.engineering/reference/submit-receive).

- Standard sends and receives expose `customerType: institution` and institution party fields `businessName` and `businessId`. Use the business path; never default to `retail`.
- The separate VA-funded send guide explicitly uses a different request shape without `customerType` or `purposeOfRemittance`. Business eligibility remains enforced by BorderPay; do not inject unsupported fields merely to label the request.
- Keep stable merchant/provider bindings and `customerUID` where documented. Provider partner identifiers and webhook `userId` are not BorderPay end-user identifiers.
- Preserve company identity, registration number, registered/operating address, authorized person, ownership evidence and source-of-funds information from BorderPay KYB. Send only the required, permitted data for the operation.
- Person metadata includes name, country, address, phone, email, birth date and identity document information. Do not assign a date of birth to a company, substitute incorporation date for a person's DOB, or split a legal company name into an invented individual's name.
- The metadata guide uses `mm/dd/yyyy`, while current reference schemas describe `YYYY-MM-DD`. Resolve this per enabled API operation with YC; preserve canonical dates internally.
- The metadata guide says Nigerian participants require NIN and BVN. Confirm how these apply to institutional parties and their representatives before enforcing either as a corporate registration number.
- Tier-0 reduced KYC is explicitly a retail feature. Its small transaction/lifetime limits are irrelevant to BorderPay's business-only onboarding and must not be used as a shortcut.
- The guide says underlying document copies can be requested in an official customer case. Keep source evidence retrievable securely; this is not proof that full business/UBO onboarding has a published document-upload API.

## Custody identity callback

Sources: [Travel rule callback](https://docs.yellowcard.engineering/docs/the-travel-rule-webhook), [callback contract](https://docs.yellowcard.engineering/reference/create-callback-config), [required travel-rule fields](https://docs.yellowcard.engineering/reference/get-travel-rule-config).

The identity callback and transaction notifications are different contracts. The callback requests the owner of a vault and needs a response within ten seconds. Verify its raw-body HMAC and allowed key ID; resolve an existing unique merchant/vault binding; return only the agreed verified identity. Unknown vaults fail closed. Missing/failed callbacks can stop a send.

The documented response uses personal name fields while vault documentation permits a legal entity. YC must confirm the corporate originator/representative mapping, evidence requirements and data-sharing basis. Do not manufacture person metadata to satisfy the schema. Registering a callback can replace the partner-wide configuration: inspect the existing configuration and coordinate any change.

## Webhooks and financial events

Sources: [Webhook contract](https://docs.yellowcard.engineering/docs/webhooks-api), [VA events](https://docs.yellowcard.engineering/docs/webhooks), [event lifecycle](https://docs.yellowcard.engineering/docs/events-api).

1. Verify `X-YC-Signature` as base64 HMAC-SHA256 over the original request bytes. Select secrets only from a configured key-ID allowlist; do not let incoming `apiKey` select an arbitrary secret. API request signing uses a different timestamp/path/method scheme.
2. Persist an authenticated event before acknowledgement and process asynchronously. Retain the raw event hash and provider/environment/transaction identity. Reject unrecognized ownership mappings rather than crediting a default merchant.
3. New event families include `SEND`, `RECEIVE`, `CRYPTO_SEND`, `CRYPTO_RECEIVE`, `CONVERT`, `CUSTODY` and `VIBAN`. Legacy `PAYMENT`/`COLLECTION` events may coexist during version migration. Processing both formats must not double-credit a transaction. Legacy `SETTLEMENT` needs resource-specific reconciliation, not an unconditional alias to one modern family.
4. Custody has its own four-state lifecycle: created, processing, complete, failed. A custody receive can arrive directly as complete. Do not apply fiat approval/refund states to custody.
5. Fiat pending approval expires if not accepted in time; expiry must invalidate the old preview. Liquidity/pending/provider states are not successful settlement. Refund requested/processing/failed/refunded remain distinct from original payment completion.
6. The custody docs explicitly warn delivery may occur once with no retry. Reconcile authoritative transaction lists with overlapping cursor/date windows, deduplicate ledger postings and alert on gaps. A webhook is a trigger, not the final balance source.
7. VA examples contain event/status disagreements and reuse account identifiers. Fetch current authoritative status before updating; an account ID alone is not a unique event key.
8. Keep account restriction separate from transaction failure. A failed transfer does not automatically freeze a merchant, and a provider pause does not automatically approve migration or authorize a payout through another provider.

## Error handling

Sources: [API errors](https://docs.yellowcard.engineering/docs/errors-api), [transaction errorCode](https://docs.yellowcard.engineering/docs/error-codes).

API failures use `code`/`message`; send/receive objects additionally use `errorCode`. Preserve those distinctions in internal records and show safe, actionable messages to merchants. An HTTP error alone must not overwrite the final financial status.

| Signal | BorderPay response |
| --- | --- |
| AuthenticationError / 401 | Check environment, key, signing and time. Alert operations; never retry financial writes blindly. |
| PermissionError / 403 | Check relay path policy and YC product/key entitlement. Do not infer the product is unavailable commercially. |
| PaymentValidationError, InvalidRequestBody, InvalidPhoneNumberFormat, VALIDATION_FAILED | Return the missing/correctable field; do not submit repeatedly. |
| ResolveAccountError, INVALID_RECIPIENT, INVALID_NETWORK, INVALID_CURRENCY | Correct the destination/channel details and revalidate before a new authorized attempt. |
| PaymentExpired / EXPIRED | Reconcile existing request; obtain a fresh quote/preview and consent where a replacement is needed. |
| PaymentInvalidState | Fetch the authoritative transaction; do not force an operation across lifecycle states. |
| PaymentNotFound / CollectionNotFoundError | Confirm environment and provider ID; do not treat absence as permission to duplicate the payment. |
| INSUFFICIENT_BALANCE | Distinguish merchant spendable balance from provider/partner liquidity; alert the appropriate owner. |
| POSSIBLE_DUPLICATE | Look up the existing sequence ID and reconcile before considering any resubmission. |
| GATEWAY_TIMEOUT, PROVIDER_ERROR, HTTP 5xx or transport timeout | Treat mutation outcome as potentially unknown. Reconcile by persisted sequence ID before retry. |
| NAME_MISMATCH | Request verified payment-party correction/evidence. Do not silently alter the name. The error guide labels its listed case Nigeria-specific. |
| FRAUD_CHECK | Route to compliance; preserve funds and restrictions. No automatic retry, alternate-provider reroute or customer-level innocence/guilt conclusion. |
| REFUSED | Preserve the payer's refusal; do not initiate a replacement debit without authorization. |
| OTHER_ERROR or unknown code | Retain the provider code internally, reconcile and request operational review; never guess success. |

Refund documentation is narrower than the generic endpoint title: the guide currently limits its cancellation/refund flow to Nigerian P2P receives. Do not promise automated ACH/SEPA/Faster Payments returns from that description alone. HTTP 200 on a refund request means accepted/processing, not money returned.

## RFI and compliance cases

No dedicated RFI case-list, RFI evidence-upload, reply, decision or RFI-webhook contract was identified in the 135 indexed public pages and 69 reference operations reviewed. This does not establish that YC has no private RFI API; obtain the enabled specification directly from YC. The metadata guide supports requests for documents in official cases, and transaction fraud flags/VA freezes are documented. Those are not interchangeable with an RFI API.

Prepare BorderPay's internal case model independently: merchant and provider IDs, transaction IDs, original request, requested evidence, deadline, secure attachments and hashes, operator responses, delivery acknowledgement, status and decision history. Never mark evidence sent to YC until a confirmed supported channel acknowledges it. Avoid introducing a guessed `/rfi` endpoint or labelling an internal upload as a YC submission.

Ask YC for the enabled business compliance/RFI specification: case creation/listing, request/response webhooks, document upload limits and formats, response submission, deadlines, status transitions, pause scope, appeals and the approved operational fallback if API access is private. Confirm whether enhanced travel-rule information requests use the same case channel or a separate one.

## Contract discrepancies requiring confirmation

- Local-channel send reference versus VA-funded send recipe: `/business/send` versus `/business/payments`, different required fields, `source` and `walletId` present in the VA guide but absent from the standard send request schema. Treat them as distinct operation contracts until YC confirms the enabled routes.
- `/custody/...` guide examples versus `/business/...` reference paths for wallets and VAs.
- Currency/asset enum omissions despite USD/EUR/GBP and EURC descriptions. Use verified entitlements/runtime config rather than obsolete labels or fabricated support.
- Institutional-person metadata and birth-date formatting; full business/UBO evidence submission versus per-payment KYC metadata.
- Guide/reference disagreement about deny terminal state (failed versus denied); reconcile the returned provider state rather than making assumptions.
- Public refund restrictions versus broader international return requirements.
- No identified provider PDF receipt endpoint: use authoritative data for BorderPay-branded receipts and obtain additional bank proof-of-payment fields from YC where necessary.

## Delivery boundary

The documentation and contract preparation can be completed before product access is enabled. Full production readiness still requires provider-confirmed contracts where ambiguous, end-to-end lifecycle tests, ledger reconciliation, per-provider merchant/resource isolation, operational callbacks, existing-app response compatibility and explicit migration approval. Do not change live Bridge services, account statuses, credentials or balances as a side effect of importing documentation.
