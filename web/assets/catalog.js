export const routes=[
{id:'1',name:'Richmondville–Schoharie',sub:'Cobleskill · Central Bridge · Schoharie',group:'local',days:'Mon–Fri',fare:'$2',color:'#376d92',note:'A county corridor with timed and on-call stops. Route deviations have an additional charge.',slug:'route-1'},
{id:'2',name:'Cobleskill local',sub:'SUNY · Village · Walmart',group:'local',days:'Mon–Sat',fare:'$2',color:'#1d7356',note:'Daytime local loop through Cobleskill. Some stops are on call; standard timed stops are searchable.',slug:'route-2'},
{id:'2A',name:'Cobleskill afternoon & evening',sub:'Walmart · SUNY · Village',group:'local',days:'Mon–Sat',fare:'$2',color:'#965c1a',note:'Afternoon and evening service. Several final stops are drop-off only; the trip search respects these restrictions.',slug:'route-2a-service'},
{id:'3',name:'Schoharie Valley',sub:'Cobleskill · Schoharie · Middleburgh',group:'local',days:'Wed–Fri*',fare:'$2',color:'#715b96',note:'Agency notice effective April 15, 2026 limits service to Wednesday, Thursday and Friday. Confirm before travel.',slug:'route-3'},
{id:'5',name:'County demand response',sub:'Outlying areas of Schoharie County',group:'regional',days:'Tue · Thu',fare:'$10',color:'#7f8f66',note:'Reserved pickups from outlying county communities into Cobleskill. Call by noon the day before; SCPT may reschedule areas. No fixed bus path is published.',slug:'route-5'},
{id:'20',name:'Capital Region reservations',sub:'Albany VA · Schenectady · Capital Region',group:'regional',days:'Mon · Wed · Fri',fare:'$12',color:'#64828b',note:'Reservation required by noon the day before per route page; office closed weekends. Confirm Monday booking cutoff with dispatch. Veterans visiting the VA ride free.',slug:'route-20'},
{id:'20W',name:'Weekend mall service',sub:'Crossgates Mall · Colonie Center',group:'regional',days:'Semester dates*',fare:'$12',color:'#64828b',note:'Semester-only weekend service. Published calendar is still 2025–26 and booking cutoffs conflict. Confirm operating dates and reserve with dispatch; no departures inferred.',slug:'route-20'},
{id:'22',name:'Albany commuter',sub:'Richmondville · State Campus · Albany',group:'regional',days:'Mon–Fri',fare:'$13',color:'#425d73',note:'Published daily rate $13; weekly $50; monthly $200. Some return stops are marked for driver coordination in GTFS.',slug:'route-22'},
{id:'23',name:'Cooperstown & Bassett',sub:'Sharon Springs · Cooperstown · Bassett',group:'regional',days:'Mon · Wed · Fri',fare:'$12',color:'#9a7d69',note:'Demand-response service by reservation. Contact dispatch to confirm your pickup, destination and return trip.',slug:'route-23'},
{id:'campus',name:'SUNY campus shuttle',sub:'Commuter Lot · Suffolk Circle · Old Quad',group:'campus',days:'Mon–Fri',fare:'See SUNY',color:'#779365',note:'SUNY describes service from the 7 a.m. hour to the 4 p.m. hour, but its detailed posted list ends at 2:55 p.m. Later runs are not inferred. This is separate from county buses.',url:'https://cobleskill.edu/students/campus-shuttle-schedule.aspx'}
];
export const routeUrl=r=>r.url||`https://ridescpt.com/index.php/routes/${r.slug}`;
export const sources=[
['511NY agency GTFS snapshot','65 stop records, 23 scheduled trips, 12 route shapes, service dates and holiday exceptions. Downloaded Oct 23, 2026; valid through Dec 31, 2026.','https://s3.amazonaws.com/datatools-511ny/public/Schoharie_County_Public_Transit.zip'],
['RideSCPT route pages','Primary route descriptions and selected timetable cross-checks; corrections applied to three drop-off-only endpoints.','https://ridescpt.com/index.php/routes'],
['RideSCPT Route 3 notice','Wednesday–Friday reinstatement effective Apr 15, 2026; takes priority over the generic weekday directory.','https://ridescpt.com/index.php/routes/route-3'],
['RideSCPT announcements','Route 20 reinstatement effective Mar 2, 2026; reservations required. Reviewed snapshot, not a live feed.','https://ridescpt.com/index.php/announcements'],
['RideSCPT fares and passes','Published fares, token information and conditional student/faculty travel.','https://ridescpt.com/index.php/homepage/fares'],
['SUNY service and blackout dates','Page still lists Fall 2025–Spring 2026. Not accepted as a 2026–27 eligibility calendar.','https://ridescpt.com/index.php/suny-cobleskill'],
['SUNY Cobleskill shuttle schedule','Campus stop order and explicitly published times; no extrapolated afternoon service.','https://cobleskill.edu/students/campus-shuttle-schedule.aspx'],
['SUNY public transportation guide','Confirms the county operator, campus connections and dispatch contact.','https://www.cobleskill.edu/campus-life/student-life/public-transportation-from-suny-cobleskill.aspx'],
['RideSCPT policies and contact','Holiday closures, accessibility information and dispatch contact. Office-hour statements conflict across pages.','https://ridescpt.com/index.php/policies'],
['OPEN-NY data terms','Terms linked from the feed catalog. Application code and third-party transit data have separate terms.','https://data.ny.gov/download/77gx-ii52/application/pdf']
];
export const notices=[
{tag:'ROUTE 3 · SERVICE DAYS',title:'Wednesday through Friday service',body:'The route page reinstates service on Wednesdays, Thursdays and Fridays beginning April 15, 2026. The general directory still says Monday–Friday. This prototype uses the specific service notice, which also matches the downloaded GTFS calendar.',url:'https://ridescpt.com/index.php/routes/route-3'},
{tag:'STUDENT TRAVEL · CALENDAR OUTDATED',title:'Confirm your Coby ID travel eligibility',body:'Agency pages describe free travel on eligible routes during the SUNY semester with a valid student or faculty ID. The linked blackout calendar still covers Fall 2025–Spring 2026. We cannot confirm Fall 2026 eligibility, and never assume your fare is $0. Ask dispatch about your date and route.',url:'https://ridescpt.com/index.php/suny-cobleskill'},
{tag:'ROUTE 20 · RESERVATIONS',title:'Book ahead for the Capital Region',body:'The March 2, 2026 notice restores Monday, Wednesday and Friday service. The route page asks for reservations by noon the day before and says the office is closed weekends. For weekend mall service, it says noon Friday, while the old student calendar says 3 p.m. Friday. Call early to confirm the deadline and operating date.',url:'https://ridescpt.com/index.php/routes/route-20'}
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
   'Albany VA is the first destination; other destinations are by request. Reserve by noon the day before; confirm Monday arrangements before the weekend.'
 ]},
 '20W': {areas:['Cobleskill','SUNY','Colonie','Crossgates','Albany'], reservation:true, notes:['Semester-only weekend mall service. Confirm current dates and the booking deadline; the published student calendar is outdated.']},
 '22': {areas:['Richmondville','Cobleskill','Albany','State Campus']},
 '23': {areas:['Middleburgh','Schoharie','Cobleskill','Sharon Springs','Sharon','Cooperstown','Bassett'], reservation:true, notes:[
   'Monday, Wednesday and Friday. Published departure: Price Chopper, Cobleskill at 8:30 AM; Sharon Springs Post Office is on call.',
   'The page lists Bassett at 10:00 AM and a 3:00 PM departure from Cooperstown. Midday trips and other destinations depend on requests. Confirm all arrangements with dispatch.'
 ]},
 'campus': {areas:['SUNY','Cobleskill']}
};
