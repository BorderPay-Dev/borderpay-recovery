# Monthly signup and login audit

Workflow: **Monthly signup and login audit** in `BorderPay-Dev/borderpay-recovery`.
Runs on the 19th of each month at 06:23 UTC (09:23 Nairobi), and on manual dispatch.
GitHub may delay scheduled jobs. Enable Actions failure notifications and check the run summary each month.

The production job only runs from `main`. Pull requests run regression tests and the web build without production credentials.

Repository secrets: `AUTH_AUDIT_EMAIL`, `AUTH_AUDIT_PASSWORD`, `AUTH_AUDIT_ANON_KEY`.
Use the dedicated app-review business account. The runner rejects any other login.
No service-role key or financial-provider key is used. The script prints named check results and durations only; no customer records, tokens, screenshots, page contents or network bodies.

Coverage:
- Authentication availability and public signup input safeguards.
- Business-only signup, disposable/personal email and alias rejection, required security check.
- Direct auth signup remains closed; password failures and unauthenticated profile reads are rejected.
- Business signup screen and password reset screen.
- Password reset HTTP failures show a retry message, not a false email confirmation.
- Real demo password login, dashboard arrival, reload, server identity validation, refresh and local-session sign-out.

The reset HTTP failure is intercepted inside the browser: it sends no email.
Signup probes deliberately use an invalid password and omit the security token. They must be rejected, never create a merchant, trigger KYB or provision products.

Limitations: this scheduled check does not create a new business, read an inbox, consume confirmation/recovery links, change passwords, solve CAPTCHA, test real customer MFA or exercise native iOS/Android attestation. Review aggregate confirmation/email-delivery records separately and perform controlled device acceptance testing before mobile releases. A green smoke audit is not a complete security assessment.

When a run fails, inspect the named failing check privately. Do not enable token, request-body or authenticated screenshot logging in this public repository. Do not disable CAPTCHA, MFA, email confirmation or rate limits to make tests pass.
