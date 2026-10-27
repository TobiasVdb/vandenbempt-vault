# House of Tobias

## Main page access

The household dashboard, its assets and SPA routes require the shared password through a server-rendered form. Only a salted scrypt verifier is stored in server source. Successful login creates a random, HttpOnly, Secure, SameSite=Strict cookie lasting 12 hours. Sessions are memory-only and end on deployment/restart; the existing single-instance deployment is required. Five login attempts are allowed initially, then one replenishes every 12 seconds per client.

The separately mounted apps, `/nyc-follow/`, service APIs and health checks retain their existing access rules. This password gate protects the main page, not those independent services. Use the production HTTPS server to verify login; Vite's development/preview servers do not run this gate. Regression coverage runs with `npm run test:server`.

## Rocket multiplayer

`/rocket/` serves Hollow, with its own `/rocket/api/` routes, live rooms and ephemeral lobby chat. The source of truth is `D:/dev/rocketdesign`; regenerate `vendor/rocket` using `node scripts/export-rocket.mjs Y:/HouseOfTobias/vendor/rocket` from there. Do not hand-edit generated files. No new production dependencies or secret configuration are required.

The adapter reuses the existing PostgreSQL pool. Startup creates only additive `rocket_players` and `rocket_results` tables; the API stays unavailable if initialization fails. Player identity is a browser-stored random ID plus a private bearer token; only token hashes are stored in PostgreSQL. Coins, owned skins, equipped paint, selected spacecraft, upgrades, selected spacecraft and best times persist per pilot. Room physics and chat are memory-only: keep the app at one instance until rooms use a shared simulation/broadcast service. Chat has no history or database table.

Server-authoritative races accept thrust and steering, calculate collisions and objectives with the game's physics, and award rewards from server results only. New browsers choose a name. Missing Rocket files 404 within the mount and cannot enter the host SPA fallback. Other service prefixes and their WebSocket listeners are unchanged. `GET /rocket/api/health` verifies the Rocket store is ready. `server/rocket.node-test.mjs` covers route isolation and asset imports; the source repo includes game and API tests.


## De Pleckers trip tracking and alerts

`/nyc-follow/` is the private-code follow and device-pairing page. Its public HTML contains no private locations or credentials. `/api/nyc-trip/*` is a separate authenticated service; it stays closed until PostgreSQL initialization succeeds and `NYC_TRIP_ADMIN_TOKEN` is set to a random base64url token of at least 40 characters. Existing household APIs and access rules are unchanged.

Push delivery additionally requires `NYC_VAPID_PUBLIC_KEY`, `NYC_VAPID_PRIVATE_KEY` and `NYC_VAPID_SUBJECT` (a contact `mailto:` or HTTPS URL). The `web-push` MIT package is server-only and adds no client bundle weight; it provides standard encrypted Web Push delivery rather than implementing cryptography ourselves. The dependency audit showed no advisory for web-push or its added dependencies; unrelated existing audit findings were not modified.

Generate configuration manually with `node scripts/nyc-push-keys.mjs <absolute-path-outside-this-checkout>`. The file must not already exist. Add the values as encrypted runtime variables in App Platform, retain the VAPID key pair across releases, and keep that file private. The script never prints keys. Do not commit it or put the admin/private keys in the trip client. The API exposes only the public VAPID key.

Deploy this checkout through the existing House of Tobias Git/App Platform workflow after review. No production credentials have been created by the implementation. The service initializes additive `nyc_devices`, `nyc_fixes` and `nyc_alert_deliveries` PostgreSQL tables. History reads cover 7 days / 500 latest points; an hourly job prunes older fixes and expired device credentials. Credentials expire 3 November 2026. The administrative revoke endpoint and traveller's delete action erase the device, fixes and subscription together.

