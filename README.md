# Beta Log — Sport Climbing Tracker (POC)

A single-page app for logging sport leads in the gym and visualizing progress (grade pyramid, progress-over-time, goals), backed by a Google Sheet. Grades use the YDS scale (5.6–5.15d).

## What's in here
- `index.html` — the whole app (form + dashboard + goals + settings). This is the only file GitHub Pages needs to serve.
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
3. In `index.html`, find `ACCESS_SECRET_HASH` near the top of the `<script>` block and replace the value with your new hash.

Once someone enters the correct passphrase in the app, it's remembered in their browser (`localStorage`), so they won't be asked again on that device — until they clear site data or open it in a different browser.

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
The Apps Script URL is hardcoded into `index.html` rather than entered in the UI — that way you don't have to hand it out to anyone you share the app with; they only ever see the passphrase screen.

1. In `index.html`, find `APPS_SCRIPT_URL` near the top of the `<script>` block.
2. Replace `'PASTE_YOUR_APPS_SCRIPT_URL_HERE'` with your `/exec` URL from step 1 above.
3. If you set a `SECRET` in the Apps Script, go to the app's **Settings** tab and enter the same value there, then click **Save**.

From here, every climb you log is written as a new row in your sheet, and the Dashboard/Goals tabs read live from it.

Until you replace the placeholder URL, the app still works — it just stores climbs in the browser (`localStorage`) so you can try the UI before wiring up the sheet.

## 3. Deploy to GitHub Pages
1. Push this folder to a GitHub repo (`index.html` should be at the repo root, or in `/docs` if you configure Pages that way).
2. In the repo: **Settings > Pages > Build and deployment**, set source to your branch/folder.
3. GitHub will give you a URL like `https://yourname.github.io/reponame/`.

## Notes on this POC
- **Two different secrets, two different jobs**: the access passphrase (`ACCESS_SECRET_HASH`) gates the whole app in the browser; the Apps Script shared secret (Settings tab) is sent with writes to your Sheet. You can reuse the same phrase for both if you want one thing to remember, but they're checked independently.
- **Grades**: sport leads use YDS 5.6–5.15d, mapped to a numeric index internally so they can be sorted and charted.
- **Security**: the Apps Script endpoint is only as private as its URL. The optional shared secret stops casual writes but isn't real auth — don't put sensitive data in the sheet.
- **CORS**: the app deliberately sends POST bodies without a `Content-Type` header. Setting one triggers a CORS preflight (`OPTIONS`) request that Apps Script's `doPost` doesn't handle, which breaks the write. Leave that as-is.
- **Offline fallback**: local storage acts as a cache/fallback, not a two-way sync — if you log climbs offline and later connect a sheet, those offline entries won't automatically migrate over.

## Natural next steps
- Multiple users (each with their own sheet or a shared sheet with a name/user column).
- Editing/deleting existing entries (currently append-only).
- Session-based logging (multiple climbs in one visit) rather than one form per climb.
