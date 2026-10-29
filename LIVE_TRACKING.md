# Live tracking integration status

No authorized SCPT GTFS-Realtime or AVL endpoint was verified or connected. The site reports `connected: false` at `/api/status`. No fabricated production bus positions or arrival predictions are generated.

An agency partnership is needed to confirm feed availability, permitted use, credentials, route/trip ID mapping, operational contact and alert ownership. Vehicle positions and trip updates should be refreshed promptly and marked stale after 90 seconds, following GTFS-Realtime best practices: https://gtfs.org/documentation/realtime/realtime-best-practices/ . A timestamp on a periodically generated feed does not prove that each vehicle measurement is fresh.

When approved data is available, keep secrets server-side; bound feed downloads, validate identifiers and coordinates, rate-limit ingestion and show actual measurement age. Never derive a live ETA merely from a moving animation or a static timetable.

No messages to SCPT or SUNY have been sent on the user's behalf.
