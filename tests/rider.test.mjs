import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {upcomingDepartures,activeService,requestStop} from '../web/assets/engine.js';
import {normalizeVehicles} from '../web/assets/live-data.js';
const data=JSON.parse(await readFile(new URL('../web/assets/transit.json',import.meta.url)));
const suny=Object.values(data.stops).find(s=>s.name.includes('SUNY Cobleskill')).id;

test('upcoming board skips holiday and overnight gaps without presenting request stops as departures',()=>{
 const holiday=upcomingDepartures(data,suny,new Date('2026-11-11T13:00:00Z'));
 assert.equal(holiday.length,3);assert.ok(holiday.every(d=>d.date>'2026-11-11'));
 const late=upcomingDepartures(data,suny,new Date('2026-10-24T03:30:00Z'));
 assert.ok(late.every(d=>d.date>='2026-10-24'));
 for(const d of [...holiday,...late]){assert.equal(activeService(data,d.trip.service,d.date),true);assert.equal(requestStop(data,d.call),false);assert.equal(d.call.pickup,0);}
});
test('upcoming board does not invent service after expiration or for an invalid stop',()=>{
 assert.deepEqual(upcomingDepartures(data,suny,new Date('2027-01-01T17:00:00Z')),[]);
 assert.deepEqual(upcomingDepartures(data,'__proto__',new Date('2026-10-24T12:00:00Z')),[]);
});
test('supplemental county maps preserve geography and reservation semantics',async()=>{
 const county=JSON.parse(await readFile(new URL('../web/assets/schoharie-county.json',import.meta.url)));
 assert.equal(county.features.length,1);assert.equal(county.features[0].properties.GEOID,'36095');
 const maps=JSON.parse(await readFile(new URL('../web/assets/service-overlays.json',import.meta.url)));
 assert.equal(maps.features.filter(f=>f.properties.route==='5').length,10);
 assert.equal(maps.features.filter(f=>f.properties.route==='20').length,5);
 assert.equal(maps.features.filter(f=>f.properties.route==='23').length,7);
 assert.ok(maps.features.every(f=>f.geometry.type!=='LineString'));
 for(const f of maps.features){assert.match(f.properties.source,/^https:\/\/ridescpt\.com\/index.php\/routes\/route-(5|20|23)$/);if(f.geometry.type==='Polygon')for(const ring of f.geometry.coordinates)assert.deepEqual(ring[0],ring.at(-1));}
});
test('Route 23 GPS can reach Cooperstown while still excluding locations outside the service region',()=>{
 const timestamp=Math.floor(Date.now()/1000);
 const result=normalizeVehicles({vehicles:[{id:'cooperstown-test',routeId:'23',lat:42.696036,lon:-74.923239,timestamp},{id:'out-of-region-test',routeId:'23',lat:41.9,lon:-75.4,timestamp}]},data);
 assert.equal(result.vehicles.length,1);assert.equal(result.vehicles[0].id,'cooperstown-test');
});
