import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {streetTile} from '../web/assets/street-tiles.js';
import {validateSnapshot} from '../web/assets/validation.js';
const data=JSON.parse(await readFile(new URL('../web/assets/transit.json',import.meta.url)));
test('blocked tile PNGs never reach the map; valid PNGs load without credentials',async()=>{
  await assert.rejects(()=>streetTile('https://tile.example/test',undefined,async()=>new Response('blocked',{status:403,headers:{'content-type':'image/png'}})));
  await assert.rejects(()=>streetTile('https://tile.example/test',undefined,async()=>new Response('<html>blocked</html>',{headers:{'content-type':'text/html'}})));
  const blob=await streetTile('https://tile.example/test',undefined,async(url,options)=>{
    assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'strict-origin-when-cross-origin'); return new Response('png',{headers:{'content-type':'image/png'}});
  });
  assert.equal(await blob.text(),'png');
});
test('validator supports next-day GTFS calls but rejects negative and 48-hour values',()=>{
  const d=structuredClone(data); d.trips[0].calls=d.trips[0].calls.map(c=>({...c,arrival:c.arrival+1440,departure:c.departure+1440}));
  assert.doesNotThrow(()=>validateSnapshot(d));
  d.trips[0].calls[0].arrival=-1; assert.throws(()=>validateSnapshot(d));
  d.trips[0].calls[0].arrival=2880; d.trips[0].calls[0].departure=2880;assert.throws(()=>validateSnapshot(d));
});
test('added service dates extend coverage only when the declared end date agrees',()=>{const d=structuredClone(data);d.exceptions.push({service_id:d.trips[0].service,date:'20270102',exception_type:'1'});assert.throws(()=>validateSnapshot(d));d.meta.validUntil='2027-01-02';assert.doesNotThrow(()=>validateSnapshot(d));});
