const $ = (id) => document.getElementById(id);
let watch = null,
  token = "",
  vehicleId = "",
  lastSent = 0,
  sending = false,
  generation = 0,
  upload = null;
const status = (text) => ($("device-status").textContent = text);
function stop() {
  generation++;
  if (watch !== null) navigator.geolocation.clearWatch(watch);
  upload?.abort();
  watch = null;
  token = "";
  $("device-token").value = "";
  $("start-sharing").disabled = false;
  $("stop-sharing").disabled = true;
  status(
    "Location sharing stopped. Remove the dispatch assignment to hide the last report immediately.",
  );
}
$("device").onsubmit = (event) => {
  event.preventDefault();
  if (!window.isSecureContext || !navigator.geolocation) {
    status("HTTPS and browser geolocation support are required.");
    return;
  }
  token = $("device-token").value;
  vehicleId = $("device-id").value;
  $("device-token").value = "";
  const session = ++generation;
  lastSent = 0;
  $("start-sharing").disabled = true;
  $("stop-sharing").disabled = false;
  status("Waiting for location permission and a GPS fix…");
  watch = navigator.geolocation.watchPosition(
    async (position) => {
      if (session !== generation || sending || Date.now() - lastSent < 10000)
        return;
      sending = true;
      lastSent = Date.now();
      upload = new AbortController();
      const timer = setTimeout(() => upload?.abort(), 8000);
      try {
        const response = await fetch("/api/gps", {
          method: "POST",
          cache: "no-store",
          signal: upload.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicleId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            measuredAt: new Date(position.timestamp).toISOString(),
          }),
        });
        const result = await response.json();
        if (session !== generation) return;
        if (!response.ok) {
          if (response.status === 401) stop();
          throw Error(result.error || "Upload failed");
        }
        status(
          `GPS accepted at ${new Date().toLocaleTimeString()} · accuracy ±${Math.round(position.coords.accuracy)} m. Dispatch must assign this vehicle before it appears on the map.`,
        );
      } catch (error) {
        if (session === generation) status(error.message);
      } finally {
        clearTimeout(timer);
        sending = false;
      }
    },
    (error) => {
      if (session !== generation) return;
      stop();
      status(`Location unavailable: ${error.message}`);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
};
$("stop-sharing").onclick = stop;
window.addEventListener("pagehide", stop);
