# Corporate metadata validation notice — 16 October 2026

Status: integration audit; no production changes, customer submissions or financial activity.

## Requirements from the Yellow Card notice

Every corporate-flow payload must include the business name, business registration ID and business phone number. Business email is recommended. Yellow Card will reject missing or malformed metadata when enforcement starts. The notice does not specify the effective date or exact country-specific validation rules.

## Source review

Reviewed the official [KYC Metadata guide](https://docs.yellowcard.engineering/docs/kyc-metadata), [Send reference](https://docs.yellowcard.engineering/reference/submit-send) and [Receive reference](https://docs.yellowcard.engineering/reference/submit-receive) on 16 October 2026.

The public KYC guide still documents personal identity and reduced retail KYC. Its `updatedAt` is 2026-08-26. The current Send/Receive schemas expose `businessName` and `businessId` inside `sender` / `recipient`, plus generic `phone` and `email`. They do not expose dedicated corporate phone/email fields or the announced country-specific ID validation specification. The guide and endpoint schemas also disagree about DOB formatting; the draft currently follows the endpoint's YYYY-MM-DD example.

The notice is authoritative about required business data, but these documents are insufficient to certify the new validation contract. Do not invent API keys, accepted ID types, phone-length rules or registration-number regexes.

## Findings in the full-product draft

| Area | Current behavior | Required follow-up |
| --- | --- | --- |
| Business classification | `businessPayment` uses `customerType: institution`; the older sandbox builders use `retail` | Keep corporate integration separate from retail sandbox fixtures |
| Legal business name | `institutionalParty` supplies `businessName` from `legalName` | Preserve the verified merchant entity name |
| Registration ID | `businessId` comes from `registrationNumber`; non-empty check only | Apply confirmed jurisdiction-specific rules without substituting an internal BorderPay ID or personal ID |
| Business phone | `phone` comes from `representative.phone`; no dedicated business-phone field | Source a confirmed business contact and validate its international format and allowed lengths; confirm YC's exact wire mapping |
| Business email | `email` comes from `representative.email` and is required by the helper | Model business contact separately, keep corporate email optional under the notice, and validate it if supplied; confirm whether YC also requires representative email |
| Country and personal IDs | Country/ID checks are non-empty checks; no country-specific ID rules | Obtain authoritative country/ID rules and distinguish incorporation jurisdiction from the representative's identity jurisdiction |
| Submission boundary | The generic schema validator checks shape, enums and length but does not implement pattern/format checks. Raw payment intents need not pass through `institutionalParty` | Enforce corporate validation at the shared outbound submission boundary, not only a convenience builder |
| User feedback | `YCValidationError` supports field-level feedback | Return missing/invalid field names without exposing ID values, documents or raw provider payloads |

Relevant source files:

- `supabase/functions/_shared/providers/yellowcard-business.ts`
- `supabase/functions/_shared/providers/yellowcard-validation.ts`
- `supabase/functions/_shared/providers/yellowcard-full-product.ts`
- `supabase/functions/_shared/providers/yellowcard-payment-engine.ts`
- `supabase/functions/_shared/providers/yellowcard-payload.ts` (older sandbox implementation)

## Implementation and acceptance sequence

1. Obtain the updated corporate specification, enforcement date, field mappings and accepted country/ID formats from YC.
2. Map verified business contact data separately from the representative's identity. A representative's number may also be the business contact only when explicitly recorded as such; do not silently assume it is.
3. Apply deterministic validation before authorization consumption, fund reservation and provider submission. Preserve leading zeros and meaningful registration-number characters; do not fabricate missing data.
4. Validate both send and receive metadata at the shared outbound boundary. Confirm applicability to VA sends, fiat/crypto conversion and identity callbacks instead of assuming all products share one schema.
5. Perform a read-only merchant completeness audit after the mapping is confirmed. Route missing or inconsistent data to correction; do not auto-fill unverified values or send mass requests before review.
6. Add synthetic tests for missing business phone/name/registration ID, malformed supplied email, optional email omission, country/ID formats, representative/business separation and attempts to bypass the builder. Prove invalid requests make no provider call and no ledger reservation.
7. Test against YC's enabled validation environment and preserve existing production release gates. No merchant migration or live payment is authorized by this notice alone.

This audit does not certify that the draft passes YC's new validation. The full-product branch remains isolated; existing Bridge and production payment paths were not modified.
