// Synthetic GPS demonstration. Never sends positions to the live GPS API.
const MPH=0.44704, CRUISE=30*MPH, SLOW=12*MPH, ACCEL=1.0, BRAKE=1.5, DWELL=6;
const rad=n=>n*Math.PI/180;
const bearing=(a,b)=>{const y=Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0])),x=Math.cos(rad(a[0]))*Math.sin(rad(b[0]))-Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));return (Math.atan2(y,x)*180/Math.PI+360)%360;};
const angle=(a,b)=>((b-a+540)%360)-180;
function geometry(points,map){
 const clean=[points[0]];for(const p of points.slice(1))if(map.distance(clean.at(-1),p)>.5)clean.push(p);
 const distances=[0];for(let i=1;i<clean.length;i++)distances.push(distances[i-1]+map.distance(clean[i-1],clean[i]));
 return {points:clean,distances,total:distances.at(-1)};
}
function position(g,d){
 let lo=1,hi=g.distances.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(g.distances[mid]<d)lo=mid+1;else hi=mid;}
 const a=g.points[lo-1],b=g.points[lo],t=Math.max(0,Math.min(1,(d-g.distances[lo-1])/(g.distances[lo]-g.distances[lo-1])));
 return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
}
function stopDistances(g,trip,view){
 const found=[];
 for(const call of trip.calls||[]){
  const stop=view.data.stops[call.stop];if(!stop)continue;
  const p=[stop.lat,stop.lon];let best=Infinity,at=0;
  for(let i=1;i<g.points.length;i++){
   const a=g.points[i-1],b=g.points[i],scale=Math.cos(rad(p[0])),x=(b[1]-a[1])*scale,y=b[0]-a[0];
   const t=Math.max(0,Math.min(1,((p[1]-a[1])*scale*x+(p[0]-a[0])*y)/(x*x+y*y)));
   const d=view.map.distance(p,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
   if(d<best){best=d;at=g.distances[i-1]+t*(g.distances[i]-g.distances[i-1]);}
  }
  if(best<=120&&at>25&&at<g.total-25)found.push(at);
 }
 return [0,...found.sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>35),g.total];
}
function advance(m,dt,multiplier){
 dt*=multiplier;
 // Small physics steps keep acceleration, braking and dwell stable at either playback speed.
 while(dt>0){const h=Math.min(dt,.1);dt-=h;
  if(m.dwell>0){m.dwell=Math.max(0,m.dwell-h);continue;}
  const target=m.direction>0?m.stops.find(s=>s>m.distance+.05):m.stops.findLast(s=>s<m.distance-.05);
  if(target===undefined){m.direction*=-1;continue;}
  const remaining=Math.abs(target-m.distance);
  const here=position(m,m.distance),ahead=position(m,Math.max(0,Math.min(m.total,m.distance+m.direction*25))),far=position(m,Math.max(0,Math.min(m.total,m.distance+m.direction*65)));
  const turn=Math.abs(angle(bearing(here,ahead),bearing(ahead,far)));
  const desired=Math.min(turn>45?SLOW:CRUISE,Math.sqrt(2*BRAKE*remaining));
  m.speed=Math.max(0,m.speed+Math.max(-BRAKE*h,Math.min(ACCEL*h,desired-m.speed)));
  const move=m.speed*h;
  if(move>=remaining||remaining<.15){m.distance=target;m.speed=0;m.dwell=DWELL;if(target===m.total||target===0)m.direction*=-1;}
  else m.distance+=m.direction*move;
 }
}
function node(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function busIcon(L,route){
 const root=node('div','demo-bus-root'),body=node('div','demo-bus-heading'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 40 52');svg.setAttribute('aria-hidden','true');
 // Isometric-style shading, wheels, roof, windshield, and headlights. Front faces north.
 svg.innerHTML='<ellipse cx="22" cy="28" rx="15" ry="22" fill="#101b25" opacity=".22"/><rect x="5" y="12" width="5" height="12" rx="2" fill="#17242a"/><rect x="30" y="12" width="5" height="12" rx="2" fill="#17242a"/><rect x="5" y="33" width="5" height="10" rx="2" fill="#17242a"/><rect x="30" y="33" width="5" height="10" rx="2" fill="#17242a"/><rect x="8" y="4" width="25" height="44" rx="7" fill="#114b3b" stroke="#102f2a" stroke-width="1.5"/><path d="M10 13 L13 7 H28 L31 13 V39 L28 43 H12 L10 39Z" fill="#e8f3ee"/><path d="M12 11 Q20 7 29 11 L28 18 H13Z" fill="#284858"/><path d="M13 11 L26 10 L20 17 H13Z" fill="#80b8cd"/><path d="M10 21 H13 V36 H10Z M28 21 H31 V36 H28Z" fill="#365a66"/><rect x="15" y="22" width="11" height="12" rx="2" fill="#fafdfb" stroke="#bdcfc7"/><path d="M13 38 H28 L27 42 H14Z" fill="#487383"/><rect x="10" y="5" width="5" height="3" rx="1" fill="#fff5b3"/><rect x="26" y="5" width="5" height="3" rx="1" fill="#fff5b3"/><rect x="11" y="44" width="5" height="2" rx="1" fill="#e95648"/><rect x="25" y="44" width="5" height="2" rx="1" fill="#e95648"/>';
 body.append(svg);root.append(body,node('span','demo-bus-route','R'+route));return L.divIcon({className:'simulated-bus-marker demo-bus-3d',html:root,iconSize:[40,52],iconAnchor:[20,26]});
}
export function installBusDemo(view){
 const L=window.L,panel=node('div','bus-demo-controls demo-controls-3d'),label=node('strong','','GPS simulation · DEMO ONLY'),note=node('p','','Synthetic route replay · not actual GPS or arrival times.');
 const button=node('button','secondary','Start demo');button.type='button';button.setAttribute('aria-pressed','false');
 const speedLabel=node('label','','Playback speed '),speed=node('select');for(const [value,txt] of [[1,'1× realistic'],[2,'2× preview']]){const opt=node('option','',txt);opt.value=String(value);speed.append(opt);}speed.value='1';speedLabel.append(speed);
 const status=node('div','','Stopped');status.setAttribute('role','status');panel.append(label,note,button,speedLabel,status);
 document.querySelector('.map-area').append(panel);
 const layer=L.layerGroup().addTo(view.map);let frame=null,markers=[],last=0,summaryAt=0;
 function rebuild(){
  const previous=new Map(markers.map(m=>[m.key,m]));layer.clearLayers();markers=[];const seen=new Set();
  for(const trip of view.data.trips){
   if(view.mode==='none'||(view.mode==='selected'&&(trip.route!==view.selected||(view.activeTrip&&trip.id!==view.activeTrip)))||seen.has(trip.route))continue;
   const points=view.data.shapes[trip.shape];if(!Array.isArray(points)||points.length<2)continue;
   const g=geometry(points,view.map);if(g.total<1)continue;seen.add(trip.route);
   const key=trip.route+'/'+trip.shape,old=previous.get(key);
   const m={...g,key,route:trip.route,stops:stopDistances(g,trip,view),distance:old?.distance??0,direction:old?.direction??1,speed:old?.speed??0,dwell:old?.dwell??0,heading:old?.heading??bearing(g.points[0],g.points[1])};
   m.marker=L.marker(position(m,m.distance),{icon:busIcon(L,trip.route),title:'DEMO bus · Route '+trip.route,zIndexOffset:1200}).addTo(layer);
   const box=node('div','demo-popup');m.readout=node('p','','0 mph');box.append(node('strong','','SIMULATED BUS · Route '+trip.route),m.readout,node('p','','Reference geometry only. No actual vehicle, GPS fix or ETA. Open paths reverse at endpoints for this demo.'));
   m.marker.bindPopup(box);markers.push(m);render(m,0);
  }
  status.textContent=markers.length?markers.length+' simulated bus(es) · 30 mph maximum':'No fixed route path in this selection';
 }
 function render(m,dt){
  const p=position(m,m.distance),ahead=position(m,Math.max(0,Math.min(m.total,m.distance+m.direction*12)));
  if(view.map.distance(p,ahead)>.1){const target=bearing(p,ahead);m.heading=(m.heading+angle(m.heading,target)*Math.min(1,dt*5||1)+360)%360;}
  m.marker.setLatLng(p);const el=m.marker.getElement()?.querySelector('.demo-bus-heading');if(el)el.style.transform='rotate('+m.heading+'deg)';
  m.readout.textContent=Math.round(m.speed/MPH)+' mph · '+(m.dwell>0?'Stopped / boarding':m.speed<.5?'Starting':'Moving');
 }
 function tick(now){const dt=Math.min(.25,(now-last)/1000);last=now;for(const m of markers){advance(m,dt,Number(speed.value));render(m,dt);}if(now-summaryAt>1000){summaryAt=now;if(markers.length){const moving=markers.filter(m=>m.speed>.5);const avg=moving.length?Math.round(moving.reduce((s,m)=>s+m.speed/MPH,0)/moving.length):0;status.textContent=markers.length+' demo bus(es) · '+avg+' mph avg moving · '+(markers.length-moving.length)+' stopped';}}frame=requestAnimationFrame(tick);}
 function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;layer.clearLayers();markers=[];button.textContent='Start demo';status.textContent='Stopped';button.setAttribute('aria-pressed','false');}
 button.onclick=()=>{if(frame!==null){stop();return;}rebuild();if(!markers.length)return;last=performance.now();frame=requestAnimationFrame(tick);button.textContent='Stop demo';button.setAttribute('aria-pressed','true');};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame!==null)stop();});
 return {sync(){if(frame!==null)rebuild();}};
}
