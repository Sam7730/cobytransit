import {routeCancelled} from './alerts.js';
// Copyright (c) 2026 Sohaib Khan. MIT License.
export function localNow(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((v) => [v.type, v.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function minutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [h, m] = time.split(":").map(Number);
  return h < 24 && m < 60 ? h * 60 + m : NaN;
}
export function formatTime(n) {
  const day = Math.floor(n / 1440),
    h = Math.floor(n / 60) % 24,
    m = Math.floor(n % 60);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}${day > 0 ? ` (+${day} day${day > 1 ? "s" : ""})` : ""}`;
}
export function validDate(date) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) &&
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date
  );
}
export function activeService(data, service, date) {
  if (!validDate(date)) return false;
  const c = data.calendar[service],
    key = date.replaceAll("-", "");
  if (!c) return false;
  const e = data.exceptions.find(
    (e) => e.service_id === service && e.date === key,
  );
  return e
    ? e.exception_type === "1"
    : key >= c.start && key <= c.end && c.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}
// Agency semester dates can narrow a GTFS calendar, never extend its coverage.
export function activeTrip(data, trip, date) {
  if (!activeService(data, trip.service, date)||routeCancelled(data,trip.route,date)) return false;
  const restriction = data.meta?.routeServiceDates?.[trip.route];
  return (
    !restriction ||
    date < restriction.start ||
    date > restriction.end ||
    restriction.dates.includes(date)
  );
}
export function requestStop(data, call) {
  return (
    call.unconfirmed===true || /on call/i.test(data.stops[call.stop]?.name || "") ||
    call.pickup > 1 ||
    call.dropoff > 1
  );
}
export function shiftDate(date, days) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
// Calls are offsets from the requested civil date; trip retains its service date.
// This also includes yesterday's GTFS 24:xx calls after midnight today.
function instances(data, date, nextDay = false) {
  return [-1, 0, ...(nextDay ? [1] : [])].flatMap(offset => {
    const serviceDate = shiftDate(date, offset);
    return data.trips.filter(t => activeTrip(data, t, serviceDate)).map(trip => ({
      trip, serviceDate,
      calls: trip.calls.map(c => ({ ...c,
        arrival: c.arrival + offset * 1440, departure: c.departure + offset * 1440 })),
    }));
  });
}
export function departures(data, stop, date, after = 0, route = null) {
  if (!validDate(date) || !Object.hasOwn(data.stops, stop) || !Number.isFinite(after)) return [];
  return instances(data, date).filter(t => !route || t.trip.route === route)
    .flatMap(({trip, serviceDate, calls}) => calls.filter(c => c.stop === stop &&
      c.pickup === 0 && !requestStop(data, c) && c.departure >= after && c.departure < 1440)
      .map(call => ({trip, serviceDate, call})))
    .sort((a,b) => a.call.departure - b.call.departure);
}
function directOptions(data, runs, from, to, after, before = 1440) {
  return runs.flatMap(({trip, serviceDate, calls}) => calls.flatMap((a,i) => {
    if (a.stop !== from || a.pickup !== 0 || requestStop(data,a) ||
        a.departure < after || a.departure >= before) return [];
    const b = calls.slice(i+1).find(b => b.stop === to && b.dropoff === 0 &&
      !requestStop(data,b) && b.arrival > a.departure);
    return b ? [{trip, serviceDate, from:a, to:b, duration:b.arrival-a.departure}] : [];
  })).sort((a,b) => a.to.arrival-b.to.arrival || a.from.departure-b.from.departure);
}
export function plan(data, from, to, date, time) {
  const after = minutes(time);
  if (from === to || !Object.hasOwn(data.stops,from) || !Object.hasOwn(data.stops,to) ||
      !validDate(date) || !Number.isFinite(after)) return [];
  return directOptions(data, instances(data,date), from, to, after);
}
export function lastDeparture(data, from, to, date) {
  const trips = plan(data, from, to, date, "00:00");
  return trips.length
    ? trips.reduce((last, t) =>
        t.from.departure > last.from.departure ? t : last,
      )
    : null;
}
export function returnsFor(data, outbound, home, away, date, leaveAfter) {
  return plan(data, away, home, date, leaveAfter).filter(
    (t) => t.from.departure >= outbound.to.arrival + 10,
  );
}

// Every feed record gets a useful, honest service state, even without timed trips.
export function stopService(data, id) {
  const calls = data.trips.flatMap(trip => trip.calls
    .filter(call => call.stop === id).map(call => ({ trip, call })));
  const standard = calls.some(({call}) => call.pickup === 0 && !requestStop(data, call));
  const arranged = calls.some(({call}) => requestStop(data, call));
  return { calls, routes: [...new Set(calls.map(x => x.trip.route))],
    status: standard ? "Scheduled service" : arranged ? "Call to arrange" : calls.length ? "Drop-off only" : "Confirm service",
    standard, arranged };
}
export function nextStopDepartures(data, id, date, after = 0) {
  if (!validDate(date)) return { date, items: [] };
  for (let offset = 0; offset < 15; offset++) {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + offset);
    const key = day.toISOString().slice(0, 10);
    const items = departures(data, id, key, offset ? 0 : after);
    if (items.length) return { date: key, items };
  }
  return { date, items: [] };
}
// One transfer at the exact same agency stop. No inferred walking connections.
export function transferPlans(data, from, to, date, time) {
  if (from === to || !data.stops[from] || !data.stops[to] || !validDate(date) || !Number.isFinite(minutes(time))) return [];
  const results = [];
  const active = instances(data, date, true);
  for (const {trip, serviceDate, calls} of active) {
    for (let i=0; i<calls.length; i++) {
      const origin = calls[i];
      if (origin.stop !== from || origin.pickup !== 0 || requestStop(data, origin) || origin.departure < minutes(time) || origin.departure >= 1440) continue;
      for (const arrival of calls.slice(i+1)) {
        if (arrival.stop === from || arrival.stop === to || arrival.dropoff !== 0 || requestStop(data, arrival) || arrival.arrival <= origin.departure) continue;
        for (const second of directOptions(data, active, arrival.stop, to, arrival.arrival + 10, arrival.arrival + 90 + 1)) {
          const wait = second.from.departure - arrival.arrival;
          if (second.trip.route === trip.route || wait < 10 || wait > 90) continue;
          results.push({ first: {trip, serviceDate, from: origin, to: arrival}, second, transfer: arrival.stop, wait,
            duration: second.to.arrival - origin.departure });
        }
      }
    }
  }
  const unique = new Map();
  for (const r of results.sort((a,b)=>a.second.to.arrival-b.second.to.arrival || a.duration-b.duration || a.wait-b.wait)) {
    const key = [r.first.trip.id,r.first.serviceDate,r.first.from.seq,r.second.trip.id,r.second.serviceDate].join('|');
    if (!unique.has(key)) unique.set(key,r);
  }
  return [...unique.values()].slice(0,6);
}
// If there is no direct trip, surface real transfer options without a hidden toggle.
export function journeyOptions(data, from, to, date, time, includeTransfers = false) {
  const direct = plan(data, from, to, date, time);
  const transfers = includeTransfers || !direct.length ? transferPlans(data, from, to, date, time) : [];
  return { direct, transfers };
}
export function nextJourney(data, from, to, date, includeTransfers = false) {
  if (!validDate(date)) return null;
  for (let offset = 1; offset <= 14; offset++) {
    const nextDate = shiftDate(date, offset);
    const options = journeyOptions(data, from, to, nextDate, "00:00", includeTransfers);
    if (options.direct.length || options.transfers.length) return {date:nextDate, ...options};
  }
  return null;
}

export const tripRuns=activeTrip;
export function upcomingDepartures(data,stop,now=new Date(),limit=3){
  const local=localNow(now),result=[];
  if(!Object.hasOwn(data.stops,stop))return result;
  for(let day=0;day<7&&result.length<limit;day++){
    const date=new Date(local.date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);
    const key=date.toISOString().slice(0,10);
    for(const item of departures(data,stop,key,day===0?minutes(local.time):0)){
      result.push({...item,date:key,dayOffset:day});if(result.length>=limit)break;
    }
  }
  return result;
}
