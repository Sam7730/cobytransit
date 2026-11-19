# Connect live GPS

The full path is implemented: **authorized device → GPS API → persistent store → assigned route → passenger map**. No real SCPT vehicle feed has been connected. Obtain agency approval and vendor documentation before connecting Verizon or another fleet system. A browser location permission is not agency authorization.

## 1. Configure credentials

Generate a different secret for every device and the dispatcher:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy `.env.example` to `.env`. Add your generated values:

```dotenv
GPS_DEVICES_JSON='{"bus-01":"YOUR_FIRST_RANDOM_SECRET","bus-02":"YOUR_SECOND_RANDOM_SECRET"}'
DISPATCH_TOKEN=YOUR_DIFFERENT_DISPATCH_SECRET
```

Replace placeholders with at least 32 random characters. Device IDs use 1–40 letters, numbers, underscores or hyphens. Secrets stay server-side; distribute each device's own credential securely. Never put tokens into URLs, Git, screenshots or public issues. Restart Node after configuration changes. On Workers use secret settings instead of `.env`.

## 2. Assign a vehicle

Visit `/operations.html`, enter the dispatcher token, select the route and vehicle, and save. One vehicle can serve one route at a time; the current model supports one active bus per route. Selecting a replacement changes the assignment atomically. Removing the assignment hides that route's vehicle on the next passenger refresh, even if the device keeps reporting.

The dashboard requires authentication for both reads and writes. It uses a revision check to prevent one dispatcher silently overwriting another. Refresh after a conflict. Tokens remain in tab memory, not localStorage; use Lock when finished.

## 3. Send real measurements

On an authorized phone, open `/driver.html` over HTTPS, enter its ID/token and choose **Start sharing**. This expressly requests browser location permission. Stay parked while configuring it. Keep the page visible; mobile browsers can suspend background location, so this is a device test, not a production background tracker.

For dedicated hardware or an approved server-side vendor adapter:

```http
POST /api/gps
Authorization: Bearer <this vehicle's secret>
Content-Type: application/json

{
  "vehicleId": "bus-01",
  "latitude": 42.679,
  "longitude": -74.49,
  "accuracy": 12,
  "measuredAt": "<actual measurement time as UTC ISO 8601 ending in Z>"
}
```

The coordinates above illustrate the format only; do not present them as real measurements. Send an actual device reading every 10–15 seconds. A successful response is HTTP 202. Each credential is restricted to its own vehicle ID. The adapter must map the vendor's coordinates, accuracy in meters and **measurement timestamp**, not its download time.

Validation rejects coordinates outside the broad service region (41–44° N, 76–72° W), accuracy over 500 m, future reports over 30 seconds, reports over 15 minutes old, duplicate/out-of-order measurements, oversized payloads and unsupported methods. A device can write at most every five seconds; conditional storage writes reject races. Responses 409 and 429 mean wait for the next fresh measurement. Rotate leaked credentials immediately.

## 4. Verify the entire path

- Open `/api/vehicles`: the assigned vehicle should appear with `state: "live"`, the original measurement time and accuracy.
- Select its route on the passenger map; refresh occurs every 15 seconds. Click its vehicle row to center the map.
- Stop uploads. The passenger map hides the report after 90 seconds. The dispatcher can still see it marked **stale** until it expires after 15 minutes.
- Remove or replace the assignment in dispatch. The old bus must no longer appear on that route.
- Restart the server. Stored assignments should remain. Offline or failed GPS requests clear passenger markers.

Only assigned vehicles with recent reports are public. The service stores the latest sample per configured device, not a travel history. Configure a host-level rate limit for unauthenticated traffic in production; application validation and per-device throttling are not a network DDoS service.

## API reference

| Endpoint                | Access            | Behavior                                                                  |
| ----------------------- | ----------------- | ------------------------------------------------------------------------- |
| `GET /api/vehicles`     | Visitor           | Assigned reports with freshness; no tokens                                |
| `POST /api/gps`         | Device bearer     | Validate and persist one sample                                           |
| `GET /api/operations`   | Dispatcher bearer | Registered vehicle reports and assignments                                |
| `POST /api/assignments` | Dispatcher bearer | `{routeId, vehicleId, expectedRevision}`; null vehicle removes assignment |

GPS is never cached offline. Stale locations are not live ETAs. Production arrival prediction requires trip matching, direction, stop progression and validation against actual arrivals. GTFS-Realtime protobuf and Verizon APIs are not implemented adapters; approved integrators can convert their feeds to the normalized endpoint above. Tokens authorize senders but cannot prove a device's physical location.
