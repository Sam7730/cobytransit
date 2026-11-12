import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeVehicles,freshVehicle} from '../web/assets/live-data.js';
import {vehicleData,trafficData,trafficTile} from '../server/live.js';
import handler from '../server/handler.js';
const data=JSON.parse(await readFile(new URL('../web/assets/transit.json',import.meta.url)));
const now=Date.now(),timestamp=Math.floor(now/1000);
const vehicle={id:'bus-1',label:'Bus one',routeId:'2',lat:42.679,lon:-74.48,timestamp};
const assets={'/assets/transit.json':{body:JSON.stringify(data),type:'application/json'}};

test('vehicle validation excludes stale, future, unmapped, duplicate and invalid locations',()=>{
 const rows=[vehicle,{...vehicle},{...vehicle,id:'old',timestamp:timestamp-91},{...vehicle,id:'future',timestamp:timestamp+60},{...vehicle,id:'bad',lat:0},{...vehicle,id:'unknown',routeId:'not-SCPT'},{...vehicle,id:'missing',timestamp:undefined}];
 const result=normalizeVehicles({vehicles:rows},data,{},now);
 assert.deepEqual(result.vehicles.map(v=>v.id),['bus-1']);assert.equal(result.stale,2);assert.equal(result.rejected,4);
 assert.equal(freshVehicle(vehicle,now+91000),false);
 assert.throws(()=>normalizeVehicles({vehicles:new Array(501)},data));
});
test('GTFS-Realtime JSON supports route mapping, trip lookup and measurement timestamps only',()=>{
 const entity=[{id:'a',vehicle:{vehicle:{id:'bus'},trip:{route_id:'agency-2'},position:{latitude:42.68,longitude:-74.48},timestamp:String(timestamp)}},{id:'b',vehicle:{trip:{tripId:data.trips[0].id},position:{latitude:42.68,longitude:-74.48},timestamp}},{id:'missing-time',vehicle:{trip:{route_id:'2'},position:{latitude:42.68,longitude:-74.48}}}];
 const r=normalizeVehicles({header:{timestamp},entity},data,{'agency-2':'2'},now);assert.equal(r.vehicles.length,2);assert.equal(r.vehicles[0].routeId,'2');assert.equal(r.vehicles[1].routeId,data.trips[0].route);
 assert.throws(()=>normalizeVehicles({header:{incrementality:'DIFFERENTIAL'},entity},data));
});
test('unconfigured endpoints make no outbound requests and return no fictional data',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected request');};
 try{for(const path of ['/api/vehicles','/api/traffic']){const response=await handler.fetch(new Request(`https://app.example${path}`),{LOCAL_ASSET_CONTENTS:assets}),body=await response.json();assert.equal(body.status,'unconfigured');assert.equal(body.connected,false);assert.equal(response.headers.get('Cache-Control'),'no-store');const head=await handler.fetch(new Request(`https://app.example${path}`,{method:'HEAD'}),{LOCAL_ASSET_CONTENTS:assets});assert.equal(await head.text(),'');assert.equal((await handler.fetch(new Request(`https://app.example${path}`,{method:'POST'}),{LOCAL_ASSET_CONTENTS:assets})).status,405);}}finally{globalThis.fetch=original;}
});
test('vehicle fetch is coalesced, keeps secrets private, and rejects redirects and oversized payloads',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer test-only');return Response.json({vehicles:[vehicle]});};
 try{const env={SCPT_VEHICLES_URL:'https://feed.example/vehicles',SCPT_VEHICLES_TOKEN:'test-only'};const results=await Promise.all([vehicleData(env,data),vehicleData(env,data)]);assert.equal(calls,1);assert.equal(results[0].status,'live');assert.ok(!JSON.stringify(results).includes('test-only'));
 globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'http://localhost/'}});assert.equal((await vehicleData({SCPT_VEHICLES_URL:'https://redirect.example/feed'},data)).status,'unavailable');
 globalThis.fetch=async()=>new Response('x'.repeat(1000001));assert.equal((await vehicleData({SCPT_VEHICLES_URL:'https://large.example/feed'},data)).status,'unavailable');
 assert.equal((await vehicleData({SCPT_VEHICLES_URL:'http://localhost/feed'},data)).status,'unavailable');
 }finally{globalThis.fetch=original;}
});
test('traffic normalizes geometry, bounded fixed provider requests and failures',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;const u=new URL(url);assert.equal(u.hostname,'api.tomtom.com');assert.equal(u.searchParams.get('timeValidityFilter'),'present');return Response.json({incidents:[{geometry:{type:'LineString',coordinates:[[-74.48,42.68],[-74.47,42.69]]},properties:{id:'work',iconCategory:9,events:[{description:'Roadworks'}],delay:120}},{geometry:{type:'Point',coordinates:[0,0]},properties:{id:'outside'}}]});};
 try{const result=await trafficData({TOMTOM_API_KEY:'test-traffic'});assert.equal(result.connected,true);assert.equal(result.incidents.length,1);assert.deepEqual(result.incidents[0].points[0],[42.68,-74.48]);assert.equal(result.incidents[0].delay,120);
 assert.equal(await trafficTile({TOMTOM_API_KEY:'test-traffic'},14,0,0),null);assert.equal(calls,1);
 globalThis.fetch=async()=>new Response('unavailable',{status:429});assert.equal((await trafficData({TOMTOM_API_KEY:'test-failure'})).status,'unavailable');
 }finally{globalThis.fetch=original;}
});
test('live APIs and traffic tiles are never cached by the offline service worker',async()=>{
 const script=await readFile(new URL('../web/service-worker.js',import.meta.url),'utf8');
 const files=script.match(/const FILES=\[(.*?)\];/s)[1];assert.doesNotMatch(files,/api\/(vehicles|traffic|status)/);assert.match(files,/live-data\.js/);assert.match(files,/vendor\/leaflet\.js/);
});
