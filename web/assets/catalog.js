export const routes=[
{id:'1',name:'Richmondville–Schoharie',sub:'Cobleskill · Central Bridge · Schoharie',group:'local',days:'Mon–Fri',fare:'$2',color:'#376d92',note:'A county corridor with timed and on-call stops. Route deviations have an additional charge.',slug:'route-1'},
{id:'2',name:'Cobleskill local',sub:'SUNY · Village · Walmart',group:'local',days:'Mon–Sat',fare:'$2',color:'#1d7356',note:'Daytime local loop through Cobleskill. Some stops are on call; standard timed stops are searchable.',slug:'route-2'},
{id:'2A',name:'Cobleskill afternoon & evening',sub:'Walmart · SUNY · Village',group:'local',days:'Mon–Sat',fare:'$2',color:'#965c1a',note:'Afternoon and evening service. Several final stops are drop-off only; the trip search respects these restrictions.',slug:'route-2a-service'},
{id:'3',name:'Schoharie Valley',sub:'Cobleskill · Schoharie · Middleburgh',group:'local',days:'Wed–Fri*',fare:'$2',color:'#715b96',note:'Agency notice effective April 15, 2026 limits service to Wednesday, Thursday and Friday. Confirm before travel.',slug:'route-3'},
{id:'5',name:'County demand response',sub:'Outlying areas of Schoharie County',group:'regional',days:'Tue · Thu',fare:'$10',color:'#7f8f66',note:'Reserved pickups from outlying county communities into Cobleskill. Call by noon the day before; SCPT may reschedule areas. No fixed bus path is published.',slug:'route-5'},
{id:'20',name:'Capital Region reservations',sub:'Albany VA · Schenectady · Capital Region',group:'regional',days:'Mon · Wed · Fri',fare:'$12',color:'#64828b',note:'Reservation required by noon the day before per route page; office closed weekends. Confirm Monday booking cutoff with dispatch. Veterans visiting the VA ride free.',slug:'route-20'},
{id:'20W',name:'Weekend mall service',sub:'Crossgates Mall · Colonie Center',group:'regional',days:'Semester dates*',fare:'$12',color:'#64828b',note:'Semester-only weekend service. The current SUNY calendar names Route 2A and does not establish weekend mall dates. Confirm the operating date; reserve by noon Friday per the Route 20 page.',slug:'route-20'},
{id:'22',name:'Albany commuter',sub:'Richmondville · State Campus · Albany',group:'regional',days:'Mon–Fri',fare:'$13',color:'#425d73',note:'Published daily rate $13; weekly $50; monthly $200. Some return stops are marked for driver coordination in GTFS.',slug:'route-22'},
{id:'23',name:'Cooperstown & Bassett',sub:'Sharon Springs · Cooperstown · Bassett',group:'regional',days:'Mon · Wed · Fri',fare:'$12',color:'#9a7d69',note:'Demand-response service by reservation. Contact dispatch to confirm your pickup, destination and return trip.',slug:'route-23'},
{id:'campus',name:'SUNY campus shuttle',sub:'Commuter Lot · Suffolk Circle · Old Quad',group:'campus',days:'Mon–Fri',fare:'See SUNY',color:'#779365',note:'SUNY describes service from the 7 a.m. hour to the 4 p.m. hour, but its detailed posted list ends at 2:55 p.m. Later runs are not inferred. This is separate from county buses.',url:'https://cobleskill.edu/students/campus-shuttle-schedule.aspx'}
];
export const routeUrl=r=>r.url||`https://ridescpt.com/index.php/routes/${r.slug}`;
export const sources=[
['511NY agency GTFS snapshot','65 stop records, 23 scheduled trips, 12 route shapes, service dates and holiday exceptions. Downloaded and reviewed Nov 16, 2026; valid through Dec 31, 2026. Timetable overrides are recorded in the route audit.','https://s3.amazonaws.com/datatools-511ny/public/Schoharie_County_Public_Transit.zip'],
['RideSCPT route pages','All eight numbered route pages reviewed; all 469 published rows across 23 fixed-route runs compared, with corrections and unresolved conflicts documented.','https://ridescpt.com/index.php/routes'],
['RideSCPT Route 3 notice','Wednesday–Friday reinstatement effective Apr 15, 2026; takes priority over the generic weekday directory.','https://ridescpt.com/index.php/routes/route-3'],
['RideSCPT announcements','Route 20 reinstatement effective Mar 2, 2026; reservations required. Reviewed snapshot, not a live feed.','https://ridescpt.com/index.php/announcements'],
['RideSCPT fares and passes','Published fares, token information and conditional student/faculty travel.','https://ridescpt.com/index.php/homepage/fares'],
['SUNY service and blackout dates','Now lists Fall 2026–Spring 2027 for Route 2A. It does not confirm weekend Route 20 dates; holiday conflicts still need clarification.','https://ridescpt.com/index.php/suny-cobleskill'],
['SUNY Cobleskill shuttle schedule','Campus stop order and explicitly published times; no extrapolated afternoon service.','https://cobleskill.edu/students/campus-shuttle-schedule.aspx'],
['SUNY public transportation guide','Confirms the county operator, campus connections and dispatch contact.','https://www.cobleskill.edu/campus-life/student-life/public-transportation-from-suny-cobleskill.aspx'],
['RideSCPT policies and contact','Holiday closures, accessibility information and dispatch contact. Office-hour statements conflict across pages.','https://ridescpt.com/index.php/policies'],
['OPEN-NY data terms','Terms linked from the feed catalog. Application code and third-party transit data have separate terms.','https://data.ny.gov/download/77gx-ii52/application/pdf']
];
export const notices=[
{tag:'ROUTE 3 · SERVICE DAYS',title:'Wednesday through Friday service',body:'The route page reinstates service on Wednesdays, Thursdays and Fridays beginning April 15, 2026. The general directory still says Monday–Friday. CobyTransit uses the specific service notice, which also matches the downloaded GTFS calendar.',url:'https://ridescpt.com/index.php/routes/route-3'},
{tag:'ROUTE 2 · TIME CONFLICT',title:'Confirm Teen Town on the noon run',body:'SCPT lists Teen Town at 12:41 PM before a 12:35 PM SUNY stop. That entry is shown as unconfirmed and excluded from trip search and departures until the agency clarifies the time and order.',url:'https://ridescpt.com/index.php/routes/route-2'},
{tag:'ROUTE 2A · DEPARTURE CONFLICT',title:'Confirm the fourth Walmart departure',body:'Run 4 shows both 5:22 PM and 5:25 PM at Walmart. CobyTransit retains 5:25 PM, which matches GTFS, and does not create an extra 5:22 PM trip. Confirm this run with dispatch.',url:'https://ridescpt.com/index.php/routes/route-2a-service'},
{tag:'SUNY TRAVEL · CALENDAR',title:'New 2026–27 dates need route-specific checks',body:'The SUNY page now publishes fall 2026–spring 2027 dates naming Route 2A. It includes November 3, which conflicts with the agency holiday closure. This calendar is not applied to other routes or used to assume free fares. General holiday closures take priority.',url:'https://ridescpt.com/index.php/suny-cobleskill'},
{tag:'ROUTE 20 · RESERVATIONS',title:'Confirm the weekend operating date',body:'The Route 20 page requires weekend bookings by noon Friday. The current SUNY calendar names Route 2A, so it does not establish weekend mall operating dates. For Monday weekday service, confirm booking arrangements before the weekend.',url:'https://ridescpt.com/index.php/routes/route-20'}
];

