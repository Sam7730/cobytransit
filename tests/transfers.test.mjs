import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {journeyOptions,nextJourney,plan,departures} from '../web/assets/engine.js';
const data=JSON.parse(await readFile('web/assets/transit.json'));
const id=name=>Object.values(data.stops).find(s=>s.name.includes(name)).id;
test('audited stop data supports real same-stop transfers and cancellation removes either affected leg',()=>{
 const from=id('Granite'),to=id('Middleburgh Library'),date='2026-11-18',options=journeyOptions(data,from,to,date,'08:00');assert.equal(options.direct.length,0);assert.ok(options.transfers.length);
 for(const r of options.transfers){assert.equal(r.first.to.stop,r.second.from.stop);assert.ok(r.wait>=10&&r.wait<=90);assert.equal(r.first.from.pickup,0);assert.equal(r.second.to.dropoff,0);}
 for(const route of [options.transfers[0].first.trip.route,options.transfers[0].second.trip.route]){const d={...data,alerts:[{type:'cancellation',routes:[route],startDate:date,endDate:date}]};assert.ok(journeyOptions(d,from,to,date,'08:00').transfers.every(r=>r.first.trip.route!==route&&r.second.trip.route!==route));}
});
test('next service suggestions skip holidays and do not extend expired calendars',()=>{const from=id('SUNY Cobleskill'),to=id('Wal-Mart');assert.equal(nextJourney(data,from,to,'2026-11-10').date,'2026-11-12');assert.equal(nextJourney(data,from,to,'2026-12-31'),null);});
test('overnight departures retain their service date and match the next civil day',()=>{const d=structuredClone(data),trip=d.trips.find(t=>t.route==='2');d.trips=[trip];trip.calls=[{...trip.calls[0],stop:id('SUNY Cobleskill'),arrival:1450,departure:1450,pickup:0,dropoff:0,seq:1},{...trip.calls[1],stop:id('Wal-Mart'),arrival:1470,departure:1470,pickup:0,dropoff:0,seq:2}];const r=plan(d,id('SUNY Cobleskill'),id('Wal-Mart'),'2026-11-18','00:00')[0];assert.ok(r);assert.equal(r.serviceDate,'2026-11-17');assert.equal(r.from.departure,10);assert.equal(departures(d,id('SUNY Cobleskill'),'2026-11-18')[0].serviceDate,'2026-11-17');});
