# Beta Log — Climb Training Tracker (POC)

A single-page app for logging climbs and visualizing progress (grade pyramid, progress-over-time, goals), backed by a Google Sheet.

## What's in here
- `index.html` — the whole app (form + dashboard + goals + settings). This is the only file GitHub Pages needs to serve.
- `apps-script.gs` — code to paste into Google Apps Script. This turns your Google Sheet into a tiny API the app can read from and write to.

## 1. Set up the Google Sheet
1. Create a new Google Sheet.
2. In the Sheet menu: **Extensions > Apps Script**.
3. Delete the placeholder code and paste in everything from `apps-script.gs`.
4. (Optional) Set a `SECRET` value at the top of the script if you want a basic shared-secret check on writes.
5. Click **Deploy > New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize the permissions Google asks for, then copy the URL ending in `/exec`.

## 2. Connect the app
1. Open `index.html` (locally, or once it's live on GitHub Pages).
2. Go to the **Settings** tab.
3. Paste your `/exec` URL into "Apps Script Web App URL". If you set a secret, enter it too.
4. Click **Save & Sync**.

From here, every climb you log is written as a new row in your sheet, and the Dashboard/Goals tabs read live from it.

Without an endpoint connected, the app still works — it just stores climbs in your browser (`localStorage`) so you can try the UI before wiring up the sheet.

## 3. Deploy to GitHub Pages
1. Push this folder to a GitHub repo (`index.html` should be at the repo root, or in `/docs` if you configure Pages that way).
2. In the repo: **Settings > Pages > Build and deployment**, set source to your branch/folder.
3. GitHub will give you a URL like `https://yourname.github.io/reponame/`.

## Notes on this POC
- **Grades**: boulder grades use V0–V16; route grades (sport/top rope) use YDS 5.6–5.15d. Both are mapped to a numeric index internally so they can be sorted and charted.
- **Security**: the Apps Script endpoint is only as private as its URL. The optional shared secret stops casual writes but isn't real auth — don't put sensitive data in the sheet.
- **CORS**: the app deliberately sends POST bodies without a `Content-Type` header. Setting one triggers a CORS preflight (`OPTIONS`) request that Apps Script's `doPost` doesn't handle, which breaks the write. Leave that as-is.
- **Offline fallback**: local storage acts as a cache/fallback, not a two-way sync — if you log climbs offline and later connect a sheet, those offline entries won't automatically migrate over.

## Natural next steps
- Multiple users (each with their own sheet or a shared sheet with a name/user column).
- Editing/deleting existing entries (currently append-only).
- Session-based logging (multiple climbs in one visit) rather than one form per climb.
