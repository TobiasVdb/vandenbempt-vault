# SpaceLake droplet

Public site: https://spacelake.planetarypixel.be/

- DigitalOcean `spacelake`, ID `616132747`, Amsterdam AMS3, `188.166.94.42`.
- Approved plan: $4/month, 1 shared vCPU, 512 MB RAM, 10 GB SSD; 1 GB swap.
- DNS: GoDaddy's authoritative `planetarypixel.be` zone, A record `spacelake` to the droplet. The empty DigitalOcean DNS zone is not authoritative.
- Ubuntu 24.04, Node 22.23.4, Nginx, systemd `spacelake`, valid Let's Encrypt HTTPS and enabled `certbot.timer`.
- Source assets: `public/spacelake/`; standalone service: this directory. No House of Tobias application, database, or secrets are deployed here.

## Update

Run `./deploy/spacelake/deploy.ps1` from this checkout. It uploads only the site and its standalone service, keeps timestamped releases under `/opt/spacelake/releases`, switches `/opt/spacelake/current`, and restarts `spacelake`.

`-Bootstrap` is for a fresh server only. **Do not rerun bootstrap on the active HTTPS server:** it writes the initial HTTP-only Nginx configuration. The current certificate account was securely reused from the existing approved Thrustlings account; its private configuration is root-only on the server and is not in this repository.

After updates, check HTTPS, hash-match all public assets, inspect `systemctl status spacelake spacelake-directorate`, and verify fresh Directorate reports. Both services are enabled after reboot. Previous application releases remain available for a deliberate rollback; retain the current compatible Nginx configuration.

## Visitor activity and health

The website runs on `127.0.0.1:4192`. Its separate aggregate-only listener is `127.0.0.1:4191/metrics`; Nginx never exposes that listener. Public `/metrics`, source and data paths return 404. The activity endpoint accepts bounded JSON only from the site's allowed origin and is rate limited by Nginx.

`activity.js` respects Do Not Track and Global Privacy Control. It uses a random page-load session in memory, without cookies, local storage, IP collection, or URL queries. Only daily visit counts and visible milliseconds are persisted, for up to 90 recorded days, in `/var/lib/spacelake/activity.json` (owner `spacelake`, mode 600). Memory-only session tokens expire within an hour and never enter Directorate. Active visits mean visible sessions with a heartbeat in the last 45 seconds; visits are page sessions, not unique people.

The separate `spacelake-directorate` service comes from `D:/dev/DirectorateOfOnlineSystems`. It probes the public HTTPS site, checks the local application, and sends allowlisted aggregates every 60 seconds. Its ingestion key is outside the public runtime in `/etc/spacelake-directorate/reporter.env` (root:spacelake, mode 640).

## spacelake.eu

As of 5 November 2026, `spacelake.eu` points to this droplet and has its own Let's Encrypt certificate and Nginx virtual host. The original `spacelake.planetarypixel.be` host remains available. HTTP redirects to HTTPS; `/var/www/spacelake-acme` serves renewal challenges, and `/etc/letsencrypt/renewal-hooks/deploy/spacelake-reload-nginx` reloads Nginx after renewal. The systemd origins override allows activity requests from both HTTPS origins. Both `spacelake.eu` and `www.spacelake.eu` resolve to the droplet and are covered by the same certificate; the `www` hostname redirects to the apex over HTTP and HTTPS.

## Verification

`node --test deploy/spacelake/server.test.mjs` checks deduplication, visible presence, persistence without identifiers, invalid data, cross-origin rejection, privacy headers, and private-route exclusion. Syntax-check the browser module with `node --check public/spacelake/activity.js`.

On 5 November 2026: HTTPS and HTTP redirect passed, all six assets matched source hashes, the public activity API and private-route exclusions passed, counters survived a service restart, and Directorate received healthy reports. One anonymous API verification session is included in that day's totals. The browser QA visit with DNT enabled was excluded as intended.
