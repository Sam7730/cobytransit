"""Watch official source content without changing reviewed schedules. Standard library only."""
import argparse, concurrent.futures, hashlib, json, os, pathlib, re, sys, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, date
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGES = ['routes', 'routes/route-1', 'routes/route-2', 'routes/route-2a-service',
         'routes/route-3', 'routes/route-5', 'routes/route-20', 'routes/route-22',
         'routes/route-23', 'suny-cobleskill', 'announcements', 'policies', 'homepage/fares']
MAPS = {'1':'1hXKWTgbaVch5nKjGLzfzTd17djE', '2':'1J26Rb6udIrleOTfoTkgYhj9sCiw',
        '3':'1lsJabyrC_0PLf-qGCCC1KGotnqw', '5':'1amvoepvN9wrTVJNIEpfsTsJ55vE',
        '20':'1a6ZlV9I-rfQk3_Ys7fkZae-pCnk', '22':'1007eLI6__sB1eM9SwntaZsLg_Ko',
        '23':'1mWHhjsJsxmXFOywg3YOlRzKN0uo'}
class SourceText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self, value):
        if not self.skip: self.parts.append(value)
def semantic_content(raw, kind):
    if kind=='feed': return raw
    if kind=='page':
        parser=SourceText(); parser.feed(raw.decode('utf-8'))
        text=re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()
        if len(text)<250: raise ValueError('Source page is unexpectedly short')
        return text.encode()
    root=ET.fromstring(raw); ns={'k':'http://www.opengis.net/kml/2.2'}; records=[]
    for mark in root.findall('.//k:Placemark',ns):
        geometry=[]
        for element in mark.iter():
            kind=element.tag.rsplit('}',1)[-1]
            if kind in ('Point','LineString','LinearRing'):
                coordinates=element.find('k:coordinates',ns)
                if coordinates is not None: geometry.append([kind,re.sub(r'\s+',' ',coordinates.text or '').strip()])
        records.append({'name':mark.findtext('k:name','',ns),'geometry':geometry})
    if not records: raise ValueError('Map has no placemarks')
    # Ignore rotating image URLs and style IDs; watch names and actual geometry.
    return json.dumps(records,sort_keys=True,separators=(',',':')).encode()
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Source redirected; review its URL before updating')
def read_source(item):
    name,url,kind=item
    try:
        opener=urllib.request.build_opener(NoRedirect)
        with opener.open(urllib.request.Request(url,headers={'User-Agent':'CobyTransit source monitor (github.com/Sam7730/cobytransit)'}),timeout=25) as response:
            raw=response.read(5_000_001)
        if len(raw)>5_000_000: raise ValueError('Source exceeds 5 MB')
        content=semantic_content(raw,kind)
        return {'name':name,'url':url,'kind':kind,'sha256':hashlib.sha256(content).hexdigest()}
    except Exception as error: return {'name':name,'url':url,'kind':kind,'error':str(error)[:200]}
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true',help='Record a monitoring baseline after manual review; never updates the transit review date');args=parser.parse_args()
    data=json.loads((ROOT/'web/assets/transit.json').read_text()); baseline_path=ROOT/'data/source-monitor.json'
    baseline=json.loads(baseline_path.read_text()) if baseline_path.exists() else {'sources':[]}
    old={s['name']:s['sha256'] for s in baseline['sources']}
    items=[(p,'https://ridescpt.com/index.php/'+p,'page') for p in PAGES]+[(f'map-{route}',f'https://www.google.com/maps/d/kml?mid={mid}&forcekml=1','map') for route,mid in MAPS.items()]+[('GTFS',data['meta']['feedUrl'],'feed')]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(read_source,items))
    now=datetime.now(ZoneInfo('America/New_York')); days=(date.fromisoformat(data['meta']['validUntil'])-now.date()).days
    for result in results:
        expected=data['meta']['sha256'] if result['kind']=='feed' else old.get(result['name'])
        result['status']='unavailable' if 'error' in result else 'unchanged' if result['sha256']==expected else 'review required'
    report={'checkedAt':now.isoformat(),'coverageEnds':data['meta']['validUntil'],'daysRemaining':days,'sourceReview':data['meta'].get('checkedAt'),'sources':results}
    output=ROOT/'.qa';output.mkdir(exist_ok=True);(output/'source-report.json').write_text(json.dumps(report,indent=2)+'\n')
    summary=['# Transit source check',f"Checked {report['checkedAt']}",f"Schedule coverage ends {report['coverageEnds']} ({days} days remaining).",'Content monitoring does not certify route accuracy or actual operation.','']
    summary += [f"- {r['name']}: {r['status']}"+(f" — {r['error']}" if 'error' in r else '') for r in results]
    if days<=14: summary.append('\nACTION: schedule expires within 14 days or has expired. Obtain and review a new calendar.')
    text='\n'.join(summary)+'\n';print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f: f.write(text)
    if args.record:
        if any('error' in r for r in results): raise SystemExit('Baseline not written: all sources must load.')
        baseline_path.write_text(json.dumps({'recordedAt':now.isoformat(),'purpose':'Content-change monitoring only; not a new timetable or map audit.','sources':[{k:v for k,v in r.items() if k!='status'} for r in results]},indent=2)+'\n')
        print('Monitoring baseline recorded. Reviewed schedule and its timestamp were not changed.')
    return 1 if days<=14 or any('error' in r or (r['status']!='unchanged' and not args.record) for r in results) else 0
if __name__=='__main__': sys.exit(main())
