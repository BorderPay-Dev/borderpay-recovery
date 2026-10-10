# Validation — 10 October 2026

46 distinct offline tests passed across request contracts (12), business KYB (8), initial card-request safeguards (10), PostgreSQL persistence (8) and webhook security (8). Deno lint passed. All 105 downloaded documentation snapshots match the SHA-256 values in the manifest.

The PostgreSQL tests used PGlite with synthetic programme/merchant/card IDs, including real schema creation, constraints, grants, row-level-security boundaries and append-only triggers. No production database was queried or modified. Provider HTTP calls use controlled mocks; signatures are generated with ephemeral test RSA keys. No REAP keys or real cardholder data were used.

Provider acceptance remains unexecuted: credentials, actual signing-key validation, schema compatibility with the enabled programme, hosted reveal, merchant/cardholder approval, transaction settlement and 3DS must pass in REAP sandbox before activation. A successful offline test is not evidence of a successful provider transaction.
