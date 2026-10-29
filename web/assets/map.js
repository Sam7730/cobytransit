const NS='http://www.w3.org/2000/svg';
function svg(name,attrs={},text){const e=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
function world(lat,lon,z){const scale=256*2**z,s=Math.sin(lat*Math.PI/180);return [(lon+180)/360*scale,(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*scale];}
function fromWorld(x,y,z){const scale=256*2**z;return [Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI,x/scale*360-180];}
export class TransitMap{
 constructor(data,routes,onStop){this.data=data;this.routes=routes;this.onStop=onStop;this.container=document.getElementById('map-container');this.root=document.getElementById('route-map');this.tiles=document.getElementById('tiles');this.tileCache=new Map();this.center=[42.679,-74.48];this.zoom=14;this.selected='2';this.street=false;this.activeStop=null;this.demo=false;this.demoProgress=0;this.drag=null;
 new ResizeObserver(()=>{this.draw();}).observe(this.container);
 this.container.addEventListener('pointerdown',e=>{if(e.target.closest('.map-stop'))return;this.drag={x:e.clientX,y:e.clientY,center:world(...this.center,this.zoom)};this.container.setPointerCapture(e.pointerId);});
 this.container.addEventListener('pointermove',e=>{if(!this.drag)return;this.center=fromWorld(this.drag.center[0]-e.clientX+this.drag.x,this.drag.center[1]-e.clientY+this.drag.y,this.zoom);this.draw();});
 this.container.addEventListener('pointerup',()=>this.drag=null);this.container.addEventListener('pointercancel',()=>this.drag=null);
 document.getElementById('zoom-in').onclick=()=>this.changeZoom(1);document.getElementById('zoom-out').onclick=()=>this.changeZoom(-1);document.getElementById('reset-map').onclick=()=>this.fit();
 document.getElementById('local-view').onclick=()=>{this.center=[42.679,-74.48];this.zoom=14;this.setRegion(false);this.draw();};
 document.getElementById('county-view').onclick=()=>{this.center=[42.676,-74.25];this.zoom=10;this.setRegion(true);this.draw();};
 document.getElementById('basemap').onclick=()=>{this.street=!this.street;const b=document.getElementById('basemap');b.setAttribute('aria-pressed',String(this.street));b.querySelector('span').textContent=this.street?'on':'off';document.getElementById('osm-credit').hidden=!this.street;document.getElementById('geometry-note').textContent=this.street?'Agency routes on OpenStreetMap':'Agency route geometry · no street basemap';if(this.street)b.title='OpenStreetMap receives your IP and the map area viewed.';this.draw();};
 }
 setRegion(regional){document.getElementById('county-view').classList.toggle('active',regional);document.getElementById('local-view').classList.toggle('active',!regional);document.getElementById('map-place').textContent=regional?'Schoharie County & region':'Cobleskill, New York';}
 select(id){this.selected=id;this.activeStop=null;this.stopDemo();this.fit();}
 stop(id){this.activeStop=id;const s=this.data.stops[id];this.center=[s.lat,s.lon];this.zoom=14;this.draw();}
 changeZoom(d){this.zoom=Math.max(8,Math.min(17,this.zoom+d));this.draw();}
 fit(){const trips=this.data.trips.filter(t=>t.route===this.selected),ids=[...new Set(trips.flatMap(t=>t.calls.map(c=>c.stop)))],pts=ids.map(i=>this.data.stops[i]);
 if(!pts.length){this.center=[42.676,-74.25];this.zoom=this.selected==='campus'?14:10;if(this.selected==='campus')this.center=[42.675,-74.499];this.setRegion(this.selected!=='campus');this.draw();return;}
 const minLat=Math.min(...pts.map(s=>s.lat)),maxLat=Math.max(...pts.map(s=>s.lat)),minLon=Math.min(...pts.map(s=>s.lon)),maxLon=Math.max(...pts.map(s=>s.lon));this.center=[(minLat+maxLat)/2,(minLon+maxLon)/2];
 const w=this.container.clientWidth||1000,h=this.container.clientHeight||700;this.zoom=17;
 while(this.zoom>8){const a=world(minLat,minLon,this.zoom),b=world(maxLat,maxLon,this.zoom);if(Math.abs(a[0]-b[0])<w-190&&Math.abs(a[1]-b[1])<Math.max(180,h-390))break;this.zoom--;}
 this.setRegion(!['2','2A'].includes(this.selected));this.draw();}
 draw(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.root.setAttribute('viewBox',`0 0 ${w} ${h}`);this.root.replaceChildren();const center=world(...this.center,this.zoom),oy=h/2-(w<600?85:65),ox=w/2;const project=(lat,lon)=>{const p=world(lat,lon,this.zoom);return [p[0]-center[0]+ox,p[1]-center[1]+oy];};
 const wanted=new Set();if(this.street){const left=center[0]-ox,top=center[1]-oy;for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+h)/256);y++){if(x<0||y<0||x>=2**this.zoom||y>=2**this.zoom)continue;const key=`${this.zoom}/${x}/${y}`,pos=[x*256-left,y*256-top];wanted.add(key);let img=this.tileCache.get(key);if(!img){img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.draggable=false;img.src=`https://tile.openstreetmap.org/${key}.png`;img.onerror=()=>{document.getElementById('geometry-note').textContent='Street tiles unavailable · agency geometry still shown';};this.tiles.append(img);this.tileCache.set(key,img);}img.style.left=`${pos[0]}px`;img.style.top=`${pos[1]}px`;}}
 for(const[k,img]of this.tileCache)if(!wanted.has(k)){img.remove();this.tileCache.delete(k);}
 if(!this.street){const defs=svg('defs');const pattern=svg('pattern',{id:'map-grid',width:48,height:48,patternUnits:'userSpaceOnUse'});pattern.append(svg('path',{d:'M 48 0 L 0 0 0 48',fill:'none',stroke:'#e5eadb','stroke-width':'.6'}));defs.append(pattern);this.root.append(defs,svg('rect',{width:w,height:h,fill:'url(#map-grid)'}));
 // Abstract contours are decorative, not surveyed terrain or roads.
 for(let i=0;i<7;i++)this.root.append(svg('ellipse',{cx:w*.82,cy:h*.2,rx:w*.23+i*32,ry:90+i*29,fill:'none',stroke:'#e2e8d6','stroke-width':1,transform:`rotate(-23 ${w*.82} ${h*.2})`,'aria-hidden':'true'}));
 for(let i=0;i<4;i++)this.root.append(svg('ellipse',{cx:w*.12,cy:h*.83,rx:100+i*35,ry:70+i*26,fill:'none',stroke:'#e1e7d6','stroke-width':1,'aria-hidden':'true'}));
 }
 const shapeIds=[...new Set(this.data.trips.map(t=>t.shape))];const pathFor=id=>(this.data.shapes[id]||[]).map((p,i)=>{const[x,y]=project(...p);return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`;}).join('');
 for(const id of shapeIds)this.root.append(svg('path',{d:pathFor(id),fill:'none',stroke:this.street?'#9eae9950':'#d4ddc7','stroke-width':this.street?2:8,'stroke-linejoin':'round','stroke-linecap':'round','aria-hidden':'true'}));
 const r=this.routes.find(r=>r.id===this.selected),selectedShapes=[...new Set(this.data.trips.filter(t=>t.route===this.selected).map(t=>t.shape))];
 for(const id of selectedShapes){const d=pathFor(id);this.root.append(svg('path',{d,fill:'none',stroke:'#fff','stroke-width':8,'stroke-linecap':'round','stroke-linejoin':'round'}),svg('path',{d,fill:'none',stroke:r.color,'stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'}));}
 const towns=[['COBLESKILL',42.6795,-74.487],['RICHMONDVILLE',42.635,-74.564],['CENTRAL BRIDGE',42.712,-74.335],['SCHOHARIE',42.667,-74.31],['MIDDLEBURGH',42.595,-74.329],['ALBANY',42.648,-73.765]];
 if(!this.street)for(const[name,lat,lon]of towns){const[x,y]=project(lat,lon);if(x>20&&x<w-80&&y>50&&y<h-150)this.root.append(svg('text',{x,y,class:'map-town','aria-hidden':'true'},name));}
 const selectedStops=[...new Set(this.data.trips.filter(t=>t.route===this.selected).flatMap(t=>t.calls.map(c=>c.stop)))];if(this.activeStop&&!selectedStops.includes(this.activeStop))selectedStops.push(this.activeStop);
 const labelBoxes=[];
 const priority=s=>/SUNY Cobleskill|Wal-Mart|Main & Center|Hospital$|Price Chopper|County Office|Middleburgh Library/.test(s.name)?1:0;
 selectedStops.sort((a,b)=>priority(this.data.stops[b])-priority(this.data.stops[a]));
 for(const id of selectedStops){const s=this.data.stops[id],[x,y]=project(s.lat,s.lon);if(x<-5||x>w+5||y<0||y>h)continue;const g=svg('g',{class:'map-stop',role:'button',tabindex:0,'aria-label':`View stop: ${s.name}`});g.append(svg('circle',{cx:x,cy:y,r:id===this.activeStop?8:4.5,stroke:r?.color||'#258265'}));
 const text=s.name.replace('SUNY Cobleskill,  Knapp Circle','SUNY · Knapp Circle').replace('Main & Center St., Cobleskill','Main & Center').replace('Main & Union Street, Cobleskill','Main & Union').replace('Price Chopper Plaza','Price Chopper').replace('Wal-Mart Plaza','Walmart').replace(/ - On call/i,'');const labelY=y-12,labelX=x+9,labelW=Math.min(160,text.length*5.7);
 if((priority(s)||id===this.activeStop)&&x+labelW+15<w&&labelY>140&&labelY<h-(w<600?310:230)&&!labelBoxes.some(b=>labelX<b[2]&&labelX+labelW>b[0]&&labelY-10<b[3]&&labelY+8>b[1])){g.append(svg('text',{x:labelX,y:labelY},text));labelBoxes.push([labelX,labelY-10,labelX+labelW,labelY+8]);}
 g.append(svg('title',{},s.name));g.addEventListener('click',e=>{e.stopPropagation();this.onStop(id);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onStop(id);}});this.root.append(g);}
 if(this.demo&&selectedShapes.length){const shape=this.data.shapes[selectedShapes[0]],p=shape[Math.floor(this.demoProgress*(shape.length-1))],[x,y]=project(...p);this.root.append(svg('rect',{x:x-12,y:y-11,width:24,height:22,rx:6,class:'demo-bus'}),svg('text',{x:x+17,y:y-10,class:'demo-text'},'SIMULATED'));
 }
 }
 toggleDemo(){if(this.demo){this.stopDemo();return false;}this.demo=true;this.demoProgress=0;this.tick=setInterval(()=>{this.demoProgress=(this.demoProgress+.003)%1;this.draw();},180);this.draw();return true;}
 stopDemo(){this.demo=false;clearInterval(this.tick);this.draw();}
}
