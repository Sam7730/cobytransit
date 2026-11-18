# Passenger usability and verification

The passenger interface uses larger text, visible focus outlines, named buttons, native form controls, a skip link and a linear narrow-screen layout. Routes have text stop lists so using the map is optional. Stop details are in the document flow rather than floating over the map. Map points support Enter and Space, and include larger pointer targets. Motion preferences are respected.

Every imported stop can be selected as an origin or destination. The app distinguishes scheduled service, arranged service, drop-off-only records and locations without imported times. These labels describe the feed; they do not promise a bus is operating. Arranged trips are never automatically booked. Separate records are not merged just because names look similar.

Direct and optional one-transfer planning respect the calendar and boarding restrictions. Transfers require an identical agency stop ID, different routes and 10–90 minutes between buses. Walking transfers are not inferred. Transfers are not guaranteed and return trips for transfer results need a separate search.

Verification for version 2.1:

- Browser checks opened all 65 stop records and verified details and planning/directions actions.
- All 10 service cards and all 23 imported run timetables opened successfully.
- Granite Drive to Middleburgh Library produced Route 2 → Route 3 transfer choices; an on-call origin displayed dispatch guidance.
- Narrow layout checked at a 440px body width, including stop detail controls; no body horizontal overflow observed.
- Automated tests cover all eligible scheduled stop pairs, on-call restrictions, holidays, next service days, transfers, security, offline behavior and GPS authorization.

This is not a formal WCAG conformance certification. Screen-reader testing with riders, physical boarding accessibility verification and actual agency GPS onboarding remain separate work. The site never infers wheelchair boarding conditions when the feed omits them.
