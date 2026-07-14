# Beta Log — Sport Climbing Tracker (POC)

A single-page app for logging sport leads in the gym and visualizing progress (grade pyramid, progress-over-time, plan, goal), backed by a Google Sheet. Grades use the YDS scale (5.6–5.15d).

## What's in here
- `index.html` — the app shell (markup + styles); pulls in the scripts below.
- `src/config.js`, `src/grades.js`, `src/store.js`, `src/nav.js`, `src/log-form.js`, `src/dashboard.js`, `src/plan.js`, `src/lock.js` — the app's logic, split into one file per concern so it's easier to find and change things. Load order matters (that's the order they're included in `index.html`) since they're classic scripts sharing one global scope, not modules.
- `src/chart.umd.min.js` — Chart.js, vendored locally so the Progress Over Time chart doesn't depend on a CDN (some networks/proxies block or mis-serve CDN scripts, which breaks the chart).
- `resources/favicon.svg`, `resources/favicon.ico`, `resources/favicon-16x16.png`, `resources/favicon-32x32.png`, `resources/apple-touch-icon.png` — the browser tab icon, matching the mountain-glyph logo in the header.
- `apps-script.gs` — code to paste into Google Apps Script. This turns your Google Sheet into a tiny API the app can read from and write to.

## 0. Set your access passphrase
The app is locked behind a passphrase screen — nobody can see the log or dashboard without it. This is a basic deterrent for a personal static site, not real security: since GitHub Pages serves plain files, anyone determined enough could read the page's source. It's meant to stop casual visitors, not a motivated attacker.

By default the passphrase is `letmeclimb`. To set your own before deploying:
1. Open any browser's console (F12) and run:
   ```js
   crypto.subtle.digest('SHA-256', new TextEncoder().encode('your passphrase'))
     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
   ```
2. Copy the resulting hex string.
3. In `src/lock.js`, find `ACCESS_SECRET_HASH` near the top and replace the value with your new hash.

Once someone enters the correct passphrase in the app, it's remembered in their browser (`localStorage`), so they won't be asked again on that device — until they clear site data or open it in a different browser.

## 1. Set up the Google Sheet
1. Create a new Google Sheet.
2. In the Sheet menu: **Extensions > Apps Script**.
3. Delete the placeholder code and paste in everything from `apps-script.gs`.
4. Click **Deploy > New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, authorize the permissions Google asks for, then copy the URL ending in `/exec`.

The script auto-creates three tabs the first time it runs: `log` (climbs), `goals`, and `plan`. You don't need to set up headers by hand — but the `goals` and `plan` tabs are meant to be filled in *by you directly in the sheet*, not through the app:

**`plan` tab** — your training schedule:

| Week | Date | Climb 1 | Climb 2 | Climb 3 | Climb 4 | First Climber |
|---|---|---|---|---|---|---|
| 1 | 2026-06-22 | 5.9 | 5.10a | 5.10c | 5.11a | Parker |
| 2 | 2026-06-29 | 5.9 | 5.10b | 5.10d | 5.11b | Finn |

- **Week**: training week number, starting at 1 and counting up through the year.
- **Date**: the day that week *starts*. The app compares this against today's date to figure out which row is the current training week (the most recent start date that isn't in the future).
- **Climb 1–4**: the grades planned for that week.
- **First Climber**: whose turn it is to pick the first climb that week.

**`goals` tab** — the shared target grade for both climbers:

| Grade |
|---|
| 5.11c |

- **Grade**: the YDS grade you're working toward (e.g. `5.11c`). If you add more than one row over time, the app uses the last one, so you can just append a new row when you set a new goal.
- The app reads this to color-code the Grade Pyramid and the Plan tab's "This Week" panel: grades at or above the goal are called out with the accent color and a 🎯 marker, rather than the usual difficulty gradient.

## 2. Connect the app
The Apps Script URL is hardcoded into `src/config.js` rather than entered in the UI — that way you don't have to hand it out to anyone you share the app with; they only ever see the passphrase screen.

1. In `src/config.js`, find `APPS_SCRIPT_URL` near the top.
2. Replace `'PASTE_YOUR_APPS_SCRIPT_URL_HERE'` with your `/exec` URL from step 1 above.

From here, every climb you log is written as a new row in your sheet, and the Dashboard/Plan tabs read live from it (including your goal).

Until you replace the placeholder URL, the app still works — it just stores climbs in the browser (`localStorage`) so you can try the UI before wiring up the sheet.

## 3. Deploy to GitHub Pages
1. Push this folder to a GitHub repo — `index.html`, the `src/` folder, and the `resources/` folder should all sit next to each other (repo root, or `/docs` if you configure Pages that way), since `index.html` references them by relative path.
2. In the repo: **Settings > Pages > Build and deployment**, set source to your branch/folder.
3. GitHub will give you a URL like `https://yourname.github.io/reponame/`.

## Notes on this POC
- **Grades**: sport leads use YDS 5.6–5.15d, mapped to a numeric index internally so they can be sorted and charted.
- **Security**: the Apps Script endpoint is only as private as its URL. There's no auth on writes — don't put sensitive data in the sheet.
- **CORS**: the app deliberately sends POST bodies without a `Content-Type` header. Setting one triggers a CORS preflight (`OPTIONS`) request that Apps Script's `doPost` doesn't handle, which breaks the write. Leave that as-is.
- **Offline fallback**: local storage acts as a cache/fallback, not a two-way sync — if you log climbs offline and later connect a sheet, those offline entries won't automatically migrate over.
- **Goals**: set once in the `goals` sheet tab, not in the web app — there's no in-app form for it anymore. The app only reads that sheet to drive color-coding.

## Natural next steps
- Multiple users (each with their own sheet or a shared sheet with a name/user column).
- Editing/deleting existing entries (currently append-only).
- Session-based logging (multiple climbs in one visit) rather than one form per climb.

