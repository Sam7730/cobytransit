// Shared validation for public notices and authenticated staff updates.
export const ALERT_ROUTES=['1','2','2A','3','5','20','20W','22','23','campus'];
export function validateAlerts(value){
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 if(!Array.isArray(value)||value.length>50)throw Error('Use at most 50 notices.');
 const ids=new Set();
 return value.map(a=>{
  if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(a.id)||ids.has(a.id))throw Error('Invalid or duplicate notice ID.');ids.add(a.id);
  if(!['info','detour','cancellation'].includes(a.type)||typeof a.title!=='string'||!a.title.trim()||a.title.length>120||typeof a.body!=='string'||!a.body.trim()||a.body.length>1200)throw Error('Add a valid type, title and explanation.');
  if(!Array.isArray(a.routes)||!a.routes.length||a.routes.length>ALERT_ROUTES.length||new Set(a.routes).size!==a.routes.length||!a.routes.every(r=>ALERT_ROUTES.includes(r)))throw Error('Choose the affected routes.');
  if(!date(a.startDate)||!date(a.endDate)||a.startDate>a.endDate)throw Error('Choose valid start and end dates.');
  return {id:a.id,type:a.type,title:a.title.trim(),body:a.body.trim(),routes:[...a.routes],startDate:a.startDate,endDate:a.endDate};
 });
}
export function alertsFor(alerts,route,date){return (alerts||[]).filter(a=>(!route||a.routes.includes(route))&&a.startDate<=date&&date<=a.endDate);}
export function routeCancelled(data,route,date){return alertsFor(data.alerts,route,date).some(a=>a.type==='cancellation');}
