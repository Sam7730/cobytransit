import {normalizeVehicles, SERVICE_BOUNDS, inServiceArea} from '../web/assets/live-data.js';

// Bounded, per-isolate caches coalesce requests. Hosting rate limits are also
// required for a public deployment; these caches are not a global quota.
const liveCache = new Map();
async function cached(key, ttl, operation) {
  const now = Date.now(), entry = liveCache.get(key);
  if (entry && entry.until > now) return entry.promise;
  if (liveCache.size >= 300) liveCache.delete(liveCache.keys().next().value);
  const promise = operation();
  liveCache.set(key,{until:now+ttl,promise});
  return promise;
}
async function readRemote(url, headers = {}, max = 1000000) {
  const response = await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw Error('Provider unavailable');
  const reader = response.body.getReader(), chunks=[]; let size=0;
  try { for (;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length;if(size>max)throw Error('Provider response too large');chunks.push(value); } }
  finally { await reader.cancel().catch(()=>{}); }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return {bytes,type:response.headers.get('content-type')||''};
}
function feedUrl(value) {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^\d|\[/.test(u.hostname)||/\.(local|internal|localhost)$/.test(u.hostname))throw Error('Invalid provider configuration');
  return u;
}
export async function vehicleData(env,snapshot) {
  const base={configured:!!env.SCPT_VEHICLES_URL,connected:false,vehicles:[],checkedAt:new Date().toISOString()};
  if(!base.configured)return {...base,status:'unconfigured',message:'Live bus locations are not connected. Use the published timetable or call SCPT.'};
  try {
    const url=feedUrl(env.SCPT_VEHICLES_URL),mapping=JSON.parse(env.SCPT_ROUTE_MAP||'{}');
    const payload=await cached(`vehicles:${url}:${env.SCPT_VEHICLES_TOKEN||''}`,15000,async()=>{
      const {bytes}=await readRemote(url,env.SCPT_VEHICLES_TOKEN?{Authorization:`Bearer ${env.SCPT_VEHICLES_TOKEN}`}:{ });
      return JSON.parse(new TextDecoder().decode(bytes));
    });
    const result=normalizeVehicles(payload,snapshot,mapping);
    const status=result.vehicles.length?'live':result.stale?'stale':result.rejected?'invalid':'empty';
    return {...base,...result,connected:true,status,message:status==='live'?`${result.vehicles.length} buses reporting fresh GPS positions.`:status==='stale'?'Bus positions are older than 90 seconds. Waiting for fresh GPS.':status==='invalid'?'The bus feed returned unusable positions.':'Feed connected; no vehicles are currently reporting.'};
  }catch{return {...base,status:'unavailable',message:'The bus feed is unavailable. Published times are still available.'};}
}
export async function trafficData(env) {
  const base={configured:!!env.TOMTOM_API_KEY,connected:false,incidents:[],checkedAt:new Date().toISOString()};
  if(!base.configured)return {...base,status:'unconfigured',message:'Traffic layers are not connected. Check 511NY for current road conditions.'};
  try {
    const value=await cached(`incidents:${env.TOMTOM_API_KEY}`,60000,async()=>{
      const url=new URL('https://api.tomtom.com/traffic/services/5/incidentDetails');
      url.search=new URLSearchParams({key:env.TOMTOM_API_KEY,bbox:[SERVICE_BOUNDS.west,SERVICE_BOUNDS.south,SERVICE_BOUNDS.east,SERVICE_BOUNDS.north].join(','),
        fields:'{incidents{type,geometry{type,coordinates},properties{id,iconCategory,events{description},from,to,delay,roadNumbers}}}',language:'en-US',timeValidityFilter:'present'});
      const {bytes}=await readRemote(url,{},2000000),data=JSON.parse(new TextDecoder().decode(bytes));
      if(!Array.isArray(data.incidents)||data.incidents.length>1000)throw Error('Invalid traffic data');
      const incidents=[];
      for(const item of data.incidents){
        const g=item.geometry,p=item.properties;
        if(!p||!['Point','LineString'].includes(g?.type))continue;
        const points=g.type==='Point'?[g.coordinates]:g.coordinates;
        if(!Array.isArray(points)||!points.length||points.length>10000||!points.every(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&c[0]>=-180&&c[0]<=180&&c[1]>=-90&&c[1]<=90)||!points.some(c=>inServiceArea(c[1],c[0])))continue;
        const clean=s=>typeof s==='string'?s.slice(0,300):'';
        incidents.push({id:clean(p.id),category:Number(p.iconCategory)||0,points:points.map(c=>[c[1],c[0]]),description:clean(p.events?.[0]?.description)||'Traffic incident',from:clean(p.from),to:clean(p.to),delay:Number.isFinite(p.delay)?Math.max(0,p.delay):null});
      }
      return {incidents,checkedAt:new Date().toISOString()};
    });
    return {...base,...value,connected:true,status:'available',message:`${value.incidents.length} reported incidents in the service region. Coverage varies by road.`};
  }catch{return {...base,status:'unavailable',message:'Traffic data is unavailable. Check 511NY for current conditions.'};}
}
export async function trafficTile(env,z,x,y) {
  if(!env.TOMTOM_API_KEY)return null;
  if(![z,x,y].every(Number.isInteger)||z<8||z>18||x<0||y<0||x>=2**z||y>=2**z)return null;
  const lon=n=>n/2**z*360-180,lat=n=>Math.atan(Math.sinh(Math.PI*(1-2*n/2**z)))*180/Math.PI;
  if(lon(x)>SERVICE_BOUNDS.east||lon(x+1)<SERVICE_BOUNDS.west||lat(y)<SERVICE_BOUNDS.south||lat(y+1)>SERVICE_BOUNDS.north)return null;
  return cached(`tile:${env.TOMTOM_API_KEY}:${z}/${x}/${y}`,60000,async()=>{
    const url=new URL(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png`);url.search=new URLSearchParams({key:env.TOMTOM_API_KEY,tileSize:'256'});
    const data=await readRemote(url,{},300000);
    if(!data.type.startsWith('image/png')||data.bytes[0]!==137||data.bytes[1]!==80)throw Error('Invalid traffic tile');
    return data.bytes;
  });
}