To pair: open `/nyc-follow/`, expand beheer, enter the server admin token and a device name, then create a 15-minute single-use pairing code. Put that code into the trip app's Locatie delen & meldingen dialog. Keep the separate read-only follow code for the intended follower. Reporter/read codes are hashed in PostgreSQL; follower codes cannot upload fixes or enable tracking. Admin credentials are not stored by the follow page. Tracking is opt-in, visible-page-only, and off after reload. The follow view shows capture time and accuracy; locked/closed apps cannot provide fresh background GPS.

Departure alerts run every 15 seconds during 23–26 October, using UTC instants exported from New York local itinerary times. Persistent device/event claims prevent duplicate sends across restarts or multiple instances. Push TTL is 90 seconds; missed alerts are not replayed. Failed sends are recorded; expired subscriptions are removed. This is best-effort schedule assistance, not a guaranteed alarm. Push destinations are restricted to known browser push providers and app destinations to exact approved origins/paths. `NYC_TRIP_ORIGINS` can add explicit HTTPS app origins if a deployment changes.

The source of truth is `D:/dev/depleckernyc/de-pleckers`. From there run `node scripts/export-trip-service.mjs Y:/HouseOfTobias/server/nyc-schedule.json` after changing itinerary/routes. This also regenerates the client's public service configuration and offline timetable. Publish both releases together; the client checks the schedule version before enabling push. Server push uses default-route departures. Browser-only alternative transport choices are not synchronized with push and the setup UI says so.

Verify before the visit on a physical installed PWA: pair, deliberately enable GPS, see a fresh private follow position, stop sharing, background/lock and confirm the timestamp ages, resume for a fresh fix, enable notifications, use Testmelding, then exercise a real encrypted server push. iPhone requires installation on the Home Screen before requesting push permission. The automated server suite uses an isolated SQL adapter; it does not replace production PostgreSQL or device delivery verification.

## Directorate

The project telemetry dashboard is served at `/directorate/` from the generated `vendor/directorate` export. Rebuild it from `D:\dev\DirectorateOfOnlineSystems` with `node scripts/export-hot.mjs <this checkout>`; do not edit the export. Its API proxies to `https://atelierav.be/directorate` (optional override: `DIRECTORATE_COLLECTOR_URL`, HTTPS only). The collector runs separately with persistent SQLite on Atelier AV's server, since App Platform's local filesystem is ephemeral. Dashboard administration requires its admin bearer token; reporters use separate project ingestion keys. The proxy stores neither secret and rejects cross-origin requests, oversized bodies, redirects, and unknown API routes.

## Ring Eater service

The Express server exposes the shared-world API at `/api/ring-eater` and its WebSocket endpoint at `/api/ring-eater/live`. It creates its additive PostgreSQL tables during the existing database startup and uses the configured `DATABASE_URL` or `PG*` variables.

If the Ring Eater client is deployed on a custom domain, add its exact origin to the comma-separated `ALLOWED_ORIGINS` runtime variable. Localhost and `*.ondigitalocean.app` origins are already accepted. Keep the service at one instance until realtime broadcasts are backed by a cross-instance channel.

## BOB

When `vendor/bob` exists, the server serves the BOB game at `/bob/` and its co-op rooms over WebSocket at `/bob/coop`. Every visitor joins one shared room automatically (up to 32 players). Rooms live in memory, so they reset on every deploy and restart. That folder is generated by the BOB repo with `npm run export:hot -- <this checkout>`; re-export instead of editing it. The co-op socket accepts this site's own origin plus the origins Ring Eater accepts.

Backend rule checks run with:

```bash
npm run test:server
```

## Playwright and generated thumbnails

Regular installs and production builds do not install a Playwright browser or run end-to-end tests. The E2E suite remains available explicitly with `npm run test:e2e` after Chromium has been provisioned manually.

The server's generated website-thumbnail feature also depends on Playwright and Chromium. It is unavailable in the default production container; provision the browser and its Linux system dependencies separately before enabling or invoking thumbnail generation.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
