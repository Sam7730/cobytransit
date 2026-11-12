# Live bus locations and road traffic — release 1.3

The street map works without credentials. It uses locally bundled Leaflet 1.9.4, OpenStreetMap street tiles with contributor attribution, and the existing 511NY SCPT route shapes and stops. The map starts in Cobleskill, within Schoharie County; the county view and regional route fit cover the wider service area.

**No SCPT vehicle feed or traffic-provider key is connected in this repository.** Targeted checks of RideSCPT and the public feed catalog on November 11, 2026 did not verify a public SCPT live-location endpoint. This does not prove none exists. The Oneonta Alpine tracker is a design reference, not a source of SCPT vehicle positions. No messages have been sent to either operator.

## Configure an authorized bus feed

Set these server runtime variables through your hosting provider's environment/secret settings. For local development, `npm run dev` reads the same variables from the process environment. Do not commit credentials or paste them into browser code. A static-only deployment can display routes but cannot provide these APIs.

| Variable | Purpose |
| --- | --- |
| `SCPT_VEHICLES_URL` | Authorized public HTTPS endpoint returning normalized vehicle JSON or a full-dataset GTFS-Realtime JSON representation. Only the administrator can configure this URL. |
| `SCPT_VEHICLES_TOKEN` | Optional secret bearer token sent only to that endpoint. Redirects are rejected. |
| `SCPT_ROUTE_MAP` | Optional JSON object mapping provider route IDs to CobyTransit route IDs, e.g. `{"agency-route-2":"2"}`. |
| `TOMTOM_API_KEY` | Secret TomTom Traffic API key for flow tiles and present incidents. Set only after arranging provider access and checking usage terms. |

The normalized bus contract is:

```json
{
  "vehicles": [
    {
      "id": "agency-vehicle-id",
      "label": "Bus 12",
      "routeId": "2",
      "lat": 42.679,
      "lon": -74.48,
      "timestamp": 1794448800,
      "bearing": 90
    }
  ]
}
```

This is a schema example, not a real bus report. `timestamp` must be the vehicle's actual GPS measurement time in Unix **seconds**, refreshed by the provider. Never use the time the feed was downloaded. Supported route IDs are `1`, `2`, `2A`, `3`, `5`, `20`, `20W`, `22`, `23`. Unknown route IDs require an explicit mapping; a matching snapshot trip ID can resolve an omitted route ID.

GTFS-Realtime JSON accepts `entity[].vehicle`, `vehicle.position.latitude/longitude`, vehicle timestamps, and camelCase or snake_case trip/route fields. Binary protobuf feeds and differential feeds need a provider-side JSON adapter before use. This release does not infer live arrival predictions, ingest TripUpdates, interpolate bus movement, or track drivers' phones.

`GET /api/vehicles` returns `configured`, `connected`, `status`, `message`, `checkedAt`, and `vehicles`. Status distinguishes unconfigured, live, empty, stale, invalid and unavailable feeds. A connected empty feed does not prove buses are out of service. Responses are not cached offline. The browser polls every 30 seconds while visible and rechecks GPS age every five seconds; readings older than 90 seconds or more than 15 seconds ahead are hidden. An outage clears displayed positions. Only positions in the documented SCPT service region are accepted. Popup times are Eastern Time.

## Traffic

`GET /api/traffic` returns current TomTom incidents within the service bounding box (42.25–42.95 N, 75.05–73.65 W). The UI offers incident/roadwork/closure markers and colored flow tiles through `/api/traffic/tiles/{z}/{x}/{y}.png`. Flow colors compare current travel speeds with free flow; they do not indicate bus delay. The provider determines road coverage. No provider can promise every traffic feature or incident.

Provider requests are bounded, timed out after eight seconds, and coalesced in per-Worker-isolate caches (15 seconds for vehicles; 60 seconds for traffic). This is not a global rate limit. Before enabling paid feeds on a public host, configure host-level request limits and provider quotas. Traffic tiles are limited to the service region and zooms 8–18. Secrets, provider URLs and raw error bodies are never returned to the browser. Unconfigured controls remain disabled, and 511NY provides a direct link to official traffic information and cameras.

## Verify before enabling for riders

Confirm agency authorization, vehicle/trip/route mappings, actual GPS timestamps and provider terms. Compare a known bus with dispatch, test an empty fleet, stale measurements and an outage, and check provider coverage for the local roads. Tests use labeled fixtures only; no production location data or provider account was available for an end-to-end live-feed test.

The basemap contacts OpenStreetMap by default (IP address, referrer origin and requested area); Streets can be switched off. Live/traffic requests go through this application's server. Provider attribution stays visible. No road tiles or live positions are included in offline downloads. Follow OpenStreetMap's tile usage policy (https://operations.osmfoundation.org/policies/tiles/); provision a suitable tile provider for heavy traffic. This application sends the referrer origin, uses normal HTTP tile caching and does not prefetch or bulk-download tiles.

## Hardware pilot

See [GPS_SETUP.md](GPS_SETUP.md) for researched Walmart/Target hardware options and an operator-approved Android/Traccar pilot. The service validation bounds include Cooperstown for Route 23. No hardware has been purchased or connected.
