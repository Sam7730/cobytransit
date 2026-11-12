# Security and privacy — release 1.2

The rider interface collects no accounts, payments, precise user locations, uploads or personal profiles. Saved stop IDs and explicitly requested offline transit schedules remain in the browser. Standard hosting request logs may still be retained by the host. Default OpenStreetMap street tiles disclose the requested map area, referrer origin and client IP to that provider. Streets can be switched off.

## Runtime protections
The embedded preview is allowed only from this origin and https://chatgpt.com through CSP frame-ancestors. Other parent origins remain blocked. X-Frame-Options DENY is omitted because it would also block the permitted ChatGPT preview. The Site stays owner-private.

The Worker attaches CSP, HSTS, nosniff, restricted framing, Referrer-Policy, Permissions-Policy, COOP and CORP on pages, assets, JSON APIs and error responses. CSP restricts scripts, styles, connections and workers to this origin; only fixed OpenStreetMap image tiles are allowed externally, plus data-URL images used internally by Leaflet. A meta CSP adds a browser-level fallback. Application rendering uses text nodes, including all provider-supplied labels and popup contents. Leaflet is locally bundled; no remote scripts or embedded credentials are used. Leaflet is vendored with its license; no npm install is needed.

Security header behavior is tested against the actual request handler. A deployment verification must also inspect responses through authenticated Sites service access; testing only the sign-in gate is insufficient. Endpoint status and body limits apply to errors as well as successful responses.

## Maintenance authorization and integrity
This Site is owner-private. Sites dispatch authenticates both browser visitors and native service-access requests before the Worker runs. `UPDATES_ENABLED=owner-private` is configured only after verifying the owner-only policy. Forks fail closed unless deliberately configured. The writer is not a public API; **disable this setting before broadening Site access** or add a separately authenticated and authorized writer first. A cloud task must re-read owner-only access before every write and stop if it changed.

POST /api/snapshot accepts only same-origin/no-Origin JSON under 1.5 MB; rejects unsupported methods, cross-site origins, malformed or oversized data; validates provenance, supported route IDs, dates, service calendars, stop/shape references, coordinate bounds, time order and exception uniqueness. It checks an optimistic prior SHA, then downloads the ZIP only from the fixed 511NY HTTPS URL (no redirects) and compares its SHA-256. Only validated, reviewed snapshots are persisted in R2. Failure retains the last working data. Public map endpoints do not accept operator-defined URLs. Reviewer notes use text rendering and bounded strings.

## Offline behavior
Saving is opt-in. Cache allowlists include app assets and read-only transit snapshots, never POST responses, cross-origin tiles, source archives or login routes. Responses must carry the application's header and must not be redirected, preventing sign-in pages from being stored as app files. Cache failures do not masquerade as current online service; fallback responses carry an offline marker. The data retains its retrieval and coverage dates. Clearing offline storage deletes this app's cache namespace only. Offline code is public transit content and contains no authentication tokens or personal records.

## Verification limits
Automated tests cover calendar rules, return trips, stale/expired/offline states, update validation and CSRF protections, error-path headers and offline cache behavior. Browser inspection covers route/stop interactions, a narrow 440px compact layout, return search and source warnings. These checks do not certify WCAG conformance, real-device behavior or absence of all vulnerabilities. No independent penetration test has been performed.

No public vulnerability inbox is provisioned. Contact the maintainer privately through the channel where you obtained the project; never post secrets, personal records or unpatched exploit details in public issues.

## Optional live-data endpoints

Read-only live and traffic endpoints accept no caller-supplied upstream URLs. Only server environment settings configure the SCPT HTTPS feed; redirects and local/literal-IP hostnames are rejected. The host operator must select a trusted public provider, including its DNS destination, and enforce outbound policy. Optional bearer credentials remain server-side. Fetches use eight-second timeouts, body limits, per-isolate request coalescing, and schema/coordinate validation. Traffic requests use a fixed TomTom host and bounded tile/service geography. Errors omit upstream content and credentials. Set host-level rate limits and provider quotas before enabling paid services publicly; the per-isolate cache is not a global rate limiter.

Live responses and traffic tiles are excluded from the service worker. API responses use no-store; traffic tile responses have a 60-second private HTTP cache. No user GPS is requested. Browser tests cover keyboard stop selection, route visibility, mobile overflow, live fixtures, stale locations and outages. Actual agency GPS and paid traffic data require a provider account for operational validation.
