"""Import a bounded, fixed-origin agency GTFS snapshot. Python standard library only."""
import csv, hashlib, io, json, pathlib, sys, urllib.request, zipfile
from datetime import datetime
from zoneinfo import ZoneInfo
ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = 'https://s3.amazonaws.com/datatools-511ny/public/Schoharie_County_Public_Transit.zip'
if len(sys.argv)>1:
    raw = pathlib.Path(sys.argv[1]).read_bytes()
else:
    with urllib.request.urlopen(URL, timeout=30) as response:
        if response.geturl() != URL: raise ValueError('Unexpected download redirect')
        raw = response.read(5_000_001)
if len(raw)>5_000_000: raise ValueError('Feed exceeds size limit')
z = zipfile.ZipFile(io.BytesIO(raw))
if sum(i.file_size for i in z.infolist())>30_000_000: raise ValueError('Uncompressed feed exceeds limit')
def table(name):
    return list(csv.DictReader(io.TextIOWrapper(z.open(name), encoding='utf-8-sig')))
routes={r['route_id']:r['route_short_name'] for r in table('routes.txt')}
stops={s['stop_id']:{'id':s['stop_id'],'name':s['stop_name'].strip(),'lat':float(s['stop_lat']),'lon':float(s['stop_lon']),'wheelchair':s.get('wheelchair_boarding','0')} for s in table('stops.txt')}
assert all(41<s['lat']<44 and -76<s['lon']<-72 for s in stops.values()), 'Unexpected geography'
shapes={}
for p in table('shapes.txt'):
    shapes.setdefault(p['shape_id'],[]).append((int(p['shape_pt_sequence']),float(p['shape_pt_lat']),float(p['shape_pt_lon'])))
shapes={k:[[a,b] for _,a,b in sorted(v)] for k,v in shapes.items()}
calls={}
for c in table('stop_times.txt'):
    def mins(t):
        h,m,s=map(int,t.split(':'));assert 0<=h<48 and 0<=m<60 and 0<=s<60;return h*60+m+s/60
    calls.setdefault(c['trip_id'],[]).append({'stop':c['stop_id'],'arrival':mins(c['arrival_time']),'departure':mins(c['departure_time']),'pickup':int(c['pickup_type'] or 0),'dropoff':int(c['drop_off_type'] or 0),'seq':int(c['stop_sequence']),'timepoint':c.get('timepoint','')})
trips=[]
corrections=[]
for t in table('trips.txt'):
    cs=sorted(calls[t['trip_id']],key=lambda c:c['seq'])
    assert all(c['stop'] in stops for c in cs)
    assert all(a['departure']<=b['arrival'] for a,b in zip(cs,cs[1:]))
    trips.append({'id':t['trip_id'],'route':routes[t['route_id']],'service':t['service_id'],'shape':t['shape_id'],'calls':cs})
cal={r['service_id']:{'start':r['start_date'],'end':r['end_date'],'days':[i for i,d in enumerate(['sunday','monday','tuesday','wednesday','thursday','friday','saturday']) if r[d]=='1']} for r in table('calendar.txt')}
exceptions=table('calendar_dates.txt')
d={'meta':{'retrieved':datetime.now(ZoneInfo('America/New_York')).date().isoformat(),'timezone':'America/New_York','feedUrl':URL,'sha256':hashlib.sha256(raw).hexdigest(),'validUntil':max(c['end'] for c in cal.values())[:4]+'-'+max(c['end'] for c in cal.values())[4:6]+'-'+max(c['end'] for c in cal.values())[6:8],'corrections':corrections},'stops':stops,'shapes':shapes,'trips':trips,'calendar':cal,'exceptions':exceptions}
# Reviewed overrides apply only to the exact archive audited against RideSCPT.
# A changed upstream archive must be reviewed, not silently patched with old calls.
review=json.loads((ROOT/'data/reviewed-corrections.json').read_text())
if d['meta']['sha256'] != review['feedSha256']:
    raise ValueError('Upstream feed changed: review RideSCPT pages and update reviewed-corrections.json before importing')
by_id={t['id']:t for t in d['trips']}
for update in review['tripUpdates']:
    if update['id'] not in by_id: raise ValueError('Reviewed trip missing from feed')
    by_id[update['id']].update(update)
for update in review['stopUpdates']:
    if update['id'] not in d['stops']: raise ValueError('Reviewed stop missing from feed')
    d['stops'][update['id']].update(update)
for t in d['trips']:
    assert all(c['stop'] in d['stops'] for c in t['calls'])
    assert all(a['departure']<=b['arrival'] for a,b in zip(t['calls'],t['calls'][1:]))
d['meta'].update(checkedAt=review['reviewed']+'T12:00:00Z',reviewStatus='needs-review',reviewNotes=[
    'All 23 fixed-route runs (469 published rows) checked against individual RideSCPT pages. See ROUTE_AUDIT.md for decisions and remaining conflicts.',
    'Route 1 stops/times and terminal restrictions corrected; Teen Town restored to Route 2; Greenbridge is timed on Route 2A but on call on Route 2.',
    'Route 2 run 4 Teen Town time/order and Route 2A run 4 duplicate Walmart entry need dispatch confirmation. Unconfirmed calls are excluded from trip search.',
    'Agency map pins differ from GTFS at several locations. Shapes remain GTFS references, not verified turn-by-turn directions.',
    'SUNY now publishes a fall 2026–spring 2027 calendar naming Route 2A. It conflicts with the general calendar on some dates and does not establish weekend Route 20 dates.'
])
d['meta']['corrections']=[{'trip':u['id'],'field':'calls','reason':'Individual RideSCPT timetable review '+review['reviewed']+'; see data/route-review.json.'} for u in review['tripUpdates']]
(ROOT/'web/assets/transit.json').write_text(json.dumps(d,separators=(',',':')))
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/feed-manifest.json').write_text(json.dumps(d['meta'],indent=2)+'\n')
print(f"Validated {len(stops)} stops, {len(trips)} trips, {len(shapes)} shapes, {len(exceptions)} calendar exceptions; {len(d['meta']['corrections'])} reviewed trip records.")
