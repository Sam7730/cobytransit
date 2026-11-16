import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
// Network-free fixtures here deliberately test failure and rendering paths, not provider availability.
await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
let mode='live';
await page.route('**/api/vehicles',async r=>{
 if(mode==='failure')return r.fulfill({status:503,body:'unavailable'});
 const timestamp=Math.floor(Date.now()/1000)-(mode==='stale'?100:0);
 await r.fulfill({json:{configured:true,connected:true,status:'live',message:'Test fixture only',vehicles:[{id:'fixture',label:'<img src=x onerror=alert(1)>',routeId:'2',lat:42.679,lon:-74.48,timestamp}]}});
});
await page.route('**/api/traffic',r=>r.fulfill({json:{configured:true,connected:true,status:'available',message:'Test fixture only',checkedAt:new Date().toISOString(),incidents:[{id:'fixture',description:'Roadworks test',category:9,points:[[42.679,-74.48],[42.681,-74.482]],from:'A',to:'B',delay:120}]}}));
await page.route('**/api/traffic/tiles/**',r=>r.fulfill({status:502,body:'fixture failure'}));
await page.goto(process.env.BASE_URL||'http://localhost:4173');await page.waitForSelector('.live-bus-marker');
assert.equal(await page.locator('#gps-badge').textContent(),'1 live buses');
await page.locator('.live-bus-marker').click();assert.ok((await page.locator('.leaflet-popup-content').textContent()).includes('<img src=x onerror=alert(1)>'));assert.equal(await page.locator('.leaflet-popup-content img').count(),0);
await page.locator('.leaflet-popup-close-button').click();
assert.equal(await page.locator('[aria-label^="View stop:"]').count(),47);
await page.locator('.map-layers summary').click();
await page.locator('#routes-all').click();assert.equal(await page.locator('[aria-label^="View stop:"]').count(),47);
await page.locator('#routes-none').click();assert.equal(await page.locator('[aria-label^="View stop:"]').count(),0);assert.equal(await page.locator('.live-bus-marker').count(),0);
await page.locator('#routes-selected').click();
await page.locator('#traffic-incidents').check();assert.equal(await page.locator('.incident-marker').count(),1);
await page.locator('#traffic-flow').check();await page.waitForFunction(()=>document.getElementById('traffic-status').textContent.includes('could not load'));
mode='stale';await page.locator('#live-refresh').click();await page.waitForFunction(()=>document.getElementById('live-refresh').disabled===false);assert.equal(await page.locator('.live-bus-marker').count(),0);assert.match(await page.locator('#live-status').textContent(),/expired/);
mode='live';await page.locator('#live-refresh').click();await page.waitForSelector('.live-bus-marker');
mode='failure';await page.locator('#live-refresh').click();await page.waitForFunction(()=>document.getElementById('live-refresh').disabled===false);assert.equal(await page.locator('.live-bus-marker').count(),0);assert.match(await page.locator('#live-status').textContent(),/unavailable/);
await page.locator('.map-layers summary').click();
await page.getByRole('button',{name:'Route 2: Cobleskill local',exact:true}).click();
await page.locator('.route-stops summary').click();await page.locator('.route-stop-list button').first().click();
assert.equal(await page.locator('#departure-board').isVisible(),true);
await page.getByRole('button',{name:'Share this stop →',exact:true}).click();const shareUrl=await page.locator('#share-url').inputValue();assert.ok(new URL(shareUrl).searchParams.get('stop'));await page.locator('#close-share').click();
const stopTitle=await page.locator('#detail h2').textContent();await page.goto(shareUrl);await page.waitForSelector('#departure-board');assert.equal(await page.locator('#detail h2').textContent(),stopTitle);
await page.locator('#county-view').click();await page.waitForFunction(()=>!document.getElementById('show-county').disabled);assert.equal(await page.locator('[aria-label^="Agency map area:"]').count(),10);assert.equal(await page.locator('[aria-label^="Agency map location:"]').count(),12);
// Inspect every published run through the actual timetable UI.
let checkedRuns=0;
for(const route of ['1','2','2A','3','22']){
 await page.locator(`.route-card[aria-label^="Route ${route}:"]`).click();
 await page.getByRole('button',{name:'View timetable',exact:true}).click();
 const values=await page.locator('#run-select option').evaluateAll(nodes=>nodes.map(n=>n.value));
 for(const id of values){
  await page.locator('#run-select').selectOption(id);checkedRuns++;
  if(id==='Route 1 - Loop 3')assert.match(await page.locator('#schedule-body').textContent(),/12:46 PM/);
  if(id==='Route 2-Loop 4'){
   const row=page.locator('#schedule-body tr').filter({hasText:'Teen Town'});assert.match(await row.textContent(),/Confirm with dispatch/);assert.match(await row.textContent(),/12:41 PM/);
  }
  if(id==='SC_R2A_WDSa_01_T01'){
   const row=page.locator('#schedule-body tr').filter({hasText:'Greenbridge'});assert.match(await row.textContent(),/3:20 PM/);assert.match(await row.textContent(),/Standard stop/);
  }
  if(id==='SC_R22_WD_PM_T01'){assert.match(await page.locator('#run-select option:checked').textContent(),/Toward Cobleskill/);assert.match(await page.locator('#schedule-body').textContent(),/6:05 PM/);assert.match(await page.locator('#schedule-body tr').last().textContent(),/Drop-off only — coordinate with driver/);}
 }
 await page.locator('#close-schedule').click();
}
assert.equal(checkedRuns,23);
await page.locator('.route-card[aria-label^="Route 2:"]').click();await page.locator('.route-stops summary').click();
assert.equal(await page.locator('#detail').evaluate(e=>e.scrollHeight>e.clientHeight),true);
await page.locator('.route-stop-list button').filter({hasText:'SUNY'}).click();assert.match(await page.locator('#detail').textContent(),/GTFS and SCPT map pins differ/);
assert.equal((await page.request.get(new URL('/ROUTE_AUDIT.md',page.url()).href)).status(),200);
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.locator('#show-list').click();await page.getByRole('button',{name:'Route 5: County demand response',exact:true}).click();assert.equal(await page.locator('#map-empty').isVisible(),true);assert.match(await page.locator('#detail').textContent(),/Gilboa/);assert.equal(await page.locator('[aria-label^="Agency map area:"]').count(),10);
await page.keyboard.press('/');assert.equal(await page.locator('#search').evaluate(e=>e===document.activeElement),true);await page.locator('#search').fill('Gilboa');assert.equal(await page.locator('.route-card').count(),1);
assert.deepEqual(errors,[]);console.log('PASS: all 23 timetables, uncertainty/coordinate notes, mobile layout and live-data failure paths.');await browser.close();
