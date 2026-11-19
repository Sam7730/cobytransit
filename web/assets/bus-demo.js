// Explicitly synthetic route animation for demonstrations only. Never feeds the live GPS API.
export function installBusDemo(view) {
 const L=window.L;
 const panel=document.createElement('div');
 panel.className='bus-demo-controls';
 panel.style.cssText='position:absolute;z-index:800;left:12px;bottom:42px;background:#fff;color:#173f34;border:2px solid #167b5a;border-radius:12px;padding:10px;max-width:240px;box-shadow:0 3px 12px #0002;font:13px system-ui';
 const label=document.createElement('strong');label.textContent='🚌 GPS simulation · DEMO ONLY';
 const note=document.createElement('div');note.textContent='Animated along published route shapes, not real bus positions.';note.style.margin='5px 0';
 const button=document.createElement('button');button.type='button';button.textContent='Start demo';button.style.cssText='padding:7px 12px;border:0;border-radius:7px;background:#176b50;color:white;cursor:pointer';
 const status=document.createElement('div');status.setAttribute('role','status');status.style.marginTop='5px';status.textContent='Stopped';
 panel.append(label,note,button,status);
 const host=document.querySelector('.map-area');host.style.position='relative';host.append(panel);
 const layer=L.layerGroup().addTo(view.map);
 let timer=null,markers=[],paths=[];
 function routePaths(){
  const seen=new Set(),out=[];
  for(const trip of view.data.trips){
   if(view.mode==='none'||(view.mode==='selected'&&trip.route!==view.selected))continue;
   if(view.activeTrip&&view.mode==='selected'&&trip.id!==view.activeTrip)continue;
   const key=trip.route+'/'+trip.shape;
   if(seen.has(key))continue;seen.add(key);
   const points=view.data.shapes[trip.shape];
   if(!Array.isArray(points)||points.length<2)continue;
   // Cap the demo at one vehicle per route, not one per scheduled trip.
   if(out.some(p=>p.route===trip.route))continue;
   out.push({route:trip.route,points});
  }
  return out;
 }
 function rebuild(){
  layer.clearLayers();markers=[];paths=routePaths();
  for(const path of paths){
   const icon=L.divIcon({className:'',html:'<span style="display:grid;place-items:center;width:36px;height:36px;background:#fff;border:2px solid #126d50;border-radius:50%;box-shadow:0 2px 8px #0005;font-size:22px">🚌</span>',iconSize:[40,40],iconAnchor:[20,20]});
   const marker=L.marker(path.points[0],{icon,title:'SIMULATED bus · Route '+path.route,zIndexOffset:1200}).addTo(layer);
   const box=document.createElement('div');const head=document.createElement('strong');head.textContent='DEMO ONLY · Route '+path.route;const body=document.createElement('p');body.textContent='Synthetic moving bus. Not live GPS, a real vehicle, or an arrival estimate.';box.append(head,body);marker.bindPopup(box);
   const distances=[0];for(let i=1;i<path.points.length;i++)distances.push(distances[i-1]+view.map.distance(path.points[i-1],path.points[i]));
   markers.push({marker,points:path.points,distances,total:distances.at(-1),route:path.route});
  }
  status.textContent=paths.length?'Simulating '+paths.length+' route'+(paths.length===1?'':'s'):'No fixed route geometry for this selection';
 }
 function tick(){
  const now=performance.now()/1000;
  for(const m of markers){
   if(!m.total)continue;
   // Each route cycles every 90 seconds; return to start is a simulation reset.
   const distance=((now/90)%1)*m.total;
   let i=1;while(i<m.distances.length-1&&m.distances[i]<distance)i++;
   const a=m.points[i-1],b=m.points[i],span=m.distances[i]-m.distances[i-1];
   const t=span?Math.max(0,Math.min(1,(distance-m.distances[i-1])/span)):0;
   m.marker.setLatLng([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
  }
 }
 function stop(){if(timer!==null)clearInterval(timer);timer=null;layer.clearLayers();markers=[];button.textContent='Start demo';status.textContent='Stopped';button.setAttribute('aria-pressed','false');}
 button.addEventListener('click',()=>{
  if(timer!==null){stop();return;}
  rebuild();if(!markers.length)return;
  tick();timer=setInterval(tick,100);button.textContent='Stop demo';button.setAttribute('aria-pressed','true');
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&timer!==null)stop();});
 return {sync(){if(timer!==null){rebuild();tick();}}};
}
