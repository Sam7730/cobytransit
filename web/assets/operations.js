const $ = (id) => document.getElementById(id);
let token = "",
  state = null;
const message = (text) => ($("staff-status").textContent = text);
async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Request failed");
  return result;
}
function current() {
  $("current-assignment").textContent =
    `Currently assigned: ${state?.routes[$("route").value] || "No vehicle"}`;
}
async function refresh() {
  const usedToken = token;
  const result = await api("/api/operations");
  if (!token || token !== usedToken) return;
  state = result;
  $("dispatch").hidden = false;
  $("unlock").hidden = true;
  const route = $("route").value,
    vehicle = $("vehicle").value;
  $("route").replaceChildren(
    ...state.routeIds.map((id) => new Option(`Route ${id}`, id)),
  );
  $("vehicle").replaceChildren(
    new Option("No vehicle — remove assignment", ""),
    ...state.devices.map((d) => new Option(d.vehicleId, d.vehicleId)),
  );
  if (state.routeIds.includes(route)) $("route").value = route;
  if (state.devices.some((d) => d.vehicleId === vehicle))
    $("vehicle").value = vehicle;
  $("fleet").replaceChildren();
  for (const device of state.devices) {
    const row = document.createElement("tr");
    for (const text of [
      device.vehicleId,
      device.position
        ? `${device.position.state} · ${device.position.ageSeconds}s ago`
        : "No recent report",
      device.position
        ? new Date(device.position.measuredAt).toLocaleString()
        : "—",
    ]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    $("fleet").append(row);
  }
  current();
  message(`Fleet refreshed at ${new Date().toLocaleTimeString()}.`);
}
$("unlock").onsubmit = async (event) => {
  event.preventDefault();
  token = $("dispatch-token").value;
  $("dispatch-token").value = "";
  try {
    await refresh();
  } catch (error) {
    token = "";
    message(error.message);
  }
};
$("lock").onclick = () => {
  token = "";
  state = null;
  $("fleet").replaceChildren();
  $("dispatch").hidden = true;
  $("unlock").hidden = false;
  message("Dispatch locked.");
};
$("refresh").onclick = () => refresh().catch((error) => message(error.message));
$("route").onchange = current;
$("assignment").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await api("/api/assignments", {
      routeId: $("route").value,
      vehicleId: $("vehicle").value || null,
      expectedRevision: state.revision,
    });
    await refresh();
    message("Assignment saved. Passenger maps refresh within 15 seconds.");
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
};
window.addEventListener("pagehide", () => {
  token = "";
});

const poll = setInterval(() => {
  if (token && !document.hidden)
    refresh().catch((error) => message(error.message));
}, 15000);
window.addEventListener("pagehide", () => clearInterval(poll));
