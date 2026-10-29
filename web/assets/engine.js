// Copyright (c) 2026 Sohaib Khan. MIT License.
export function localNow(date=new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(v=>[v.type,v.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
export function minutes(time){if(!/^\d{2}:\d{2}$/.test(time))return NaN;const [h,m]=time.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;}
export function formatTime(n){const h=Math.floor(n/60),m=Math.floor(n%60);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T12:00:00Z`))&&new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)===date;}
export function activeService(data,service,date){
  if(!validDate(date)) return false;
  const c=data.calendar[service],key=date.replaceAll('-','');if(!c||key<c.start||key>c.end)return false;
  const e=data.exceptions.find(e=>e.service_id===service&&e.date===key);
  return e?e.exception_type==='1':c.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}
export function requestStop(data,call){return /on call/i.test(data.stops[call.stop]?.name||'')||call.pickup>1||call.dropoff>1;}
export function departures(data,stop,date,after=0,route=null){return data.trips.filter(t=>(!route||t.route===route)&&activeService(data,t.service,date)).flatMap(t=>t.calls.filter(c=>c.stop===stop&&c.pickup===0&&!requestStop(data,c)&&c.departure>=after).map(c=>({trip:t,call:c}))).sort((a,b)=>a.call.departure-b.call.departure);}
export function plan(data,from,to,date,time){
  const after=minutes(time);if(from===to||!Object.hasOwn(data.stops,from)||!Object.hasOwn(data.stops,to)||!validDate(date)||!Number.isFinite(after))return [];
  return data.trips.filter(t=>activeService(data,t.service,date)).flatMap(trip=>{
    const results=[];
    trip.calls.forEach((a,i)=>{if(a.stop!==from||a.pickup!==0||requestStop(data,a)||a.departure<after)return;
      const b=trip.calls.slice(i+1).find(b=>b.stop===to&&b.dropoff===0&&!requestStop(data,b)&&b.arrival>a.departure);
      if(b)results.push({trip,from:a,to:b,duration:b.arrival-a.departure});
    });return results;
  }).sort((a,b)=>a.to.arrival-b.to.arrival||a.from.departure-b.from.departure);
}
export function lastDeparture(data,from,to,date){const trips=plan(data,from,to,date,'00:00');return trips.length?trips.reduce((last,t)=>t.from.departure>last.from.departure?t:last):null;}
export function returnsFor(data,outbound,home,away,date,leaveAfter){return plan(data,away,home,date,leaveAfter).filter(t=>t.from.departure>=outbound.to.arrival+10);}
