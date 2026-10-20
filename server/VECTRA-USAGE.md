# Vectra anonymous activity intake

`POST /api/vectra-usage` forwards bounded feature-action batches to Directorate's
persistent collector. Register it before the shared JSON/CORS middleware. Only
the exact Vectra app origin is allowed; OPTIONS supports its JSON preflight.
Cookies, authorization, IP headers and referrers are not forwarded. No usage
data or secrets are stored on App Platform's ephemeral filesystem.

Batches require only `id` and `actions`, at most 100 short action names and a
4 KB JSON body. The persistent collector additionally checks UUID v4 IDs and
its fixed action allowlist, deduplicates retries and aggregates by Brussels day.
There is a per-instance 300-request/minute limit plus the collector's own global
limit. Public anonymous counts can be spoofed and are not audited people counts.

Use the **Vectra** project in `/directorate/` to see daily and seven-day feature
counts and metric history. Existing Directorate administration stays private.
The upstream follows `DIRECTORATE_COLLECTOR_URL` (HTTPS only), just like the
dashboard proxy. No additional environment variable or secret is needed.

Verify with `node --test server/vectra-usage.node-test.mjs` and the existing
`npm run test:server`. Deploy the collector first, this host second, and the
Vectra frontend last. A custom app domain must be added to both origin allowlists.