// Official service coverage, checked November 12, 2026. These are published
// service areas, not inferred fixed paths or a guarantee of address-level pickup.
export const serviceDetails = {
 '1': {areas:['Richmondville','Cobleskill','Central Bridge','Schoharie']},
 '2': {areas:['Cobleskill','SUNY','Walmart']},
 '2A': {areas:['Cobleskill','SUNY','Walmart']},
 '3': {areas:['Cobleskill','Central Bridge','Schoharie','Middleburgh']},
 '5': {areas:['Conesville','Gilboa','Blenheim','Fulton','Sharon','Seward','Carlisle','Jefferson','Summit','Richmondville','Cobleskill'], reservation:true, notes:[
   'Tuesday: Conesville, Gilboa, Blenheim, Fulton, Sharon, Seward and Carlisle.',
   'Thursday: Jefferson, Summit, Richmondville and Fulton.',
   'Pickups start at 7:30 AM; the return leaves Cobleskill around noon. Reserve by noon the day before. Confirm your pickup time with dispatch.'
 ]},
 '20': {areas:['Cobleskill','Middleburgh','Schoharie','Albany','Schenectady','Capital Region'], reservation:true, notes:[
   'Monday, Wednesday and Friday. Published departure: Price Chopper, Cobleskill at 7:30 AM. Other listed pickups are on call.',
   'Albany VA is the first destination, approximately 9:30 AM; other destinations are by request. Reserve by noon the day before; confirm Monday arrangements before the weekend.'
 ]},
 '20W': {areas:['Cobleskill','SUNY','Colonie','Crossgates','Albany'], reservation:true, notes:['Semester-only Saturday/Sunday mall service; confirm your date with dispatch. The SUNY calendar names Route 2A, not this service. Reserve by noon Friday.', 'Published outward pickups: Price Chopper 11:45 AM; SUNY Knapp Circle noon; I-88/Route 145 and I-88/Route 30A on call. Return: Colonie Center behind Boscov’s 5:45 PM; Crossgates by Best Buy 6:00 PM. These times do not confirm service on your date.']},
 '22': {areas:['Richmondville','Cobleskill','Albany','State Campus']},
 '23': {areas:['Middleburgh','Schoharie','Cobleskill','Sharon Springs','Sharon','Cooperstown','Bassett'], reservation:true, notes:[
   'Monday, Wednesday and Friday. Published departure: Price Chopper, Cobleskill at 8:30 AM; Sharon Springs Post Office is on call.',
   'The page lists Bassett at 10:00 AM, departure from Cooperstown at 3:00 PM and return to Price Chopper at 4:00 PM. Midday trips and other destinations depend on requests. Confirm all arrangements with dispatch.'
 ]},
 'campus': {areas:['SUNY','Cobleskill']}
};

