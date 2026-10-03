# Invoice buyer sharing

Share to Buyer prepares the buyer PDF and opens a review dialog. A second user gesture opens the device share sheet; this preserves Web Share user-activation requirements after asynchronous PDF generation. Capacitor Share and Filesystem are already installed. The native app must include this web bundle in its next build.

Generated invoices reuse the existing download_invoice path, active-account policy and safe customer-copy PDF. Optional buyer email and international phone are stored in the draft and immutable invoice snapshot. Existing records remain compatible. Uploaded pairs use share_document_check; ownership, exact asset IDs, hashes, kinds and rejected-file controls are checked before combining only the invoice and contract. This endpoint does not export source-of-funds or compliance dossiers.

Azure document comparison now asks for optional buyer contacts in the existing call. Each contact requires an exact OCR quotation containing the buyer name and contact. Missing, ambiguous, local-only phone numbers and unsupported candidates remain blank. Existing completed checks are not automatically reprocessed or billed again. Messages use a deterministic, editable template populated from saved or extracted fields, with no additional text-generation call and no invented model/deployment name.

Signed storage URLs are used only to retrieve the file, never pasted into recipient messages. Download preparation enforces the configured storage origin, 40 MB cap, PDF header and SHA-256. Native cache files are cleared after one hour where the process remains alive and stale files are swept on subsequent preparation; the OS can also remove cache. No logs contain buyer contacts, text or signed links. Sharing closure is never recorded as confirmed delivery.

Mail and WhatsApp decide which payload fields they accept. The share sheet does not reliably target a named recipient. Copy message, Download PDF and recipient-prefilled text-only deep links are fallbacks. The merchant chooses the recipient and confirms sending. Cancelling keeps the draft and causes no send or automatic retry.

## Release

Deploy the scoped predeposit-hub and predeposit-worker functions from the same tested commit, then the web app. No database migration or new gateway is needed. Include the UI in the next existing iOS/Android release without changing store names or descriptions. This PR does not deploy production.

Run the invoice GitHub gate for rules, HTTP boundaries, PDFs, database isolation, typecheck/build and browser sharing tests. Before store release, test real iOS Mail/Gmail/WhatsApp and Android Gmail/WhatsApp: document opens, recipient selection, text retention/copy fallback, cancellation and cache access. No merchant or buyer receives test messages.

Azure extraction and storage still incur their normal usage costs; there are no added per-message gateway charges. Sharing does not change payment approval, account restrictions or financial state.
