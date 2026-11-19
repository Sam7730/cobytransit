# Staff service notices

CobyTransit can publish route-specific information, detours and full-day cancellations. This is a tool for the website's authorized maintainers. It is not connected to SCPT dispatch and does not make this website an official agency service.

The rider website works without this feature. Staff writes are disabled until both a strong access token and persistent storage are configured. Never publish guessed cancellations. Confirm the route, dates and wording with an authoritative source first.

## Hosting requirements

Use the generated Cloudflare Worker (`worker/index.js`) over HTTPS, with a Cloudflare R2 bucket bound as `BUCKET` and a secret called `ADMIN_TOKEN`. GitHub Pages cannot run the staff API. `npm run dev` previews the dashboard but intentionally has no persistent staff storage. Use `npm start` with `ADMIN_TOKEN` in your local `.env` file for persistent single-server testing, or use Wrangler for the Worker storage path.

1. Run `npm run build` in the project folder.
2. Create an R2 bucket in your Cloudflare account. Check the provider's pricing before enabling services.
3. Add its binding to your Wrangler configuration. For example, a root-level `wrangler.jsonc`:

```jsonc
{
  "name": "cobytransit",
  "main": "worker/index.js",
  "compatibility_date": "2026-11-17",
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "YOUR_BUCKET_NAME" }
  ]
}
```

4. Generate a long random token in your password manager (at least 32 characters; 64 random hexadecimal characters is a good choice). Store it as a Worker secret, not in source code:

```bash
npx wrangler secret put ADMIN_TOKEN
```

Paste the token when Wrangler prompts. Do not put the token in a GitHub issue, URL, screenshot or committed configuration. Keep a copy in a password manager for authorized maintainers. A person holding this token can change every website notice.

5. Deploy your reviewed build using the hosting instructions in the README. No bucket, secret or deployment is created automatically by this repository.
6. Open `https://YOUR_HOST/staff`, enter the token, and check the health panel.

For local testing, put `ADMIN_TOKEN=YOUR_RANDOM_TOKEN` in `.dev.vars` and run `npx wrangler dev`. The same R2 binding uses Wrangler's local storage by default; do not add `--remote` for a local-only test. Both `.dev.vars*` and `.wrangler/` are excluded from Git and the downloadable source archive. Rebuild after changing the source before testing the generated Worker.

Leave `UPDATES_ENABLED` unset on a public deployment. The older snapshot-update API needs a separate hosting-enforced owner boundary; the staff token does not authorize that endpoint. This dashboard only edits notices.

## Publishing a notice

- Choose the affected routes and inclusive first/last dates in **America/New_York** time.
- Enter a clear title and what riders should do. Preview it, review the source, then publish.
- **Information** gives context without changing routing.
- **Detour** warns riders to confirm boarding. It does not draw an invented diversion or automatically change stop times.
- **Cancellation** removes **all runs on the selected routes for every selected date** from trip results, return searches and departure boards. It is not a single-run or partial-day cancellation tool. For those cases, publish information and direct riders to dispatch.
- Editing or removing a notice saves immediately after confirmation. Future notices appear in the Notices view; date-specific searches apply them only within their date range.
- Riders check for changes when the page loads, reconnects, or every minute while the tab is visible. It is not a push-notification service.

If another maintainer changes the notices, saving an older revision fails with a conflict. Reload the list, review the differences and then publish again. R2 conditional writes also protect simultaneous updates.

Sign out when finished. The token stays in JavaScript memory, is cleared on sign-out/page exit, and is never written to localStorage or offline caches. Refreshing requires another sign-in. For a larger team, put the staff paths behind an identity provider with individual accounts, revocation and audit logs; shared-token access is a small-project starting point. Restrict and rate-limit `/api/admin/*` through your host where available. Rotating the Worker secret revokes the old token.

## Failure behavior

Missing storage or a token shorter than 32 characters returns “not configured.” Invalid credentials cannot read private revisions or write. Cross-origin staff requests, invalid notices and oversized payloads are rejected. No notice HTML is executed.

Public alerts are never saved by the service worker. When a refresh fails, the current tab retains previously received cancellations and warns that notices could not be checked. A new offline visit has no current cancellation information and says so. An empty list of website notices is never confirmation that agency service is normal.

## Health and reports

The dashboard shows schedule coverage, recorded source-review status and current GPS/traffic connection information. The daily GitHub workflow separately checks 13 official pages, seven agency map files and the GTFS feed; read its run summary and downloadable JSON report in GitHub Actions. It flags source changes, unavailable sources, and schedules expiring within 14 days. It does not certify accuracy or update data automatically.

Rider reports open a prefilled public GitHub issue draft. The rider reviews and submits it using their own GitHub account. Review reports against primary sources before changing data; reports never automatically alter stops or schedules. Immediate travel problems should go to SCPT dispatch at 518-234-0952.

## Live GPS is separate

Publishing notices does not turn on GPS. See [GPS_SETUP.md](GPS_SETUP.md) and [LIVE_TRACKING.md](LIVE_TRACKING.md). An authorized location feed, connected devices and correct bus-to-route assignments are still required. A store-bought phone can be used in an agency-approved pilot; an AirTag is not a suitable continuous bus-tracking feed.