// Source conflicts stay beside the affected service, not hidden in developer docs.
const reviewNotes={
 '1':'Stops and times were corrected to the route page, including ARC and the later Run 3 return. The dashed GTFS line omits the ARC leg; it is incomplete and must not be used as turn-by-turn directions.',
 '2':'Teen Town has been restored. Run 4 lists 12:41 PM before SUNY at 12:35 PM; that stop is unconfirmed and excluded from trip search. The dashed GTFS line omits the Teen Town detour. Confirm boarding pins, especially SUNY and MacArthur.',
 '2A':'Greenbridge is a timed stop here, unlike Route 2. Run 4 lists both 5:22 and 5:25 PM at Walmart; 5:25 matches GTFS and is retained pending confirmation. The separate SUNY calendar has a holiday conflict.',
 '3':'Timed calls match the route page. Unlisted GTFS-only clinic calls were removed. Indian Springs/Cliffside is a combined on-call entry; confirm the exact location and order. The specific Wednesday–Friday notice takes priority over the directory.',
 '5':'The specific route page lists Tuesday and Thursday, while the directory says weekdays. Town pickups and requested destinations are reservations, not fixed stop sequences.',
 '20':'The five listed pickups agree with the agency map. Destinations after the Albany VA depend on reservations; no fixed return time or street path is verified.',
 '20W':'Published stop order and times are available below, but current operating dates need confirmation. No weekend departures are generated from the Route 2A student calendar.',
 '22':'All 26 published stop times and both directions match. GTFS retains boarding/drop-off restrictions. Map pins at Duanesburg, State Office Campus and Wolf Road disagree with GTFS; confirm boarding locations.',
 '23':'The written schedule and agency map have different location lists. Extra map pins are not confirmed timed stops. Confirm all pickups, midday arrangements and return travel.'
};
for(const route of routes)route.reviewNote=reviewNotes[route.id];
