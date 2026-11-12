# CobyTransit 1.3

Independent, MIT-licensed transit explorer for Cobleskill and Schoharie County. Leaflet 1.9.4 is bundled locally under its BSD-2-Clause license; no package installation is required to run the app. Agency GTFS supplies actual stop coordinates, route shapes, scheduled trips, calendars and holiday exceptions.

**Prototype, not an official rider service. Live GPS and traffic integrations are implemented but need authorized provider configuration; no production feed is connected. Confirm travel with RideSCPT at 518-234-0952.**

## Run and verify
Requires Node.js 20+. No npm install is needed. Live services are optional server environment settings; see `LIVE_TRACKING.md`.

```sh
git clone https://github.com/Sam7730/cobytransit.git
cd cobytransit
npm test
npm run check:data
npm run build
npm run dev
```
Open http://localhost:4173 . The preview runs the same request handler and security headers as the deployed Worker. Offline saving needs an HTTPS origin and a supported browser. Do not disable browser security for local tests.

## Features
- Green-and-white, map-first county explorer with a simplified rider guide, searchable towns, shareable route/stop links, and a scheduled upcoming-departures board.
- County overview with a US Census boundary, five GTFS fixed-route maps, ten Route 5 reservation-area polygons and twelve agency map locations for Routes 20/23. All nine SCPT service listings plus the separate SUNY shuttle remain available. No reservation paths or guaranteed address coverage are inferred.
- Direct outbound and same-day return search; minimum 10-minute turnaround; last direct departure warnings. No transfer or walking route is inferred.
- Dynamic schedule freshness, review warnings and calendar expiration. Source conflicts remain visible.
- Responsive map/list navigation, keyboard-accessible stops and service areas, readable controls, reduced-motion support, and semantic timetable/share dialogs.
- Opt-in offline app/schedule storage. Cross-origin tiles, credentials, login pages, maintenance writes and source archives are not cached. Offline results are dated and cannot contain new cancellations.
- Security headers on every application response, including errors and APIs; no embedded secrets, geolocation, payment collection, user uploads or application accounts.
- Owner-private, validated maintenance writer and R2 persistence for reviewed data updates without code deployment.
- Live vehicle API and map markers with per-measurement expiry, route filtering and failure states. No simulated buses.
- Optional server-proxied TomTom traffic flow, incidents, roadworks and closures; 511NY link when unavailable. See `LIVE_TRACKING.md` for setup and limitations.

## Source layout
`web/` contains browser code and the fallback GTFS JSON. `server/handler.js` owns HTTP routes and security headers. `scripts/build.mjs` embeds assets and validation into the single `worker/index.js` entrypoint, then emits `dist/server/index.js`. There are no standalone runtime assets outside that Worker. `scripts/package.mjs` creates the source ZIP, omitting secrets, Git metadata, generated Worker/dist output and Sites project identity.

`.openai/hosting.json` in the managed repository retains its existing Site identity and declares the BUCKET R2 binding. Downloaded source intentionally omits this private hosting identity. To publish a fork, register a new Site or use your own Cloudflare Worker deployment; do not reuse someone else's Site ID. An HTTPS static deployment of `web/` can use its fallback JSON, but has no durable maintenance API and must enforce its own security headers.

## Data maintenance
Python 3.9+ standard library:

```sh
python3 scripts/import-gtfs.py
npm run check:data
```
The importer uses a fixed 511NY URL, bounded ZIP parsing without path extraction, basic reference validation and SHA-256. The shared JavaScript validator additionally enforces sizes, service dates, coordinates, identifiers, stop ordering and supported routes. Review official route pages before applying changes. Snapshot regression fixtures intentionally protect the reviewed baseline; a legitimate code-release fixture change needs review.

`MAINTENANCE.md` documents unattended source checks, safe runtime updates and readback. `LIVE_TRACKING.md` documents the remaining agency-feed prerequisite. Daily hosted maintenance is configured separately; cloning this repository does not copy the owner’s hosted data, credentials or scheduled maintenance. The included fallback snapshot retains its own verification date and can differ from newer runtime notices. Check the official sources before relying on it for travel.

## GitHub

Project repository: https://github.com/Sam7730/cobytransit . Clone or download it to run your own copy. The hosted owner-private Site and its maintenance credentials are separate from this public source repository.
`.github/workflows/checks.yml` tests pull requests and builds a sanitized artifact. `feed-check.yml` checks the upstream feed and reports differences for review; it never automatically pushes source changes or deploys. Workflow execution depends on the repository’s GitHub Actions settings. Issue templates and CONTRIBUTING.md are included.

Application code: MIT. Transit data and map tiles retain their source terms. See DATA_SOURCES.md and SECURITY.md. No county or SUNY endorsement is claimed.

## Optional browser checks

With the dev server running, install the test-only browser dependency using `npm install --no-save --package-lock=false playwright`, then run `npx playwright install chromium` and `node tests/map.browser.mjs`. Set `BROWSER_EXECUTABLE` to use an installed Chromium and `BASE_URL` to use another preview URL. The browser suite uses explicitly synthetic live/traffic fixtures and blocks street tiles to test the failure path; it never claims provider connectivity. Real OpenStreetMap tiles were also visually checked separately at desktop and phone sizes.

For a practical device-based GPS pilot using hardware sold through Walmart or Target, read [GPS_SETUP.md](GPS_SETUP.md). `scripts/import-service-maps.py` reimports the published RideSCPT map features; review changed source content before accepting updates.
