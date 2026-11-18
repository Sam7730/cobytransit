# CobyTransit 2.2 — November 6, 2026

## Recovered from the hosted source

The public GitHub main branch was still at `2431e5128f347b2cedea74642fec4936b3229b47`.
The newer hosted source supplies the complete Node/Worker backend, authenticated GPS
and dispatch APIs, persistent storage, driver test page, all-stop details, same-stop
transfers, accessible layouts, Docker configuration and deployment documentation.
These are recovered earlier changes, not newly connected agency tracking.

## Finished in this release

- Searches after the last bus offer both earlier trips and the next service date.
- Real one-transfer matches appear automatically when no direct trip is available.
- Next-date searches consider transfer-only journeys and skip closed days.
- GTFS calls after midnight are validated and routed using the correct service date.
  Next-day arrivals carry a day label. Explicit added-service dates take precedence
  over regular calendar ranges; schedule coverage includes those dates.
- Route 1's 3:59 PM Price Chopper terminal is drop-off only, including older stored
  copies of the reviewed feed. The importer retains the correction.
- Street-map HTTP errors cannot render as blocked-access PNGs over the bus map.
  Users can disable the unavailable layer; routes and stop lists remain usable.
- Offline assets are versioned for this release and include the new tile loader.

## Verification

48 automated tests passed, including every eligible stop pair in the supplied feed,
service closures, overnight transfers, GPS authorization/replays/persistence,
security headers, offline exclusions and blocked tile images. Data validation,
Worker compilation and embedded-asset checks passed.

Browser checks confirmed:

- SUNY → Walmart after 23:59 on November 10 suggests November 12 (November 11 closure).
- Granite Drive → Middleburgh Library on November 6 at 08:00 shows four transfers
  while the transfer checkbox is unchecked.
- Route maps and stop selection remain available independently of street tiles.

## Remaining external dependencies

- **GitHub publication:** branch creation returned HTTP 403, “Resource not accessible
  by integration.” No GitHub branch, commit or pull request was created. The account's
  GitHub connection needs repository contents and pull-request write access before
  the prepared update can be pushed. Updating the hosted Site does not update GitHub.
- **Agency GPS:** no SCPT fleet/device feed is connected. Credentials and authorized
  device/Verizon integration, then a real production field trial, remain necessary.
- **Street detail:** OpenStreetMap returned blocked-access tiles in this environment.
  The error-handling path is tested; successful street tiles in production are not
  verified. No local street snapshot, traffic-signal state or stop-sign overlay is
  included. A supported map data source and provenance review are still needed.
- **Schedule data:** the current feed ends December 31, 2026. Import and review a new
  feed before providing journeys beyond its coverage. Untimed/on-call locations do
  not become scheduled services merely because a stop record exists.

Transfers use one exact shared stop with a 10–90 minute wait. They do not infer
walking connections or guarantee a connection. Overnight handling is tested with
synthetic fixtures; the current county feed contains daytime/evening calls.
