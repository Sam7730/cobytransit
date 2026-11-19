import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
// Exercise the actual generated server and browser together; storage is isolated in memory.
const source=await readFile('worker/index.js','utf8');
const {default:worker}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const data=JSON.parse(await readFile('web/assets/transit.json'));
const token='browser-test-only-token-not-a-production-secret-123456';
let stored=null,revision=0;
const env={ADMIN_TOKEN:token,BUCKET:{get:async key=>key.endsWith('/alerts.json')&&stored?{etag:String(revision),json:async()=>JSON.parse(stored)}:null,put:async(key,value,{onlyIf})=>{if(onlyIf.etagMatches!==undefined&&onlyIf.etagMatches!==String(revision)||onlyIf.etagDoesNotMatch==='*'&&stored!==null)return null;stored=value;return {etag:String(++revision)};}}};
const server=http.createServer(async(req,res)=>{try{const parts=[];for await(const part of req)parts.push(part);const r=await worker.fetch(new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts)}:{})}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500).end('Test fixture failed');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('https://tile.openstreetmap.org/**',r=>r.abort());
 const page=await context.newPage(),errors=[];await page.clock.setFixedTime(new Date('2026-11-17T12:00:00Z'));page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForSelector('.route-card');assert.equal(await page.locator('footer a[download],footer a[href*=github],footer a[href="/staff"]').count(),0);assert.equal((await page.request.get(base+'/privacy.html')).status(),200);
 for(const trip of data.trips){
  await page.locator(`.route-card[aria-label^="Route ${trip.route}:"]`).click();await page.locator('#map-run-select').selectOption(trip.id);
  assert.equal(await page.locator('.run-itinerary li').count(),trip.calls.length,trip.id);
  assert.equal(await page.locator('.run-stop-marker').count(),new Set(trip.calls.map(c=>c.stop)).size,trip.id);
  assert.deepEqual(await page.locator('.run-itinerary .visit-number').allTextContents(),trip.calls.map((_,i)=>String(i+1)));
  const repeated=trip.calls.find((c,i)=>trip.calls.findIndex(other=>other.stop===c.stop)!==i);
  if(repeated){const visits=trip.calls.flatMap((c,i)=>c.stop===repeated.stop?[i+1]:[]);assert.ok((await page.locator('.run-stop-marker').allTextContents()).includes(visits.join(' · ')));}
 }
 await page.locator('.route-card[aria-label^="Route 2:"]').click();await page.locator('#map-run-select').selectOption('Route 2-Loop 4');assert.match(await page.locator('.run-itinerary').textContent(),/Confirm time/);await page.getByRole('button',{name:'Stop order ↓',exact:true}).click();assert.equal(await page.locator('.run-itinerary li').first().isVisible(),true);
 await page.getByRole('button',{name:'Share this route →',exact:true}).click();const share=await page.locator('#share-url').inputValue();await page.locator('#close-share').click();await page.goto(share);await page.reload();await page.waitForSelector('.run-itinerary');assert.equal(await page.locator('#map-run-select').inputValue(),'Route 2-Loop 4');
 await page.locator('#map-run-date').fill('2026-11-22');await page.locator('#map-run-date').dispatchEvent('change');assert.match(await page.locator('.run-status').textContent(),/Not scheduled or cancelled/);
 await page.getByRole('button',{name:'Plan a trip',exact:true}).first().click();
 await page.locator('#travel-date').fill('2026-11-17');await page.locator('#travel-time').fill('08:00');await page.locator('#include-return').check();await page.locator('#return-time').fill('12:00');await page.locator('#planner button[type=submit]').click();await page.waitForSelector('.result-card');
 await page.getByRole('button',{name:'View this trip on the map',exact:true}).first().click();assert.match(await page.locator('.journey-summary').textContent(),/BOARD:.*GET OFF:/);assert.equal(await page.locator('.journey-stop').count(),2);
 await page.locator('.journey-stop .schedule-link').first().click();await page.getByRole('button',{name:'☆ Save stop',exact:true}).click();assert.equal(await page.locator('#saved-home').isVisible(),true);assert.ok(await page.locator('.saved-departure').count()>0);
 await page.getByRole('button',{name:'Rider guide',exact:true}).click();await page.locator('summary').filter({hasText:'Report a website problem'}).click();await page.locator('#report-problem').click();await page.locator('#report-text').fill('The sign appears to be missing.');await page.locator('#prepare-report').click();const issue=new URL(await page.locator('#report-link').getAttribute('href'));assert.equal(issue.origin,'https://github.com');assert.match(issue.searchParams.get('body'),/Snapshot:/);assert.ok(!issue.href.includes(token));await page.locator('#close-report').click();
 await page.getByRole('button',{name:'Explore',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.locator('.saved-departure').first().click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#detail h2').evaluate(e=>e===document.activeElement),true);
 await mkdir('.qa',{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'.qa/run-mobile.png',fullPage:true});
 // Preserve the earlier hosted transfer and next-service-day flows in the new interface.
 await page.goto(base+'/#plan');await page.waitForSelector('#from option',{state:'attached'});
 const stopId=name=>Object.values(data.stops).find(stop=>stop.name.includes(name)).id;
 const selectLocalTrip=async()=>{await page.locator('#from').selectOption(stopId('SUNY Cobleskill'));await page.locator('#to').selectOption(stopId('Wal-Mart Plaza'));};
 await page.locator('#from').selectOption(stopId('Granite'));await page.locator('#to').selectOption(stopId('Middleburgh Library'));
 await page.locator('#travel-date').fill('2026-11-18');await page.locator('#travel-time').fill('08:00');await page.locator('#planner button[type=submit]').click();await page.waitForSelector('.transfer-card');
 assert.match(await page.locator('.transfer-card').first().textContent(),/change at/);await page.getByRole('button',{name:'Map first bus',exact:true}).first().click();await page.waitForSelector('.journey-summary');
 await page.goto(base+'/#plan');await page.waitForSelector('#from option',{state:'attached'});await selectLocalTrip();await page.locator('#travel-date').fill('2026-11-10');await page.locator('#travel-time').fill('23:59');await page.locator('#planner button[type=submit]').click();
 assert.ok(await page.getByRole('button',{name:'Try the next service date: 2026-11-12',exact:true}).isVisible());
 const staff=await context.newPage();staff.on('pageerror',e=>errors.push(e.message));await staff.goto(base+'/staff');await staff.locator('#staff-token').fill(token);await staff.locator('#staff-login button').click();await staff.waitForSelector('#staff-panel:not([hidden])');
 await staff.locator('#alert-title').fill('Test cancellation <img src=x onerror=alert(1)>');await staff.locator('#alert-body').fill('Fixture only: both local routes cancelled for this test.');await staff.locator('#alert-type').selectOption('cancellation');for(const id of ['2','2A'])await staff.locator(`#alert-routes input[value="${id}"]`).check();await staff.locator('#alert-start').fill('2026-11-17');await staff.locator('#alert-end').fill('2026-11-17');await staff.locator('#preview-alert').click();assert.equal(await staff.locator('#alert-preview img').count(),0);await staff.locator('#confirm-alert').check();await staff.locator('#alert-editor button[type=submit]').click();await staff.waitForFunction(()=>document.getElementById('staff-message').textContent.startsWith('Published.'));
 assert.equal(await staff.evaluate(()=>JSON.stringify(localStorage).includes('browser-test-only')),false);assert.equal(await staff.locator('#staff-token').inputValue(),'');
 await page.goto(base+'/#plan');
 // Navigating to a hash can reuse the same document. Reload to check startup reads
 // of the cancellation published by the separate staff tab.
 const alertsRead=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/alerts'&&r.ok());
 await page.reload();
 const published=await (await alertsRead).json();
 assert.ok(published.alerts.some(a=>a.type==='cancellation'&&a.routes.includes('2')));
 await page.waitForSelector('#from option',{state:'attached'});
 await page.waitForFunction(()=>document.getElementById('service-alert-status').textContent.startsWith('Site notices checked'));
 await selectLocalTrip();await page.locator('#travel-date').fill('2026-11-17');await page.locator('#travel-time').fill('08:00');await page.locator('#planner button[type=submit]').click();assert.equal(await page.locator('.result-card').count(),0);assert.match(await page.locator('#plan-results').textContent(),/No direct scheduled match/);
 await page.route('**/api/alerts',r=>r.fulfill({status:503,json:{error:'Fixture outage'}}));await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(()=>document.getElementById('service-alert-status').textContent.includes('Previously received'));assert.equal(await page.locator('.result-card').count(),0);
 await staff.setViewportSize({width:390,height:844});assert.equal(await staff.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await staff.evaluate(()=>scrollTo(0,0));await staff.screenshot({path:'.qa/staff-mobile.png',fullPage:true});
 staff.once('dialog',d=>d.accept());await staff.getByRole('button',{name:'Remove',exact:true}).click();await staff.waitForFunction(()=>!document.querySelector('#staff-alerts button'));await page.unroute('**/api/alerts');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForSelector('.result-card');
 await staff.locator('#staff-logout').click();assert.equal(await staff.locator('#staff-login').isVisible(),true);assert.equal(await staff.locator('#staff-panel').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS: all 23 numbered run maps, repeated stops, mobile journey, saved stops, sharing, report drafts, real staff API, cancellations and outage retention.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
