# Signup boundary and email policy

Production signup uses auth-signup and server-side Auth admin.createUser. Public Supabase Auth signup must have disable_signup=true. Existing login, recovery and confirmation remain available; do not turn off the email auth provider. Service-role provisioning is a trusted boundary.

Web signup requires verified CAPTCHA; native signup requires verified Firebase App Check (platform attestation) or CAPTCHA. Never accept Origin/User-Agent as attestation. Missing configuration fails closed. No client-only policy checks.

Only business email domains and the exact inbox.eu exception are eligible. Plus-addressing, known forwarding/alias domains, public/free and disposable domain snapshots are rejected, including subdomains. This cannot detect undisclosed forwarding/aliases at private domains or prove an address belongs to a registered business. KYB remains required. Existing accounts are not automatically blocked by this new-signup policy.

Sources retrieved 2026-09-30:
- https://github.com/willwhite/freemail/blob/master/data/free.txt (ISC; adjacent license)
- https://github.com/disposable-email-domains/disposable-email-domains/blob/master/disposable_email_blocklist.conf (CC0; adjacent license)

Lists are vendored, never fetched during signup. Refresh periodically via reviewed changes. Keep the exact inbox.eu exception and run policy tests after updates. A blacklist cannot enumerate every newly created mailbox service.

Incident findings: raw Auth signup was enabled, Auth CAPTCHA disabled, no pre-user hook. The probe account lacked application origin, business profile and partner membership. This is consistent with the direct Auth bypass, not proof it solved CAPTCHA. Closing direct signup prevents this path without generating provider customers. Live auth-signup version 452 matched base commit 87348cfffad9cc35f019c270f8a48017c6e0d1b1 before changes.
