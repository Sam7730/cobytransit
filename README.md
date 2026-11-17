# CobyTransit

CobyTransit is an independent transit website for **Cobleskill and Schoharie County, New York**. Its purpose is to help residents, students and visitors find a bus route, understand where it stops, check scheduled times and plan a trip home.

The project brings information from [Schoharie County Public Transit (SCPT)](https://ridescpt.com/index.php/routes) into a searchable, mobile-friendly map. It also links to the separate SUNY Cobleskill campus shuttle.

**This is a community project, not an official SCPT or SUNY service.** Some agency sources disagree. The app identifies known conflicts; confirm uncertain trips with SCPT at **518-234-0952**. Live bus tracking is supported by the code but needs an authorized GPS feed before real buses can appear.

## What the website does

- Shows county geography, published bus routes, stops and reservation areas on a real street map.
- Lets riders search by route, town or stop and view each run's stop order and timetable.
- Finds direct trips and same-day return options using the published service calendar.
- Shows upcoming **scheduled** departures, saved stops and shareable route/stop links.
- Provides reservation details, fares, source notices and optional offline schedules.
- Can display live GPS positions and traffic when the required providers are connected.

The trip planner does not calculate transfers, walking directions or live arrival predictions. Reservation areas do not guarantee pickup at every address. Some route lines are incomplete and are marked accordingly.

The current reviewed schedule covers dates through **December 31, 2026**. See the [route audit](ROUTE_AUDIT.md) for the November 16 review of all 23 fixed-route runs and 469 published timetable entries.

## What you need to install

For normal local use, install these tools:

| Tool | Why you need it |
| --- | --- |
| [Node.js](https://nodejs.org/en/download) | Runs the development server, tests and build. Use a current LTS release; the app requires Node 20 or newer. |
| npm | Runs the commands below. It comes with the standard Node.js installation. |
| [Git](https://git-scm.com/downloads) | Downloads the repository and gets updates. Optional if you use GitHub's Download ZIP instead. |
| A modern web browser | Opens the website. |
| [VS Code](https://code.visualstudio.com/) | Optional editor for changing the project. |

After installing Node.js and Git, reopen your terminal and check:

```sh
node --version
npm --version
git --version
```

**You do not need `npm install` to run, build or run the normal tests.** There are no required npm dependencies in `package.json`. There is no `requirements.txt` to install for ordinary use.

### Libraries and technologies

| Technology | How this project uses it | Download required? |
| --- | --- | --- |
| HTML and CSS | Page structure, colors, layout and mobile styling | No |
| Plain JavaScript modules | Search, trip planning, map controls and server logic | No React, Vue or Vite installation needed |
| Leaflet 1.9.4 | Interactive map | Already included in `web/assets/vendor/`, with its license |
| OpenStreetMap | Street map tiles | No package; tiles load over the internet |
| Node.js built-in modules | Local server, testing and packaging | Included with Node.js |
| Python 3.9+ | Optional transit-data import scripts | Only needed when updating source data |
| Playwright | Optional automated browser checks | Installation commands below |
| Wrangler | Optional Cloudflare deployment tool | Installation commands below |

## Run it on your computer

Open a terminal. In VS Code, use **Terminal → New Terminal**.

```sh
git clone https://github.com/Sam7730/cobytransit.git
cd cobytransit
npm run build
npm run dev
```

Open **http://localhost:4173** in your browser. Keep the terminal running while using the site. Press **Ctrl+C** to stop the server.

The first build prepares the downloadable source archive and packaged files. After editing browser files, refresh the page to see changes. Restart the server after changing server code; rebuild before publishing.

If you prefer downloading a ZIP, use **Code → Download ZIP** on GitHub, extract it, and open the extracted folder in VS Code. Run `npm run build` and `npm run dev` from the folder containing `package.json`. A ZIP copy cannot use `git pull`.

Do not double-click `web/index.html` or use VS Code Live Server as a replacement for `npm run dev`: the application also has server endpoints.

### Get later updates

Stop the server, save or commit your own edits, and run these commands inside your cloned repository:

```sh
git pull
npm run build
npm run dev
```

`git pull` updates your **current branch**. Changes in an unmerged pull request are not on `main`. To try that work, fetch and switch to the branch named in the pull request before building.

## Run it through GitHub Codespaces

GitHub stores the code; pushing commits does not automatically publish a running website. Codespaces lets you run a development copy in your browser:

1. Open the repository and select the branch you want to use.
2. Choose **Code → Codespaces → Create codespace**. Availability depends on your GitHub account.
3. In its terminal, run `npm run build`, then `npm run dev`.
4. Open the **Ports** tab. If port **4173** is missing, choose **Add port** and enter `4173`.
5. Use **Open in Browser** for that port. Keep the port private for personal testing.

A Codespace is a development environment, not permanent production hosting. See GitHub's [port-forwarding guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace).

## Useful commands

Run these from the project folder containing `package.json`:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the local website on port 4173 |
| `npm test` | Runs the automated Node.js tests; no browser installation needed |
| `npm run check:data` | Checks the included schedule's structure and references; does not download new data |
| `npm run build` | Packages the source, builds the Worker and checks the generated artifact; does not deploy |

A normal check before committing changes is:

```sh
npm test
npm run check:data
npm run build
```

GitHub Actions also runs validation on pushes and pull requests. Its separate scheduled feed check reports updates or failures for review; it does not automatically approve schedules or deploy the site.

## Publish a website with its server features

The existing build targets **Cloudflare Workers**. It includes the pages and API in one generated file. GitHub Pages only serves static files: it cannot run this project's live GPS, traffic or maintenance endpoints. This repository is not a ready-made GitHub Pages deployment; project subpaths and offline behavior would also need adaptation.

For your own Cloudflare deployment, create a Cloudflare account and install its optional CLI in the project:

```sh
npm install --save-dev wrangler
```

Create a file named **`wrangler.jsonc`** beside `package.json` with the following example. Choose a Worker name for your own account:

```json
{
  "name": "cobytransit",
  "main": "worker/index.js",
  "compatibility_date": "2026-11-16",
  "workers_dev": true,
  "no_bundle": true
}
```

Build and check the deployment package without publishing:

```sh
npm run build
npx wrangler deploy --dry-run
```

When you are ready to publish to your Cloudflare account:

```sh
npx wrangler login
npx wrangler deploy
```

The last command publishes the website and prints its address. Rebuild and deploy again after changes. This example uses the bundled schedule and leaves the maintenance writer disabled; it does not configure GPS, traffic, stored updates or a custom domain. Do not enable `UPDATES_ENABLED` on a public deployment without the access controls described in [MAINTENANCE.md](MAINTENANCE.md).

Reference: [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and [commands](https://developers.cloudflare.com/workers/wrangler/commands/). Account limits and hosting costs depend on your provider plan.

## How to enable live bus tracking

Start by asking SCPT for permission and an existing vehicle-location feed. If new equipment is needed, the [GPS setup guide](GPS_SETUP.md) describes a one-bus phone/Traccar pilot and Walmart/Target tracker considerations.

The connection is: **bus GPS → tracking service → server adapter → CobyTransit map**. Buying a tracker alone does not connect it to this website; its data must be available through an API. A Traccar adapter is not included and still needs to be implemented for that option.

Configure these on your hosting server only when you have the corresponding services:

| Setting | Purpose |
| --- | --- |
| `SCPT_VEHICLES_URL` | Authorized HTTPS feed in the format this app accepts |
| `SCPT_VEHICLES_TOKEN` | Secret access token, if the feed requires one |
| `SCPT_ROUTE_MAP` | Optional mapping between provider route IDs and this app's IDs |
| `TOMTOM_API_KEY` | Optional traffic-provider key; separate from bus tracking |

Use your host's environment/secret settings, not browser JavaScript or committed files. The local server reads process environment variables; it does **not** automatically load a `.env` file.

The app refreshes GPS every 30 seconds while visible and hides readings older than 90 seconds. Scheduled departures are not live ETAs. See [LIVE_TRACKING.md](LIVE_TRACKING.md) for feed formats, setup and testing.

## Optional developer tools

### Browser tests

Keep `npm run dev` running in one terminal. In a second terminal, from the same project folder:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/map.browser.mjs
```

These packages are only for testing. On a Linux machine missing browser system dependencies, Playwright also provides `npx playwright install --with-deps chromium`; installing system packages may require administrator access.

The browser suite uses synthetic GPS/traffic fixtures, not real buses. `BASE_URL` selects another preview address, and `BROWSER_EXECUTABLE` can select an installed Chromium executable.

### Update transit data

Install [Python](https://www.python.org/downloads/) only if you need to update the included data. Then run:

```sh
python3 scripts/import-gtfs.py
python3 scripts/import-service-maps.py
npm run check:data
npm test
npm run build
```

On Windows, use `py` in place of `python3`. If Python reports a missing `America/New_York` time zone, install the optional time-zone data with `py -m pip install tzdata` (or `python3 -m pip install tzdata` on other systems).

The GTFS importer downloads the agency timetable feed. The service-map importer downloads the reservation areas and supplemental map locations. Both use Python's standard library apart from time-zone data where the operating system does not supply it.

**Review changes before publishing.** The timetable importer deliberately stops if the archive differs from the audited version. Update the source review and corrections first; do not bypass that check to force new data through. A successful download is not confirmation that buses are operating.

## Where the important files are

| File or folder | What to edit or expect |
| --- | --- |
| `web/index.html` | Page content and structure |
| `web/assets/style.css` | Design, spacing, colors and responsive layout |
| `web/assets/app.js` | Search, route details, timetable dialogs and rider controls |
| `web/assets/map.js` | Map layers, stops and live markers |
| `web/assets/engine.js` | Schedule calculations and direct-trip planning |
| `web/assets/catalog.js` | Route descriptions, fares and notices |
| `web/assets/transit.json` | Included schedule; generated through the reviewed import process |
| `web/assets/vendor/` | Bundled Leaflet files and license |
| `server/` | Request handling and live-data integrations |
| `scripts/` | Local server, imports, build and packaging commands |
| `tests/` | Automated tests |
| `data/` | Source hashes, audit evidence and reviewed corrections |
| `package.json` | Available npm commands and required Node version |
| `.github/workflows/` | GitHub's automated checks |
| `worker/index.js`, `dist/` | Generated build output; edit the source files instead |

`.html` files contain page structure, `.css` contains styles, `.js`/`.mjs` contain JavaScript, `.json` contains structured data, `.py` contains Python scripts, and `.md` contains documentation like this README.

A normal run needs no database. Optional persisted schedule updates use a separately configured Cloudflare R2 `BUCKET` binding. `hosting.example.json` is a portable build manifest; it is not a Wrangler configuration or proof of an existing deployed site. Any host identity, credentials, stored data and scheduled maintenance are configured separately and are not copied by cloning GitHub.

## Common setup problems

| Problem | What to try |
| --- | --- |
| `node`, `npm` or `git` is not recognized | Install the tool, reopen the terminal and check its version |
| `package.json` cannot be found | Open a terminal in the repository folder, then run the command again |
| Port 4173 is already in use | Stop the other server, or set `PORT=4174` before starting this one |
| Map streets do not load | Check the internet connection and the Streets toggle; route data is bundled separately |
| No moving buses appear | A live feed is not connected, has failed, or has no fresh positions; check Map options |
| Old files appear after an update | Refresh the page; if necessary, clear saved offline schedules in the rider guide |
| Import says the upstream feed changed | Review the new agency data and update the audited corrections; this is an intentional guard |

To use another port on macOS/Linux: `PORT=4174 npm run dev`. In Windows PowerShell, run `$env:PORT="4174"`, then `npm run dev`. Open `http://localhost:4174`.

## More information and licenses

- [ROUTE_AUDIT.md](ROUTE_AUDIT.md): route-by-route findings and unresolved conflicts.
- [DATA_SOURCES.md](DATA_SOURCES.md): where the schedules, map features and notices come from.
- [GPS_SETUP.md](GPS_SETUP.md): hardware and tracking-server proposal.
- [LIVE_TRACKING.md](LIVE_TRACKING.md): GPS and traffic API configuration.
- [MAINTENANCE.md](MAINTENANCE.md): protected runtime updates and source reviews.
- [SECURITY.md](SECURITY.md): privacy and security behavior.
- [CONTRIBUTING.md](CONTRIBUTING.md): contribution instructions.

Application code is licensed under [MIT](LICENSE). Leaflet keeps its BSD-2-Clause license. Transit data and OpenStreetMap tiles retain their own source terms and attribution requirements. No county or SUNY endorsement is claimed.
