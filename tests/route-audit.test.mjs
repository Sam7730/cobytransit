import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {departures,plan,formatTime,requestStop} from '../web/assets/engine.js';
import {validateSnapshot} from '../web/assets/validation.js';
const data=JSON.parse(await readFile(new URL('../web/assets/transit.json',import.meta.url)));
const audit=JSON.parse(await readFile(new URL('../data/route-review.json',import.meta.url)));
const trip=id=>data.trips.find(t=>t.id===id),teen='STOP_d52dc432-8a57-42a0-8d86-59a81117bb6e',green='STOP_79ba74e9-f6ec-4fe4-94cc-a8e5e3580194';

test('all 469 published timetable rows are accounted for, preserving their order and restrictions',()=>{
 assert.equal(audit.runs.length,23);assert.equal(audit.runs.reduce((n,r)=>n+r.rows.length,0),469);
 for(const run of audit.runs){
  const t=trip(run.trip),indices=[];
  for(const row of run.rows){
   assert.deepEqual(row.callIndices.map(i=>t.calls[i].stop),row.stopIds);
   if(!row.callIndices.length){assert.ok(row.decision);continue;}
   for(const index of row.callIndices){
    indices.push(index);const call=t.calls[index];assert.ok(call);
    if(call.unconfirmed){assert.ok(row.decision);assert.equal(requestStop(data,call),true);continue;}
    if(/on call/i.test(row.publishedTime)){assert.ok(requestStop(data,call));assert.equal(call.publishedTimed,false);}
    else {assert.equal(formatTime(call.departure).split(' ')[0],row.publishedTime.replaceAll('*',''));assert.equal(call.publishedTimed,true);}
    if(/drop-off/i.test(row.publishedStop))assert.equal(call.pickup,1);
   }
  }
  assert.deepEqual(indices,t.calls.map((_,i)=>i),run.trip);
 }
 assert.doesNotThrow(()=>validateSnapshot(data));
});
test('Route 1 includes ARC, later Run 3 times and the final drop-off restriction',()=>{
 assert.equal(trip('Route 1-Loop 4').calls.find(c=>c.stop==='60f0676e').departure,494);
 assert.equal(trip('Route 1 Loop 4').calls.find(c=>c.stop==='60f0676e').departure,877);
 const third=trip('Route 1 - Loop 3');assert.equal(third.calls.find(c=>c.stop==='364284').departure,766);
 assert.equal(third.calls.filter(c=>c.stop==='364278').at(-1).departure,799);
 assert.equal(trip('Route 1 Loop 4').calls.at(-1).pickup,1);
 assert.ok(!departures(data,'364271','2026-11-16',959,'1').some(d=>d.call.departure===959));
});
test('Teen Town has one confirmed timed departure and an excluded contradictory noon entry',()=>{
 const ds=departures(data,teen,'2026-11-16');assert.deepEqual(ds.map(d=>d.call.departure),[660]);
 const conflict=trip('Route 2-Loop 4').calls.find(c=>c.stop===teen);assert.equal(conflict.unconfirmed,true);
 assert.ok(!plan(data,teen,'364278','2026-11-16','12:00').length);
 assert.ok(!plan(data,'364278',teen,'2026-11-16','12:00').length);
});
test('Greenbridge is timed on 2A but remains on call on 2, and no duplicate 5:22 departure is invented',()=>{
 assert.equal(departures(data,green,'2026-11-16',0,'2').length,0);
 assert.deepEqual(departures(data,green,'2026-11-16',0,'2A').map(d=>d.call.departure),[920,965,1020,1065,1120,1165,1240]);
 assert.equal(trip('SC_R2A_WDSa_01_T04').calls[0].departure,1045);
 assert.equal(trip('SC_R2A_WDSa_01_T04').calls.length,18);
});
test('Route 3 removes unlisted clinic calls and Route 22 preserves both published directions',()=>{
 for(const t of data.trips.filter(t=>t.route==='3'))assert.ok(!t.calls.some(c=>c.stop==='STOP_8d264a57-daf4-4ac8-a0c3-0b936f74fc99'));
 assert.equal(trip('SC_R22_WD_AM_T01').direction,'Toward Albany');
 const back=trip('SC_R22_WD_PM_T01');assert.equal(back.direction,'Toward Cobleskill and Richmondville');
 assert.equal(back.calls.at(-1).departure,1085);assert.equal(back.calls.at(-1).dropoff,3);
});
test('all 75 official fixed-route map pins are reviewed and large location conflicts remain visible',()=>{
 assert.equal(audit.mapComparisons.length,75);
 for(const point of audit.mapComparisons)if(point.separationMeters>150)assert.match(data.stops[point.stop].locationNote,/confirm/i);
 for(const id of ['zpu7','pplg','364286'])assert.ok(data.stops[id].locationNote);
});
test('malformed uncertainty flags cannot make a reviewed snapshot silently routable',()=>{
 const bad=structuredClone(data);bad.trips[0].calls[0].unconfirmed='false';assert.throws(()=>validateSnapshot(bad));
});
