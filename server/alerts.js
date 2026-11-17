import {validateAlerts} from '../web/assets/alerts.js';
const ALERTS_KEY='cobytransit/v1/alerts.json';
// Hash both inputs before comparison; neither tokens nor authorization headers are logged.
async function staffAuthorized(request,env){
 const supplied=request.headers.get('Authorization')||'';
 if(supplied.length>1024)return false;
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(supplied),digest('Bearer '+env.ADMIN_TOKEN)]);let mismatch=0;
 for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;
}
export async function alertsEndpoint(request,env,reply,readBody){
 const url=new URL(request.url),admin=url.pathname==='/api/admin/alerts';
 if(!env.BUCKET||typeof env.ADMIN_TOKEN!=='string'||env.ADMIN_TOKEN.length<32)return reply({configured:false,alerts:[],error:'Staff notices are not configured. Check RideSCPT for service changes.'},503);
 if(!['GET','HEAD',...(admin?['PUT']:[])].includes(request.method))return reply({error:'Method not allowed'},405);
 if(admin){
  if(!await staffAuthorized(request,env))return reply({error:'Staff access denied'},401);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return reply({error:'Origin rejected'},403);
 }
 const stored=await env.BUCKET.get(ALERTS_KEY),alerts=stored?validateAlerts((await stored.json()).alerts):[],revision=stored?.etag||null;
 if(request.method!=='PUT')return reply({configured:true,alerts, ...(admin?{revision}:{})});
 if((request.headers.get('Content-Type')||'').split(';')[0]!=='application/json')return reply({error:'Expected application/json'},415);
 let payload;try{payload=JSON.parse(new TextDecoder().decode(await readBody(request.body,100000)));}catch{return reply({error:'Invalid or oversized JSON'},400);}
 if(payload?.revision!==revision)return reply({error:'Notices changed. Reload before editing.'},409);
 let next;try{next=validateAlerts(payload.alerts);}catch(e){return reply({error:e.message},422);}
 // R2 conditional writes make the revision check atomic across concurrent staff sessions.
 const result=await env.BUCKET.put(ALERTS_KEY,JSON.stringify({alerts:next,updatedAt:new Date().toISOString()}),{onlyIf:revision?{etagMatches:revision}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
 if(!result)return reply({error:'Notices changed. Reload before editing.'},409);
 return reply({configured:true,alerts:next,revision:result.etag});
}
