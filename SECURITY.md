# Security and privacy — release 1.1

The rider interface collects no accounts, payments, precise user locations, uploads or personal profiles. Saved stop IDs and explicitly requested offline transit schedules remain in the browser. Standard hosting request logs may still be retained by the host. Opt-in OpenStreetMap tiles disclose the requested map area and client IP to that provider.

## Runtime protections
The embedded preview is allowed only from this origin and https://chatgpt.com through CSP frame-ancestors. Other parent origins remain blocked. X-Frame-Options DENY is omitted because it would also block the permitted ChatGPT preview. The Site stays owner-private.

The Worker attaches CSP, HSTS, nosniff, restricted framing, Referrer-Policy, Permissions-Policy, COOP and CORP on pages, assets, JSON APIs and error responses. CSP restricts scripts, styles, connections and workers to this origin; only fixed OpenStreetMap image tiles are allowed externally. A meta CSP adds a browser-level fallback. No eval, innerHTML, document.write, arbitrary fetch URLs, remote scripts or embedded credentials are used. The app has no npm runtime dependencies.

Security header behavior is tested against the actual request handler. A deployment verification must also inspect responses through authenticated Sites service access; testing only the sign-in gate is insufficient. Endpoint status and body limits apply to errors as well as successful responses.

## Maintenance authorization and integrity
This Site is owner-private. Sites dispatch authenticates both browser visitors and native service-access requests before the Worker runs. `UPDATES_ENABLED=owner-private` is configured only after verifying the owner-only policy. Forks fail closed unless deliberately configured. The writer is not a public API; **disable this setting before broadening Site access** or add a separately authenticated and authorized writer first. A cloud task must re-read owner-only access before every write and stop if it changed.

POST /api/snapshot accepts only same-origin/no-Origin JSON under 1.5 MB; rejects unsupported methods, cross-site origins, malformed or oversized data; validates provenance, supported route IDs, dates, service calendars, stop/shape references, coordinate bounds, time order and exception uniqueness. It checks an optimistic prior SHA, then downloads the ZIP only from the fixed 511NY HTTPS URL (no redirects) and compares its SHA-256. Only validated, reviewed snapshots are persisted in R2. Failure retains the last working data. Public map endpoints do not accept operator-defined URLs. Reviewer notes use text rendering and bounded strings.

## Offline behavior
Saving is opt-in. Cache allowlists include app assets and read-only transit snapshots, never POST responses, cross-origin tiles, source archives or login routes. Responses must carry the application's header and must not be redirected, preventing sign-in pages from being stored as app files. Cache failures do not masquerade as current online service; fallback responses carry an offline marker. The data retains its retrieval and coverage dates. Clearing offline storage deletes this app's cache namespace only. Offline code is public transit content and contains no authentication tokens or personal records.

## Verification limits
Automated tests cover calendar rules, return trips, stale/expired/offline states, update validation and CSRF protections, error-path headers and offline cache behavior. Browser inspection covers route/stop interactions, a narrow 440px compact layout, return search and source warnings. These checks do not certify WCAG conformance, real-device behavior or absence of all vulnerabilities. No independent penetration test has been performed.

No public vulnerability inbox is provisioned. Contact the maintainer privately through the channel where you obtained the project; never post secrets, personal records or unpatched exploit details in public issues.
