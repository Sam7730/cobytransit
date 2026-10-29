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
    # Official route pages explicitly mark these endpoints as drop-off only.
    if t['trip_id'] in ['Route 2-Loop 3','SC_R2A_WDSa_01_T06','SC_R2A_WDSa_07']:
        cs[-1]['pickup']=1
        corrections.append({'trip':t['trip_id'],'stop':cs[-1]['stop'],'field':'pickup','value':1,'reason':'Terminal marked drop-off only on agency route page.'})
    assert all(c['stop'] in stops for c in cs)
    assert all(a['departure']<=b['arrival'] for a,b in zip(cs,cs[1:]))
    trips.append({'id':t['trip_id'],'route':routes[t['route_id']],'service':t['service_id'],'shape':t['shape_id'],'calls':cs})
cal={r['service_id']:{'start':r['start_date'],'end':r['end_date'],'days':[i for i,d in enumerate(['sunday','monday','tuesday','wednesday','thursday','friday','saturday']) if r[d]=='1']} for r in table('calendar.txt')}
exceptions=table('calendar_dates.txt')
d={'meta':{'retrieved':datetime.now(ZoneInfo('America/New_York')).date().isoformat(),'timezone':'America/New_York','feedUrl':URL,'sha256':hashlib.sha256(raw).hexdigest(),'validUntil':max(c['end'] for c in cal.values())[:4]+'-'+max(c['end'] for c in cal.values())[4:6]+'-'+max(c['end'] for c in cal.values())[6:8],'corrections':corrections},'stops':stops,'shapes':shapes,'trips':trips,'calendar':cal,'exceptions':exceptions}
(ROOT/'web/assets/transit.json').write_text(json.dumps(d,separators=(',',':')))
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/feed-manifest.json').write_text(json.dumps(d['meta'],indent=2)+'\n')
print(f'Validated {len(stops)} stops, {len(trips)} trips, {len(shapes)} shapes, {len(exceptions)} calendar exceptions; {len(corrections)} documented corrections.')
