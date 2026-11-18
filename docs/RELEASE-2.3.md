# CobyTransit 2.3 — combined launch release

The previously separate hosted 2.2 code and GitHub 1.4 code now share one release. This preserves transfer/overnight planning, next-service suggestions, Node/Docker persistence, authenticated GPS ingestion and dispatch, alongside the audited routes, numbered run maps, staff notices, cancellations and source monitoring.

Deployment preserves production storage. An older copy of the same GTFS feed cannot override the bundled route audit merely by having a newer download date. Known SCPT source conflicts remain documented, and the current calendar ends December 31, 2026.

Live fleet feeds, device credentials, traffic credentials and notice-admin credentials are not provisioned automatically. The connected Site keeps its existing audience unless the owner changes it. GitHub remains the canonical development repository; the hosted source is synchronized when publishing.
