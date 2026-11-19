import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createNodeServer } from '../server/node.js';
import { FileStore } from '../server/file-store.js';
import { loadAssets } from '../scripts/assets.mjs';

// Synthetic measurements go only to this loopback server and temporary store.
const assets = await loadAssets();
const directory = await mkdtemp(join(tmpdir(), 'coby-gps-browser-'));
const vehicleId = 'test-bus';
const deviceToken = randomBytes(32).toString('hex');
const dispatchToken = randomBytes(32).toString('hex');
const initialPosition = { latitude: 42.679, longitude: -74.49, accuracy: 12 };
const movedPosition = { latitude: 42.682, longitude: -74.483, accuracy: 9 };
const server = createNodeServer({
  LOCAL_ASSET_CONTENTS: assets,
  BUCKET: new FileStore(directory),
  GPS_DEVICES_JSON: JSON.stringify({ [vehicleId]: deviceToken }),
  DISPATCH_TOKEN: dispatchToken,
});
let browser;
try {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
    args: ['--no-sandbox'],
  });

  const driverContext = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: initialPosition,
  });
  const driver = await driverContext.newPage();
  const dispatch = await browser.newPage();
  const rider = await browser.newPage({ reducedMotion: 'reduce' });
  const pageErrors = [];
  for (const page of [driver, dispatch, rider]) {
    page.on('pageerror', error => pageErrors.push(error.message));
  }
  await rider.route('https://tile.openstreetmap.org/**', route => route.abort());

  async function sendFromDriver(token) {
    await driver.locator('#device-id').fill(vehicleId);
    await driver.locator('#device-token').fill(token);
    const upload = driver.waitForResponse(response => new URL(response.url()).pathname === '/api/gps');
    await driver.locator('#start-sharing').click();
    return upload;
  }

  await driver.goto(origin + '/driver.html');
  assert.equal((await sendFromDriver(randomBytes(32).toString('hex'))).status(), 401);
  await driver.getByText('Device authorization failed.', { exact: false }).waitFor();
  assert.equal((await sendFromDriver(deviceToken)).status(), 202);
  await driver.getByText('GPS accepted at', { exact: false }).waitFor();
  assert.equal(await driver.locator('#device-token').inputValue(), '');
  const firstReportAt = Date.now();
  const readVehicles = async () => (await (await rider.request.get(origin + '/api/vehicles')).json()).vehicles;
  assert.deepEqual(await readVehicles(), []);

  await dispatch.goto(origin + '/operations.html');
  await dispatch.locator('#dispatch-token').fill(dispatchToken);
  await dispatch.locator('#unlock button').click();
  await dispatch.locator('#dispatch:not([hidden])').waitFor();
  await dispatch.locator('#route').selectOption('2');
  async function assign(vehicle) {
    await dispatch.locator('#vehicle').selectOption(vehicle);
    const saved = dispatch.waitForResponse(response => new URL(response.url()).pathname === '/api/assignments');
    await dispatch.locator('#assignment button[type=submit]').click();
    assert.equal((await saved).status(), 200);
    await dispatch.getByText('Assignment saved.', { exact: false }).waitFor();
  }
  await assign(vehicleId);

  await rider.goto(origin + '/');
  const marker = rider.locator('.live-bus-marker');
  await marker.waitFor();
  assert.match(await marker.getAttribute('title'), /test-bus.*route 2/i);
  const markerTransform = await marker.evaluate(element => element.style.transform);
  const [first] = await readVehicles();
  assert.equal(first.lat, initialPosition.latitude);
  assert.equal(first.lon, initialPosition.longitude);

  // Restart the foreground watch after changing the emulated location. Chromium
  // does not reliably notify an existing watch when its test override changes.
  await driver.locator('#stop-sharing').click();
  await new Promise(resolve => setTimeout(resolve, Math.max(0, firstReportAt + 5100 - Date.now())));
  await driverContext.setGeolocation(movedPosition);
  assert.equal((await sendFromDriver(deviceToken)).status(), 202);
  const [moved] = await readVehicles();
  assert.equal(moved.lat, movedPosition.latitude);
  assert.equal(moved.lon, movedPosition.longitude);
  assert.ok(moved.timestamp > first.timestamp);

  await rider.locator('.map-layers summary').click();
  async function refreshRider() {
    await rider.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    const refreshed = rider.waitForResponse(response => new URL(response.url()).pathname === '/api/vehicles');
    await rider.locator('#live-refresh').click();
    assert.ok((await refreshed).ok());
    await rider.waitForFunction(() => !document.getElementById('live-refresh').disabled);
  }
  await refreshRider();
  await marker.waitFor();
  assert.notEqual(await marker.evaluate(element => element.style.transform), markerTransform);

  await driver.locator('#stop-sharing').click();
  await driver.getByText('Location sharing stopped.', { exact: false }).waitFor();
  await rider.clock.setFixedTime(new Date(moved.timestamp * 1000 + 95000));
  await refreshRider();
  await marker.waitFor({ state: 'detached' });

  await rider.clock.setFixedTime(new Date());
  await refreshRider();
  await marker.waitFor();
  await assign('');
  await refreshRider();
  await marker.waitFor({ state: 'detached' });
  assert.deepEqual(await readVehicles(), []);
  assert.deepEqual(pageErrors, []);
  console.log('PASS: isolated device authorization, two GPS fixes, dispatch assignment, map movement, expiration and unassignment.');
} finally {
  await browser?.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
