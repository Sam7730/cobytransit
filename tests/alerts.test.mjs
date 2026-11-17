import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import handler from '../server/handler.js';
import {validateAlerts} from '../web/assets/alerts.js';
import {plan,departures,tripRuns,returnsFor} from '../web/assets/engine.js';
import {freshness} from '../web/assets/validation.js';
const data=JSON.parse(await readFile(new URL('../web/assets/transit.json',import.meta.url)));
const token='test-only-token-never-use-in-production-1234567890';
const alert={id:'cancel-2',type:'cancellation',title:'Route 2 cancelled',body:'Test fixture. Call dispatch.',routes:['2'],startDate:'2026-11-17',endDate:'2026-11-18'};
function bucket(){let stored=null,revision=0;return {async get(){return stored?{etag:String(revision),json:async()=>JSON.parse(stored)}:null;},async put(key,value,options){const condition=options.onlyIf;if(condition.etagMatches!==undefined&&condition.etagMatches!==String(revision)||condition.etagDoesNotMatch==='*'&&stored!==null)return null;stored=value;revision++;return {etag:String(revision)};}};}
function req(path='/api/admin/alerts',method='GET',body,headers={}){return new Request('https://coby.example'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});}
test('staff notices fail closed without configuration or valid credentials',async()=>{
 for(const env of [{},{ADMIN_TOKEN:token},{BUCKET:bucket(),ADMIN_TOKEN:'short'}])assert.equal((await handler.fetch(req(),{LOCAL_ASSET_CONTENTS:{},...env})).status,503);
 const env={LOCAL_ASSET_CONTENTS:{},ADMIN_TOKEN:token,BUCKET:bucket()};
 for(const Authorization of ['','Bearer wrong','Bearer '+token+'x'])assert.equal((await handler.fetch(req(undefined,'GET',undefined,{Authorization}),env)).status,401);
 assert.equal((await handler.fetch(req(undefined,'PUT',{revision:null,alerts:[alert]},{Origin:'https://evil.example'}),env)).status,403);
});
test('validated staff publication is public without credentials, rejects stale revisions and removes cancellations',async()=>{
 const env={LOCAL_ASSET_CONTENTS:{},ADMIN_TOKEN:token,BUCKET:bucket()};
 let r=await handler.fetch(req(undefined,'PUT',{revision:null,alerts:[alert]}),env);assert.equal(r.status,200);const first=await r.json();assert.equal(first.revision,'1');
 r=await handler.fetch(req('/api/alerts','GET',undefined,{Authorization:''}),env);const published=await r.json();assert.equal(r.status,200);assert.deepEqual(published.alerts,[alert]);assert.equal(published.revision,undefined);assert.equal(JSON.stringify(published).includes(token),false);assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.equal((await handler.fetch(req(undefined,'PUT',{revision:null,alerts:[]}),env)).status,409);
 assert.equal((await handler.fetch(req(undefined,'PUT',{revision:first.revision,alerts:[]}),env)).status,200);
 assert.deepEqual((await (await handler.fetch(req('/api/alerts'),env)).json()).alerts,[]);
 assert.equal((await handler.fetch(req('/api/alerts','PUT',{alerts:[]}),env)).status,405);
 assert.equal((await handler.fetch(req('/api/alerts','HEAD'),env)).body,null);
});
test('conditional writes allow only one of two simultaneous staff edits',async()=>{
 const env={LOCAL_ASSET_CONTENTS:{},ADMIN_TOKEN:token,BUCKET:bucket()};
 const results=await Promise.all([handler.fetch(req(undefined,'PUT',{revision:null,alerts:[alert]}),env),handler.fetch(req(undefined,'PUT',{revision:null,alerts:[]}),env)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('notice validation bounds input, dates, IDs and route assignments',async()=>{
 assert.deepEqual(validateAlerts([alert]),[alert]);
 for(const patch of [{routes:[]},{routes:['not-real']},{routes:['2','2']},{type:'unknown'},{endDate:'2026-02-30'},{endDate:'2026-11-16'},{title:' '},{body:'x'.repeat(1201)},{id:'__proto__'}])assert.throws(()=>validateAlerts([{...alert,...patch}]));
 assert.throws(()=>validateAlerts([alert,alert]));assert.throws(()=>validateAlerts(Array(51).fill(alert)));
 const env={LOCAL_ASSET_CONTENTS:{},ADMIN_TOKEN:token,BUCKET:bucket()};
 for(const [body,headers,status] of [['{}',{'Content-Type':'text/plain'},415],['no JSON',{},400],['x'.repeat(100001),{},400],[{revision:null,alerts:[{...alert,routes:[]}]},{},422]])assert.equal((await handler.fetch(req(undefined,'PUT',body,headers),env)).status,status);
});
test('cancellation applies inclusive Eastern service dates to trips, departures and return options',()=>{
 const withAlerts={...data,alerts:[alert]},suny=Object.values(data.stops).find(s=>s.name.includes('SUNY Cobleskill')).id,walmart=Object.values(data.stops).find(s=>s.name==='Wal-Mart Plaza').id;
 const normal=plan(data,suny,walmart,'2026-11-17','00:00');assert.ok(normal.some(r=>r.trip.route==='2'));
 for(const day of ['2026-11-17','2026-11-18']){assert.ok(plan(withAlerts,suny,walmart,day,'00:00').every(r=>r.trip.route!=='2'));assert.ok(departures(withAlerts,suny,day).every(r=>r.trip.route!=='2'));assert.ok(returnsFor(withAlerts,normal[0],suny,walmart,day,'12:00').every(r=>r.trip.route!=='2'));}
 assert.ok(plan(withAlerts,suny,walmart,'2026-11-19','00:00').some(r=>r.trip.route==='2'));
 assert.equal(tripRuns(withAlerts,normal.find(r=>r.trip.route==='2').trip,'2026-11-17'),false);
 for(const type of ['info','detour'])assert.equal(plan({...data,alerts:[{...alert,type}]},suny,walmart,'2026-11-17','00:00').length,normal.length);
});
test('schedule nearing expiry warns without claiming a new source review',()=>{
 const status=freshness(data.meta,new Date('2026-12-20T15:00:00Z'));assert.equal(status.daysRemaining,11);assert.match(status.text,/new calendar is needed/);assert.equal(freshness(data.meta,new Date('2027-01-01T15:00:00Z')).expired,true);
});
