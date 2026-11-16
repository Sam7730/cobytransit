# SCPT route audit — November 16, 2026

The website is **checked against published sources, not certified 100% correct by SCPT**. Every numbered route page in the [SCPT directory](https://ridescpt.com/index.php/routes) was reviewed individually. All **23 fixed-route runs and 469 published timetable rows** were compared, including repeated stops, travel order, times, service days and on-call/drop-off restrictions. This exposed errors in the earlier GTFS-based implementation and contradictions within the agency's sources.

The corrections below are implemented. Unresolved source conflicts remain visible to riders. No agency representative has confirmed the disputed entries, exact boarding sides, current detours or street-by-street directions.

## Route-by-route results

| Service | What was checked | Result and remaining limitation |
| --- | --- | --- |
| [1](https://ridescpt.com/index.php/routes/route-1) | All four runs, 99 rows; Richmondville–Cobleskill–Central Bridge–Schoharie and return; $2; weekdays | Corrected missing Candlewood/ARC calls, Run 3 return times, Run 4 County Office time and pickup rules, and final drop-off restriction. The GTFS line omits the ARC leg and is now dashed and labeled incomplete. |
| [2](https://ridescpt.com/index.php/routes/route-2) | All six runs, 142 rows including the inactive `XXX` row; Cobleskill/SUNY loop; $2; Monday–Saturday | Restored Teen Town. The Run 4 Teen Town time contradicts the listed order; excluded from trip search. Other timed rows agree with GTFS. The GTFS line omits the Teen Town detour and is dashed. |
| [2A](https://ridescpt.com/index.php/routes/route-2a-service) | All seven runs, 124 rows including a duplicate Walmart entry; Walmart–SUNY–village loop; $2; Monday–Saturday | Restored timed Greenbridge departures without changing Route 2's on-call rule. Retained the three existing drop-off corrections across Routes 2/2A. Run 4's duplicate Walmart time needs confirmation. |
| [3](https://ridescpt.com/index.php/routes/route-3) | All four runs, 78 rows; Cobleskill–Middleburgh and return; $2; specific reinstatement notice | Timed calls agree. Removed unlisted GTFS-only calls. Wednesday–Friday takes priority over the directory's Monday–Friday wording. Combined on-call location names remain ambiguous. |
| [5](https://ridescpt.com/index.php/routes/route-5) | All named pickup areas, days, destination categories, reservation deadline and $10 fare | Tuesday/Thursday, pickups starting 7:30 AM, return from Cobleskill about noon; book by noon the preceding day. The generic directory says weekdays. These are reservation areas, not a fixed route or an address-level pickup guarantee. |
| [20 weekday](https://ridescpt.com/index.php/routes/route-20) | Five listed pickups, direction to Capital Region, VA arrival, booking rules and $12 fare | M/W/F: Price Chopper 7:30 AM; four other pickups on call. Albany VA is the first destination around 9:30 AM; others depend on requests. No fixed return time is established. Confirm Monday booking arrangements before the weekend. |
| [20 weekend](https://ridescpt.com/index.php/routes/route-20) | Outward and return stop order, times, semester condition and $12 fare | Price Chopper 11:45 AM → Knapp Circle noon → two park-and-rides on call; return Colonie Center 5:45 PM → Crossgates 6:00 PM. Book by noon Friday. Current weekend operating dates are not established by the new Route 2A student calendar; no weekend trips are generated. |
| [22](https://ridescpt.com/index.php/routes/route-22) | All 26 rows, morning toward Albany and afternoon toward Cobleskill/Richmondville; weekday service; $13/$50/$200 fares | All times and stop order agree. Retained GTFS pickup/drop-off restrictions, including coordinated return drop-offs. Several map pins disagree substantially with GTFS; exact boarding points need confirmation. |
| [23](https://ridescpt.com/index.php/routes/route-23) | Both published runs, request stops, destinations, service days and $12 fare | M/W/F: Price Chopper 8:30 AM, Sharon Springs Post Office on call, Bassett 10:00 AM; Cooperstown departure 3:00 PM and Price Chopper return 4:00 PM. Midday trips and other destinations depend on requests. Map-only locations are not promoted to timed stops. |
| [Separate SUNY campus shuttle](https://cobleskill.edu/students/campus-shuttle-schedule.aspx) | All eight published hourly sequences, five locations per sequence, weekday statement | The page explicitly lists 7:40 AM–2:55 PM, while prose says service into the 4 PM hour. Later trips are not extrapolated. This is separate from SCPT and remains linked to SUNY's schedule. |

## Implemented timetable corrections

### Route 1

- Added ARC after the outbound County Office call on every run: 8:14 AM on Run 1, on call on Runs 2/3, and 2:37 PM on Run 4. The stop already had an agency GTFS coordinate; no new coordinate was guessed.
- Added the initial on-call Candlewood entry to Runs 2–4, preserving its position before Reinhardt's without inventing a pickup time.
- Run 3's return now follows the route page: Parsonage Pines 12:46 PM, County Office 12:48 PM, Annex 12:59 PM, Walmart 1:19 PM, Price Chopper 1:23 PM, Main/Union 1:28 PM, Richmondville Fire Department 1:40 PM and Reinhardt's 1:42 PM. The feed was 15 minutes earlier at these timed calls.
- Run 4's second County Office call is 2:46 PM, not 2:48 PM. Its 2:32 PM call is not marked drop-off-only on the page; its final Price Chopper call at 3:59 PM is. The corrected flags reflect that distinction.
- The GTFS trip named `Route 1-Loop 4` actually contains the first morning run. Rider-facing run labels now follow the published run numbers; original trip IDs remain stable for integrations.

### Route 2

- Added Teen Town in the published position after North Grand/Chapel: on call on Runs 1, 2, 5 and 6; 11:00 AM on Run 3.
- Run 4 lists Teen Town **12:41 PM before SUNY 12:35 PM**. The call remains in the displayed order with **Confirm with dispatch**, and is excluded as both origin and destination in trip search and from departure boards. An internal numeric ordering placeholder is never displayed or treated as a departure.
- The `XXX Walmart` entry at the start of Run 2 is not a departure and does not create a call.
- Two nearby Teen Town stop records exist in GTFS. The restored calls use `STOP_d52dc432-8a57-42a0-8d86-59a81117bb6e`, nearest the agency map pin; the duplicate stays marked as having no imported scheduled service. This does not verify boarding side.

### Route 2A

- The page publishes Green Apartments/Greenbridge times on all seven runs. The shared GTFS stop name contained “On call,” which incorrectly suppressed those departures. The stop now has a neutral name; per-call flags keep Route 2 on call and Route 2A timed.
- Run 4 lists Walmart at both **5:22 PM and 5:25 PM**. The existing 5:25 PM GTFS departure is retained, the conflict is displayed, and no extra trip is fabricated. Run 3's terminal Walmart arrival at 5:22 PM is unchanged.

The page’s “Campus Apartments” and “Green Apartments” labels are mapped to the existing Campus Drive and Greenbridge GTFS records. The page does not independently establish their exact boarding coordinates.

### Route 3

- Removed eight Schoharie Bassett Clinic calls and two additional return ARC calls that appear in GTFS but are absent from the individual route page's published runs. Their records were request-only, so they were not standard trip-search departures before this change.
- “Indian Springs/Cliffside” is a combined on-call entry. It maps to the existing GTFS Cliffside/Indian Acres records with an explicit confirmation note; their identity and within-area order are not independently certified. No fixed time is assigned.

### Route 22

- Both directions and all 26 times match. Return times remain visible in the timetable even where GTFS requires driver coordination; those coordinated destinations remain excluded from the direct-trip planner. The route page does not settle those GTFS boarding restrictions.

## Geography and directions

All **75 point entries** in the maps embedded on Routes 1, 2, 3 and 22 were examined. Those maps contain points, not street-path polylines. The website's twelve route shapes remain the agency GTFS shapes; connecting pins with guessed streets would not establish a verified bus path.

Two material shape omissions were measured against the relevant GTFS lines: ARC on Route 1 is about **2.76 km** from its line, and Teen Town on Route 2 about **281 m**. Those route lines are dashed with route-specific explanations. The timetable and stop marker now include the published stops, but the missing driving paths require agency geometry.

Nine map-to-GTFS comparisons exceeded 150 m, affecting eight distinct stops. Examples:

| Location | Approximate pin separation | Handling |
| --- | ---: | --- |
| SUNY Knapp Circle | 367–376 m on Routes 2/3 maps | Keep GTFS pin and show location-confirmation note. Route 1's map has a different SUNY pin. |
| MacArthur | 861 m | Keep GTFS pin; agency map says MacArthur Ave while timetable says MacArthur/S. Grand. Confirm intersection. |
| Duanesburg park-and-ride | 2.27 km | Keep GTFS pin and flag disagreement; do not choose a new pickup point without confirmation. |
| State Office Campus | 644 m | Keep GTFS pin and flag disagreement. |
| Wolf Road | 1.97 km | Keep GTFS's NYSDOT/50 Wolf Road record and flag disagreement with the generic map pin. |

These are approximate straight-line comparisons, not surveyed errors or evidence that one source is correct. Smaller differences also do not verify curb side, entrance or accessibility. The other flagged comparisons are Jay Ridge, Hammerstone Mohawk and ARC.

The Route 1 map includes Middleburgh-area places absent from its timetable. The Route 3 map includes Richmondville-area places absent from its timetable. Route 22's map includes Bryant & Stratton, absent from both timed lists. Those extra map pins are not invented as scheduled calls.

Route 5's ten pickup polygons and Routes 20/23's twelve supplemental points were checked against their page descriptions. Route 23's Zion Church, Bassett Hall and Richmondville Fire House entries are map locations only, with no corresponding timed call in the written schedule. The service keeps explicit reservation/confirmation labels.

## Calendar, fares and coverage

- The November 16 download of the 511NY archive still has SHA-256 `7d90990a545e4eba79d02d000cec26e047c2c35a53da4ba36202c47d47b98b97`. It supplies 65 stop records, 23 trips, 12 shapes and 39 calendar exceptions. Coverage still ends **December 31, 2026**; a fresh download does not extend it.
- The [policies page](https://ridescpt.com/index.php/policies) lists the holiday closures. The general GTFS holiday exclusions are retained.
- The [SUNY page](https://ridescpt.com/index.php/suny-cobleskill) now lists **fall 2026–spring 2027**, explicitly naming **Route 2A**. The previous outdated-calendar warning has been removed. Its November 2–7 range includes Election Day November 3, despite the agency closure notice. It is not used to override holidays, establish all-year general-public operation, infer free fares or set weekend Route 20 dates. Confirm the applicability of student dates with SCPT.
- Published fares agree with the catalog: $2 on Routes 1/2/2A/3; $10 on 5; $12 on 20/23; $13 daily, $50 weekly and $200 monthly on 22. Fare eligibility and exceptions still depend on the rider and service.
- The county boundary is geographic. Reservations, service days and dispatch decisions determine actual coverage; it does not mean every address has a fixed bus stop.

## Reproducibility and follow-up

`data/route-review.json` records each published fixed-route timetable row, its mapped call indices and stop IDs, the two skipped source entries, all 75 fixed-route map comparisons and source hashes. `data/reviewed-corrections.json` records the reviewed calls, direction/run labels and stop notes. `scripts/import-gtfs.py` applies these only to the exact audited archive hash and refuses a changed archive until it is reviewed. Raw request-stop placeholders are never advertised as fixed departures.

Regression tests cover all source rows, key corrected times, request/drop-off rules, uncertainty exclusions, direction labels and geographic warning coverage. Browser tests check that riders can actually see the corrections and conflicts.

To certify the remaining information, SCPT needs to resolve the Teen Town and Walmart conflicts, confirm disputed stop coordinates/boarding sides, supply the missing ARC/Teen Town driving geometry, clarify the combined Route 3 request stops and current student/weekend calendars. This audit does not claim that operator confirmation has occurred.
