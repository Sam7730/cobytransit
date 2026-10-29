import {validateSnapshot,FEED_URL} from '../web/assets/validation.js';
export const SECURITY_HEADERS={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' https://chatgpt.com; worker-src 'self'; manifest-src 'self'",
 'X-CobyTransit-App':'1','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Strict-Transport-Security':'max-age=31536000','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store','X-XSS-Protection':'0'
};
const MAX_BODY=1500000,STATE_KEY='cobytransit/v1/snapshot.json';
function response(body,status=200,type='application/json; charset=utf-8',extra={}){return new Response(body,{status,headers:{...SECURITY_HEADERS,'Content-Type':type,...extra}});}
function json(value,status=200){return response(JSON.stringify(value),status);}
async function boundedBody(body,max){if(!body)throw Error('Missing body');const reader=body.getReader(),parts=[];let len=0;try{for(;;){const {done,value}=await reader.read();if(done)break;len+=value.byteLength;if(len>max)throw Error('Body too large');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}const all=new Uint8Array(len);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}return all;}
async function snapshot(env,assets){const persisted=env.BUCKET?await env.BUCKET.get(STATE_KEY):null;if(persisted){const d=await persisted.json();validateSnapshot(d);return d;}return JSON.parse(assets['/assets/transit.json'].body);}
export default {async fetch(request,env={}){
 const url=new URL(request.url),assets=env.LOCAL_ASSET_CONTENTS||ASSETS;let stage='route';
 try{
  if(request.method==='OPTIONS')return response(null,405,'text/plain; charset=utf-8',{'Allow':'GET, HEAD, POST'});
  if(url.pathname==='/api/snapshot'){
   if(request.method==='GET'||request.method==='HEAD'){const d=await snapshot(env,assets);return response(request.method==='HEAD'?null:JSON.stringify(d));}
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   // The hosting platform must enforce owner-only access before forwarding this
   // route. Opt-in is configured only after get_site confirms that boundary.
   // Forks and other hosts fail closed unless they deliberately enable updates.
   if(env.UPDATES_ENABLED!=='owner-private')return json({error:'Updates are not configured'},503);
   const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Origin rejected'},403);
   if((request.headers.get('Content-Type')||'').split(';')[0]!=='application/json')return json({error:'Expected application/json'},415);
   if(Number(request.headers.get('Content-Length')||0)>MAX_BODY)return json({error:'Payload too large'},413);
   if(!env.BUCKET)return json({error:'Persistent storage unavailable'},503);
   stage='read-update';let payload;try{payload=JSON.parse(new TextDecoder().decode(await boundedBody(request.body,MAX_BODY)));}catch{return json({error:'Invalid or oversized JSON'},400);}
   stage='validate-update';let summary;try{summary=validateSnapshot(payload.snapshot);}catch{return json({error:'Snapshot validation failed'},422);}
   const checkedAt=payload.review?.checkedAt;if(typeof checkedAt!=='string'||!Number.isFinite(Date.parse(checkedAt))||Math.abs(Date.now()-Date.parse(checkedAt))>86400000||!['current','needs-review'].includes(payload.review?.status)||!Array.isArray(payload.review?.notes)||payload.review.notes.length>12||!payload.review.notes.every(s=>typeof s==='string'&&s.length<=800))return json({error:'Invalid review record'},422);
   stage='read-current';const current=await snapshot(env,assets);if(payload.expectedSha256!==current.meta.sha256)return json({error:'Snapshot changed; reload and review again'},409);
   const d=payload.snapshot;
   // Verify the claimed archive digest at the fixed upstream origin; never fetch user URLs.
   stage='fetch-upstream';const upstream=await fetch(FEED_URL,{redirect:'manual',signal:AbortSignal.timeout(20000)});if(upstream.status>=300&&upstream.status<400)return json({error:'Upstream redirect rejected; existing snapshot retained'},502);if(!upstream.ok)return json({error:'Upstream unavailable; existing snapshot retained'},502);
   stage='read-upstream';const raw=await boundedBody(upstream.body,5000000),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!==d.meta.sha256)return json({error:'Upstream digest differs; existing snapshot retained'},409);
   if(payload.review.notices!==undefined)d.meta.notices=payload.review.notices;else if(current.meta.notices)d.meta.notices=current.meta.notices;try{validateSnapshot(d);}catch{return json({error:'Invalid reviewed notices'},422);}
   d.meta.checkedAt=checkedAt;d.meta.reviewStatus=payload.review.status;d.meta.reviewNotes=payload.review.notes;
   if(d.meta.retrieved>checkedAt.slice(0,10))return json({error:'Future retrieval date'},422);
   stage='persist-snapshot';await env.BUCKET.put(STATE_KEY,JSON.stringify(d),{httpMetadata:{contentType:'application/json'}});
   return json({ok:true,...summary,checkedAt});
  }
  if(url.pathname==='/api/status'){
   if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
   const d=await snapshot(env,assets);return json({release:'1.1.0',snapshot:d.meta,liveTracking:{connected:false,reason:'No authorized live feed has been configured.'},persistentUpdates:!!env.BUCKET&&env.UPDATES_ENABLED==='owner-private'});
  }
  if(!['GET','HEAD'].includes(request.method))return response('Method not allowed',405,'text/plain; charset=utf-8',{'Allow':'GET, HEAD'});
  const pathname=url.pathname==='/'?'/index.html':url.pathname;
  if(!Object.hasOwn(assets,pathname))return response('Not found',404,'text/plain; charset=utf-8');
  const asset=assets[pathname],body=asset.base64?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
  const extra=pathname==='/service-worker.js'?{'Service-Worker-Allowed':'/','Cache-Control':'no-cache'}:{};
  if(pathname.endsWith('.zip'))extra['Content-Disposition']='attachment; filename="cobytransit-source.zip"';
  return response(request.method==='HEAD'?null:body,200,asset.type,extra);
 }catch(error){console.error('CobyTransit request failure',stage,error?.name,String(error?.message||'').slice(0,200));return json({error:'Service unavailable; consult ridescpt.com or call 518-234-0952'},503);}
}};
