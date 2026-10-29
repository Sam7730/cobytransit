// Explicit opt-in only. Cache public transit information; never credentials or write APIs.
const CACHE='cobytransit-offline-v1.1.0',PREFIX='cobytransit-offline-';
const FILES=['/','/index.html','/assets/style.css','/assets/app.js','/assets/engine.js','/assets/map.js','/assets/catalog.js','/assets/validation.js','/assets/favicon.svg','/manifest.webmanifest','/api/snapshot','/assets/transit.json'];
const paths=new Set(FILES);
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
async function appResponse(response){return response.ok&&response.headers.get('X-CobyTransit-App')==='1'&&!response.redirected;}
self.addEventListener('message',event=>{
 const port=event.ports?.[0];
 if(event.data?.type==='SAVE_OFFLINE')event.waitUntil((async()=>{try{const staged=[];for(const file of FILES){const response=await fetch(file,{cache:'no-store',credentials:'same-origin'});if(!await appResponse(response))throw Error('Could not save all app files');staged.push([file,response]);}const cache=await caches.open(CACHE);for(const [file,response]of staged)await cache.put(file,response);port?.postMessage({ok:true});}catch{port?.postMessage({ok:false,message:'Offline download did not finish. Stay online and try again.'});}})());
 if(event.data?.type==='CLEAR_OFFLINE')event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX))await caches.delete(key);port?.postMessage({ok:true});})());
});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!paths.has(u.pathname))return;
 event.respondWith((async()=>{try{const response=await fetch(event.request,{signal:AbortSignal.timeout(5000)});if(await appResponse(response)){const keys=await caches.keys();if(keys.includes(CACHE)){const cache=await caches.open(CACHE);await cache.put(u.pathname,response.clone());}}return response;}catch{const cache=await caches.open(CACHE),saved=await cache.match(u.pathname);if(!saved)return new Response('Offline schedule not saved. Reconnect to load CobyTransit.',{status:503,headers:{'Content-Type':'text/plain'}});const headers=new Headers(saved.headers);headers.set('X-CobyTransit-Offline','1');return new Response(await saved.arrayBuffer(),{status:saved.status,headers});}})());
});
