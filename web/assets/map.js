import './vendor/leaflet.js';
import {freshVehicle, SERVICE_BOUNDS} from './live-data.js';
const L=window.L, $=id=>document.getElementById(id);
function textNode(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
function popup(title,lines){const box=document.createElement('div');box.append(textNode('strong',title));for(const line of lines)box.append(textNode('p',line));return box;}
export class TransitMap {
 constructor(data,routes,onStop,onCounty){
  this.data=data;this.routes=routes;this.onStop=onStop;this.onCounty=onCounty;this.selected='2';this.activeStop=null;this.mode='all';this.vehicles=[];this.vehicleMarkers=new Map();this.incidents=[];this.showStops=true;
  this.map=L.map('map-container',{zoomControl:false,attributionControl:false,zoomSnap:.25,minZoom:8,maxZoom:18,zoomAnimation:!matchMedia('(prefers-reduced-motion: reduce)').matches}).setView([42.59,-74.44],10);
  this.map.setMaxBounds([[41.9,-75.3],[43.3,-73.2]]);
  this.streets=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin'}).addTo(this.map);
  this.streets.on('tileerror',()=>{$('geometry-note').textContent='Street tiles unavailable · routes and stops remain available';});
  this.streets.on('load',()=>{if(this.streets.getContainer()?.querySelector('.leaflet-tile-loaded'))$('geometry-note').textContent='Agency routes on OpenStreetMap';});
  this.map.createPane('serviceAreas');this.map.getPane('serviceAreas').style.zIndex='360';this.serviceLayers=L.layerGroup().addTo(this.map);this.overlays=[];this.loadServiceMaps();
  this.routeLayers=L.layerGroup().addTo(this.map);this.stopLayers=L.layerGroup().addTo(this.map);this.vehicleLayers=L.layerGroup().addTo(this.map);this.incidentLayers=L.layerGroup().addTo(this.map);
  new ResizeObserver(()=>this.map.invalidateSize({pan:false})).observe($('map-container'));
  $('zoom-in').onclick=()=>this.map.zoomIn();$('zoom-out').onclick=()=>this.map.zoomOut();$('reset-map').onclick=()=>this.fit();
  $('local-view').onclick=()=>{this.map.setView([42.679,-74.48],14);this.setRegion(false);};
  $('county-view').onclick=()=>this.county();
  $('basemap').onclick=()=>{const on=this.map.hasLayer(this.streets);if(on)this.streets.remove();else this.streets.addTo(this.map);$('basemap').setAttribute('aria-pressed',String(!on));$('basemap').querySelector('span').textContent=on?'off':'on';$('osm-credit').hidden=on;$('geometry-note').textContent=on?'Agency geometry · street map off':'Agency routes on OpenStreetMap';};
  for(const mode of ['selected','all','none'])$(`routes-${mode}`).onclick=()=>{this.mode=mode;this.activeStop=null;if(mode==='none')this.draw();else this.fit();};
  $('show-county').disabled=true;this.loadCounty();
  $('show-county').onchange=e=>{if(!this.countyLayer)return;if(e.target.checked)this.countyLayer.addTo(this.map);else this.countyLayer.remove();};
  $('show-stops').onchange=e=>{this.showStops=e.target.checked;this.draw();};
  $('traffic-flow').onchange=e=>this.toggleFlow(e.target.checked);
  $('traffic-incidents').onchange=()=>this.drawIncidents();
  $('live-refresh').onclick=()=>this.refresh();
  $('fullscreen-map').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.map-area').requestFullscreen();}catch{$('geometry-note').textContent='Full screen is unavailable in this browser.';}};
  document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;$('fullscreen-map').setAttribute('aria-pressed',String(full));this.map.invalidateSize();});
  this.expiryTimer=setInterval(()=>this.drawVehicles(),5000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(this.pollTimer);this.vehicles=[];this.incidents=[];this.drawVehicles();this.drawIncidents();this.toggleFlow(false);$('live-status').textContent='Paused while this tab is hidden';}else this.refresh();});
  window.addEventListener('offline',()=>{this.vehicles=[];this.incidents=[];this.drawVehicles();this.drawIncidents();this.toggleFlow(false);$('traffic-flow').checked=false;$('live-status').textContent='Offline · live locations unavailable';$('traffic-status').textContent='Offline · check conditions when reconnected';});
  window.addEventListener('online',()=>this.refresh());
  this.refresh();
 }
 async loadServiceMaps(){
  try{const response=await fetch('./assets/service-overlays.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Service maps unavailable');const data=await response.json();
   if(!Array.isArray(data.features)||data.features.length>100||!data.features.every(f=>['5','20','23'].includes(f.properties?.route)))throw Error('Invalid service maps');
   this.overlays=data.features;if(this.mode==='selected'&&!this.activeStop&&['5','20','23'].includes(this.selected))this.fit();else this.draw();
  }catch{this.overlays=[];}
 }
 drawServiceMaps(){
  this.serviceLayers.clearLayers();
  if(this.mode==='none')return;
  const features=this.overlays.filter(f=>this.mode==='all'||f.properties.route===this.selected);
  L.geoJSON(features,{
   pane:'serviceAreas',style:feature=>feature.geometry.type==='Point'?{color:'#8c5d14',weight:2,fillColor:'#ffe2a6',fillOpacity:1}:{color:'#a47a2a',weight:1.5,dashArray:'4 4',fillColor:'#d7c17e',fillOpacity:.16},
   pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:6,color:'#8c5d14',weight:2,fillColor:'#ffe2a6',fillOpacity:1}),
   onEachFeature:(feature,layer)=>{
    const p=feature.properties,area=p.kind==='reservation-area';
    const box=popup(`${p.name} · Route ${p.route}`,[area?`${p.days} · reservation pickup area`:'Location shown on the agency’s map',area?'Call SCPT to confirm pickup for your address. The shaded area is not a fixed bus path.':'Reservations required. Confirm the location and service time with SCPT; map entries can differ from the timetable.']);
    const link=textNode('a','Official route details →');link.href=`https://ridescpt.com/index.php/routes/route-${p.route}`;link.target='_blank';link.rel='noopener noreferrer';box.append(link);
    layer.bindTooltip(textNode('span',`Route ${p.route} · ${p.name} · reserve ahead`)).bindPopup(box);
    layer.on('add',()=>{const element=layer.getElement();if(!element)return;element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',`Agency map ${area?'area':'location'}: ${p.name}, Route ${p.route}`);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();layer.openPopup();}});});
   }
  }).addTo(this.serviceLayers);
 }
 async loadCounty(){
  try{
   const response=await fetch('./assets/schoharie-county.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Boundary unavailable');const geo=await response.json();
   if(geo.features?.length!==1||geo.features[0].properties?.GEOID!=='36095')throw Error('Wrong county');
   this.map.createPane('countyBoundary');this.map.getPane('countyBoundary').style.zIndex='350';
   this.countyLayer=L.geoJSON(geo,{pane:'countyBoundary',style:{color:'#576f52',weight:2,dashArray:'7 6',fillColor:'#b1d38e',fillOpacity:.08},interactive:false}).addTo(this.map);
   $('show-county').disabled=false;
  }catch{$('show-county').checked=false;$('show-county').closest('label').append(textNode('small',' · unavailable'));}
 }
 county(){this.mode='all';this.activeStop=null;this.onCounty?.();this.map.invalidateSize({pan:false});this.map.fitBounds([[42.35502,-74.71158],[42.82956,-74.16468]],{paddingTopLeft:[30,155],paddingBottomRight:[55,75]});this.setRegion(true);this.draw();}
 setRegion(regional){$('county-view').classList.toggle('active',regional);$('local-view').classList.toggle('active',!regional);$('map-place').textContent=regional?'Schoharie County':'Cobleskill, New York';}
 select(id){this.selected=id;this.activeStop=null;this.mode='selected';this.fit();}
 stop(id){this.activeStop=id;const s=this.data.stops[id];this.map.invalidateSize({pan:false});this.map.setView([s.lat,s.lon],16);this.draw();}
 fit(){
  this.map.invalidateSize({pan:false});
  const trips=this.data.trips.filter(t=>this.mode==='all'||t.route===this.selected),points=trips.flatMap(t=>this.data.shapes[t.shape]||[]);
  if(this.mode==='all'){points.push([42.35502,-74.71158],[42.82956,-74.16468]);for(const feature of this.overlays){const bounds=L.geoJSON(feature).getBounds();if(bounds.isValid())points.push(bounds.getSouthWest(),bounds.getNorthEast());}}
  if(points.length)this.map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[30,165],paddingBottomRight:[55,85],maxZoom:15});
  else {const features=this.overlays.filter(f=>f.properties.route===this.selected);if(features.length)this.map.fitBounds(L.geoJSON(features).getBounds(),{paddingTopLeft:[35,180],paddingBottomRight:[60,85],maxZoom:13});else this.map.setView(this.selected==='campus'?[42.675,-74.499]:[42.61,-74.4],this.selected==='campus'?14:10);}
  this.setRegion(!['2','2A','campus'].includes(this.selected));this.draw();
 }
 draw(){
  this.map.invalidateSize({pan:false});this.drawServiceMaps();this.routeLayers.clearLayers();this.stopLayers.clearLayers();
  for(const mode of ['selected','all','none'])$(`routes-${mode}`).setAttribute('aria-pressed',String(this.mode===mode));
  const trips=this.data.trips.filter(t=>this.mode==='all'||(this.mode==='selected'&&t.route===this.selected));
  const shapes=new Set();
  for(const trip of trips){const key=`${trip.route}/${trip.shape}`;if(shapes.has(key))continue;shapes.add(key);const color=this.routes.find(r=>r.id===trip.route)?.color||'#1d7356',points=this.data.shapes[trip.shape];
   L.polyline(points,{color:'#fff',weight:8,opacity:.9,interactive:false}).addTo(this.routeLayers);
   L.polyline(points,{color,weight:4,opacity:.95}).bindTooltip(textNode('span',`SCPT Route ${trip.route}`)).addTo(this.routeLayers);
  }
  const ids=new Set(this.showStops?trips.flatMap(t=>t.calls.map(c=>c.stop)):[]);if(this.activeStop)ids.add(this.activeStop);
  for(const id of ids){const s=this.data.stops[id],marker=L.circleMarker([s.lat,s.lon],{radius:id===this.activeStop?9:5,weight:2,color:'#183e35',fillColor:'#fff',fillOpacity:1}).addTo(this.stopLayers);
   marker.bindTooltip(textNode('span',s.name));marker.on('click',()=>this.onStop(id));
   const element=marker.getElement();element.setAttribute('tabindex','0');element.setAttribute('role','button');element.setAttribute('aria-label',`View stop: ${s.name}`);element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();this.onStop(id);}});
  }
  const hasOverlay=this.overlays.some(f=>f.properties.route===this.selected);
  $('map-empty').hidden=trips.length>0||this.mode==='none';
  $('map-empty').textContent=hasOverlay?'Agency reservation areas or map locations are shown. Confirm your pickup with SCPT; no fixed bus path is implied.':'This service has no fixed route line on this map. See the booking details below or check the official schedule.';
  this.drawVehicles();
 }
 drawVehicles(){
  const fresh=this.vehicles.filter(v=>freshVehicle(v));
  const visible=fresh.filter(v=>this.mode==='all'||(this.mode==='selected'&&v.routeId===this.selected));
  const visibleIds=new Set(visible.map(v=>v.id));for(const [id,marker] of this.vehicleMarkers)if(!visibleIds.has(id)){this.vehicleLayers.removeLayer(marker);this.vehicleMarkers.delete(id);}
  for(const v of visible){let marker=this.vehicleMarkers.get(v.id);if(!marker){const content=textNode('span',v.routeId);content.className='bus-marker-label';
   marker=L.marker([v.lat,v.lon],{icon:L.divIcon({className:'live-bus-marker',html:content,iconSize:[36,30],iconAnchor:[18,15]}),title:`Bus ${v.label}, route ${v.routeId}`,alt:`Live bus ${v.label}`,zIndexOffset:1000}).addTo(this.vehicleLayers);
   this.vehicleMarkers.set(v.id,marker);}
   marker.setLatLng([v.lat,v.lon]);const label=marker.getElement()?.querySelector('.bus-marker-label');if(label)label.textContent=v.routeId;
   marker.bindPopup(popup(`Bus ${v.label} · Route ${v.routeId}`,[`GPS measured ${new Date(v.timestamp*1000).toLocaleTimeString('en-US',{timeZone:'America/New_York'})} ET · ${Math.max(0,Math.floor(Date.now()/1000-v.timestamp))} seconds ago`,'Location only. Use the timetable for scheduled departures; no live arrival prediction is provided.']));
  }
  if(this.vehicles.length&&!fresh.length)$('live-status').textContent='GPS positions expired · waiting for fresh data';
  $('gps-badge').textContent=fresh.length?`${fresh.length} live buses`:'Scheduled times';
  $('gps-badge').dataset.live=String(fresh.length>0);
  $('live-summary').textContent=fresh.length?`${visible.length} buses shown for your route filter. GPS expires after 90 seconds.`:'No current bus positions to display.';
 }
 toggleFlow(enabled){
  if(this.flow){this.flow.remove();this.flow=null;}
  if(!enabled)return;
  this.flow=L.tileLayer(`/api/traffic/tiles/{z}/{x}/{y}.png?t=${Math.floor(Date.now()/60000)}`,{opacity:.8,bounds:[[SERVICE_BOUNDS.south,SERVICE_BOUNDS.west],[SERVICE_BOUNDS.north,SERVICE_BOUNDS.east]],maxZoom:18}).addTo(this.map);
  this.flow.on('tileerror',()=>{$('traffic-status').textContent='Some traffic tiles could not load. Check 511NY for current conditions.';});
 }
 drawIncidents(){this.incidentLayers.clearLayers();if(!$('traffic-incidents').checked)return;
  for(const item of this.incidents){const color=item.category===8?'#ae2634':'#bc6811',lines=[item.description,[item.from,item.to].filter(Boolean).join(' → '),item.delay===null?'Delay not reported':`Reported delay: ${Math.ceil(item.delay/60)} min`];
   if(item.points.length>1)L.polyline(item.points,{color,weight:6,dashArray:'6 5'}).bindPopup(popup('Road incident',lines)).addTo(this.incidentLayers);
   const symbol=textNode('span',item.category===8?'×':'!');
   L.marker(item.points[Math.floor(item.points.length/2)],{icon:L.divIcon({className:'incident-marker',html:symbol,iconSize:[26,26]}),title:item.description}).bindPopup(popup('Road incident',lines)).addTo(this.incidentLayers);
  }
 }
 async refresh(){
  clearTimeout(this.pollTimer);if(this.refreshing||document.hidden)return;this.refreshing=true;$('live-refresh').disabled=true;
  const fetchJson=async path=>{const r=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Unavailable');return r.json();};
  const results=await Promise.allSettled([fetchJson('./api/vehicles'),fetchJson('./api/traffic')]);
  if(document.hidden||!navigator.onLine){this.refreshing=false;$('live-refresh').disabled=false;return;}
  const buses=results[0],traffic=results[1];
  if(buses.status==='fulfilled'&&Array.isArray(buses.value.vehicles)){this.vehicles=buses.value.vehicles;$('live-status').textContent=buses.value.message;}
  else{this.vehicles=[];$('live-status').textContent='Live bus service unavailable · use the published timetable';}
  this.drawVehicles();
  if(traffic.status==='fulfilled'&&Array.isArray(traffic.value.incidents)){
   const state=traffic.value;this.incidents=state.connected?state.incidents:[];$('traffic-status').textContent=state.message;
   $('traffic-updated').textContent=state.connected?`Traffic checked ${new Date(state.checkedAt).toLocaleTimeString('en-US',{timeZone:'America/New_York'})} ET · TomTom`:'';
   for(const id of ['traffic-flow','traffic-incidents']){$(id).disabled=!state.connected;if(!state.connected)$(id).checked=false;}
   $('traffic-options').hidden=!state.connected;$('traffic-credit').hidden=!state.connected;this.toggleFlow(state.connected&&$('traffic-flow').checked);
  }else{this.incidents=[];this.toggleFlow(false);for(const id of ['traffic-flow','traffic-incidents']){$(id).disabled=true;$(id).checked=false;}$('traffic-status').textContent='Traffic service unavailable · check 511NY';$('traffic-updated').textContent='';$('traffic-credit').hidden=true;$('traffic-options').hidden=true;}
  this.drawIncidents();this.refreshing=false;$('live-refresh').disabled=false;if(!document.hidden)this.pollTimer=setTimeout(()=>this.refresh(),30000);
 }
}
