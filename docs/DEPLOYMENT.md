# Deployment

## Option 1: Node server

Requirements: Node.js 22.9+, a persistent writable data folder and HTTPS for public access.

```sh
cp .env.example .env
npm start
```

The server binds port 4173 by default. Configure `PORT`, `HOST`, `DATA_DIR`, and `PUBLIC_ORIGIN` in `.env` as needed. Set `PUBLIC_ORIGIN=https://your-domain.example` behind a trusted reverse proxy. Forward to the Node port; do not expose the internal port directly. Use one process per data directory. The application does not implement TLS itself.

The data directory contains staff notices, the latest GPS sample per device and route assignments; it must survive restarts. Never serve it as a static directory. Keep backups private. No GPS history database is collected.

## Option 2: Docker

```sh
docker compose up --build -d
docker compose logs -f
```

The included Compose configuration binds localhost:4173 and keeps `/data` in a named volume. Add a TLS reverse proxy on the same host. Do not use `docker compose down -v` unless you intend to delete persisted data. Use Docker Compose 2.24+ for the optional env-file setting.

## Option 3: Cloudflare Worker + R2

Install the Cloudflare Wrangler CLI in your deployment environment and authenticate to your own account. Create an R2 bucket:

```sh
npx wrangler r2 bucket create cobytransit-data
npm run build
npx wrangler deploy
```

`wrangler.jsonc` runs the generated `worker/index.js` and rebuilds before deployment. Add an `r2_buckets` entry with `binding: "BUCKET"` and your bucket name before enabling persistent staff or GPS features; see [STAFF_SETUP.md](../STAFF_SETUP.md). Store GPS device credentials using secret prompts, never in that configuration file:

```sh
npx wrangler secret put GPS_DEVICES_JSON
npx wrangler secret put DISPATCH_TOKEN
```

See [Live tracking](LIVE_TRACKING.md) for the secret formats. Schedule-write maintenance is disabled on a public Worker by default; update reviewed data through Git and redeploy. Do not set `UPDATES_ENABLED=owner-private` on a public host.

## Existing ChatGPT Site

The owner's hosted Site has a separate `.openai/hosting.json`, R2 bucket and access policy. This GitHub repository intentionally excludes that account-specific identity. Updating GitHub does not automatically update the Site; the same reviewed source must also be built and published there. Preserve its existing audience. A private Site's sign-in gate also applies to GPS uploads: external devices require an authorized integration or a separately deployed endpoint accessible to the devices.

## Verification after deployment

1. Open `/` and verify route selection, timetable and a direct trip.
2. Check `/api/status` and `/api/vehicles`. With no device configuration, the latter returns `configured: false` and no vehicles.
3. Configure test credentials and follow the complete GPS smoke test in [Live tracking](LIVE_TRACKING.md).
4. Restart the server; assignments and accepted positions must persist.
5. Check HTTPS, response security headers and that `/api/operations` rejects missing/incorrect tokens.

There is no paid-service account provisioning, DNS change, or agency GPS contract bundled with the repository. For more than 100 devices or many concurrent viewers, add an agency-scale ingestion/queue architecture and load tests before expanding this deployment.
