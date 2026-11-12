# Data provenance — reviewed October 23, 2026 (America/New_York)

This project continues the earlier CobyTransit concept, replacing its approximate waypoints and hand-selected timetable samples with the downloaded agency GTFS snapshot. It does not copy Alpine Systems software, artwork, trademarks or tracking feeds. The Oneonta reference informed only the interaction pattern of selecting routes and map stops.

## Primary sources
| Source | Use | URL |
| --- | --- | --- |
| 511NY public agency GTFS | Stops, shapes, 23 trips across routes 1, 2, 2A, 3, 22; calendars and 39 exceptions | https://s3.amazonaws.com/datatools-511ny/public/Schoharie_County_Public_Transit.zip |
| RideSCPT route directory and individual pages | Route descriptions, fares, selected timetable checks, reservation services | https://ridescpt.com/index.php/routes |
| RideSCPT Route 3 | Wed/Thu/Fri reinstatement from April 15, 2026 | https://ridescpt.com/index.php/routes/route-3 |
| RideSCPT Route 20 | Reservation and weekend-mall information | https://ridescpt.com/index.php/routes/route-20 |
| RideSCPT notices | Route 20 return March 2, 2026 | https://ridescpt.com/index.php/announcements |
| RideSCPT fares | Published fare structure | https://ridescpt.com/index.php/homepage/fares |
| RideSCPT SUNY calendar | Identified as outdated, not applied to 2026–27 | https://ridescpt.com/index.php/suny-cobleskill |
| RideSCPT policies | Holiday/ADA context | https://ridescpt.com/index.php/policies |
| RideSCPT contact | Dispatch 518-234-0952; 114 Rock Road, Cobleskill | https://ridescpt.com/index.php/contact-us |
| SUNY shuttle | Separate campus service, links to official map and times | https://cobleskill.edu/students/campus-shuttle-schedule.aspx |
| SUNY transport guide | Corroborates operator and campus connections | https://www.cobleskill.edu/campus-life/student-life/public-transportation-from-suny-cobleskill.aspx |
| GTFS specification | Pickup/drop-off types and calendar semantics | https://gtfs.org/documentation/schedule/reference/ |

## Discovery and data terms
Transitland's catalog https://www.transit.land/feeds/f-schoharie~county~public~transit identifies the fixed 511NY download and links to OPEN-NY terms at https://data.ny.gov/download/77gx-ii52/application/pdf . The terms document was downloaded and read for this work. Transit data is supplied as source data, not relicensed under the application MIT license. No agency logos are included. OpenStreetMap street tiles are enabled by default and carry OpenStreetMap contributor attribution; see https://www.openstreetmap.org/copyright .

The archive hash and correction records are in `data/feed-manifest.json`. Dates in the GTFS indicate service coverage, not a guarantee of current operation. No authenticated or officially authorized GTFS-Realtime/AVL endpoint was verified or connected; absence of a verified endpoint is not proof that none exists.

## Conflicts and conservative decisions
- Route directory says Route 3 Mon–Fri; specific notice and GTFS both say Wed–Fri. Use specific notice/calendar.
- SUNY free-service page still says Fall 2025–Spring 2026 and contains an inconsistent March year. Do not infer Fall 2026 eligibility or weekend operating dates. Never automatically assume a student fare is free.
- Office hours vary (7–5 footer, 8–4 notice, 7–2 text). Do not promise a particular answering time.
- Weekend Route 20 page says reserve by noon Friday; old SUNY calendar says 3 p.m. Friday. Flag conflict and refer to dispatch.
- Campus page describes service into the 4 p.m. hour but publishes explicit stops only through 2:55 p.m. Do not extrapolate later runs; campus schedule is not in the county search/map.
- GTFS omits drop-off-only flags present on agency pages at Route 2 run 3 Walmart 11:20, Route 2A run 6 Walmart 19:47 and Route 2A run 7 Price Chopper 20:58. Apply pickup_type=1 at these endpoints with correction records.
- GTFS includes nominal times at request stops. Do not present them as fixed boarding times. Stop names containing 'On call' are also excluded conservatively even if a particular GTFS call has pickup_type=0.
- Route 22 return drop-offs are driver-coordinated in GTFS. Keep restrictions rather than silently changing them to standard drop-offs.
- The feed has 65 stop records, including records not used in the 23 imported trips. Stop browser exposes all records with route availability indicated.
- The interactive Leaflet map uses OpenStreetMap street tiles based on OpenStreetMap. Colored route lines and stop markers come from the 511NY agency snapshot. Services without fixed GTFS geometry remain linked to official information; no routes are invented.

Research was targeted to the official agency, college and feed; it is not an exhaustive audit of every local document, road condition, operator change or stop location.

## Release 1.1 maintenance and security references
- Shared validation and runtime review metadata keep retrieval dates separate from actual service confirmation. Dynamic runtime data can be newer than the fallback snapshot in the source ZIP.
- GTFS-Realtime best practices and 90-second vehicle/trip-update freshness guidance: https://gtfs.org/documentation/realtime/realtime-best-practices/
- Cloudflare response security headers: https://developers.cloudflare.com/workers/examples/security-headers/
- Cloudflare notes that Worker-generated responses need response headers rather than relying on an assets `_headers` file: https://developers.cloudflare.com/workers/static-assets/headers/
- W3C accessibility guidance: https://www.w3.org/WAI/standards-guidelines/wcag/

## Map integration check — November 11, 2026 (Eastern)

The current 511NY archive was downloaded again and still has SHA-256 `7d90990a545e4eba79d02d000cec26e047c2c35a53da4ba36202c47d47b98b97`, matching the reviewed baseline. This targeted check does not change the snapshot retrieval/review dates or claim a complete timetable re-audit. RideSCPT home and Routes 1, 2 and 2A were consulted for the map work; the home page includes the November 11 holiday closure and newer office hours. Existing conflicts and dated student calendars still need operator confirmation.

- Basemap: https://www.openstreetmap.org/copyright
- Mapping library: https://leafletjs.com/ (1.9.4, BSD-2-Clause; license bundled in `web/assets/vendor/LEAFLET-LICENSE.txt`)
- Optional traffic incidents: https://developer.tomtom.com/traffic-api/documentation/traffic-incidents/incident-details
- Optional flow tiles: https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles
- Official road information and cameras: https://511ny.org/

No live SCPT feed or traffic account was verified. See `LIVE_TRACKING.md` for the implemented API contract and required provider configuration.
