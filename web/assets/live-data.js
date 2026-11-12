// Shared by the browser and Worker. Never substitute a feed-generation timestamp
// for the time at which an individual GPS measurement was taken.
export const VEHICLE_MAX_AGE = 90;
export const SERVICE_BOUNDS = {south:42.25, west:-74.85, north:42.95, east:-73.65};
export function inServiceArea(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= SERVICE_BOUNDS.south && lat <= SERVICE_BOUNDS.north && lon >= SERVICE_BOUNDS.west && lon <= SERVICE_BOUNDS.east;
}
export function freshVehicle(vehicle, now = Date.now()) {
  const age = now / 1000 - vehicle.timestamp;
  return Number.isFinite(vehicle.timestamp) && age >= -15 && age <= VEHICLE_MAX_AGE;
}
export function normalizeVehicles(payload, snapshot, routeMap = {}, now = Date.now()) {
  const gtfs = Array.isArray(payload.entity);
  const rows = gtfs ? payload.entity : payload.vehicles;
  if (!Array.isArray(rows) || rows.length > 500) throw Error('Invalid vehicle feed');
  // Differential feeds require persistent entity state and are not supported.
  if (gtfs && ![undefined, 0, 'FULL_DATASET'].includes(payload.header?.incrementality)) throw Error('Differential feed unsupported');
  const supported = new Set(['1','2','2A','3','5','20','20W','22','23']);
  const seen = new Set(), vehicles = [];
  let rejected = 0, stale = 0;
  for (const row of rows) {
    if (gtfs && (!row.vehicle || row.isDeleted || row.is_deleted)) continue;
    const v = gtfs ? row.vehicle : row;
    const id = gtfs ? v.vehicle?.id || row.id : v.id;
    const tripId = gtfs ? v.trip?.tripId || v.trip?.trip_id : v.tripId;
    const rawRoute = gtfs ? v.trip?.routeId || v.trip?.route_id : v.routeId;
    const routeId = Object.hasOwn(routeMap, rawRoute) ? routeMap[rawRoute] : rawRoute || snapshot.trips.find(t => t.id === tripId)?.route;
    const position = gtfs ? v.position : v;
    const lat = gtfs ? position?.latitude : position?.lat, lon = gtfs ? position?.longitude : position?.lon;
    const timestamp = typeof v.timestamp === 'string' && /^\d+$/.test(v.timestamp) ? Number(v.timestamp) : v.timestamp;
    if (typeof id !== 'string' || !id.length || id.length > 100 || seen.has(id) || !supported.has(routeId) || !inServiceArea(lat,lon) || !Number.isFinite(timestamp)) { rejected++; continue; }
    if (!freshVehicle({timestamp},now)) { stale++; continue; }
    seen.add(id);
    const label = gtfs ? v.vehicle?.label : v.label;
    vehicles.push({id,routeId,lat,lon,timestamp,label:typeof label === 'string' ? label.slice(0,80) : id,
      bearing:Number.isFinite(position.bearing) && position.bearing >= 0 && position.bearing < 360 ? position.bearing : null});
  }
  return {vehicles,rejected,stale};
}
