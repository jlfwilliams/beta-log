const Store = {
  key: 'betalog_climbs',
  cacheKey: 'betalog_cache',
  // Goal and Plan almost never change (hand-edited occasionally), and Log
  // isn't much more frequent — a short TTL is enough to make tab-switching
  // feel instant without ever showing genuinely stale data for long.
  cacheTtlMs: 5 * 60 * 1000,

  getLocal(){ return JSON.parse(localStorage.getItem(this.key) || '[]'); },
  setLocal(rows){ localStorage.setItem(this.key, JSON.stringify(rows)); },

  getCache(){
    try {
      const raw = localStorage.getItem(this.cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  },
  setCache(data){
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ ...data, fetchedAt: Date.now() }));
    } catch(e){ /* quota exceeded etc — just skip caching */ }
  },
  isCacheFresh(cache){
    return !!cache && (Date.now() - cache.fetchedAt) < this.cacheTtlMs;
  },

  formatLog(rows){
    return (rows || []).map(r => ({
      date: r.date,
      grade: r.grade,
      gradeValue: gradeIndex(r.grade),
      status: r.status,
      climber: r.climber
    }));
  },

  // If multiple goals exist, the most recently added one (the last row) is
  // treated as the current goal.
  formatGoal(rows){
    if (!rows || !rows.length) return null;
    const g = rows[rows.length - 1];
    const idx = gradeIndex(g.grade);
    return idx === -1 ? null : { grade: g.grade, gradeValue: idx };
  },

  formatCombined(raw){
    return {
      log: this.formatLog(raw.log),
      goal: this.formatGoal(raw.goal),
      plan: raw.plan || []
    };
  },

  // --- gviz reads -----------------------------------------------------
  // Reads (log/goal/plan) go straight to Google's public gviz endpoint
  // instead of through Apps Script. There's no script execution involved —
  // Google serves the sheet data directly — so there's no cold start to pay.
  // Writes (Store.add, below) still go through Apps Script's doPost, since
  // gviz is read-only.
  //
  // Requires the sheet to be shared as "Anyone with the link -> Viewer".

  gvizCallbackCounter: 0,

  // gviz encodes date cells as the string "Date(year,month,day)" (month is
  // 0-indexed) rather than a plain value. Both log and plan now use the same
  // internal canonical format, yyyy-MM-dd — display-specific formatting (e.g.
  // month/day only in the recent sessions panel) happens at render time.
  gvizCellToDateStr(v){
    if (v === null || v === undefined || v === '') return '';
    const s = String(v);
    const m = /^Date\((\d+),(\d+),(\d+)/.exec(s);
    if (!m) return s;
    const year = m[1];
    const month = String(Number(m[2]) + 1).padStart(2, '0');
    const day = String(m[3]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // gviz doesn't set Access-Control-Allow-Origin, so a plain fetch() gets
  // blocked by CORS regardless of what origin the app is served from (this
  // would fail the same way on GitHub Pages, not just locally over file://).
  // The endpoint is built for JSONP instead: load it via a <script> tag with
  // a responseHandler callback name, and it invokes that global function
  // directly with the parsed data — script tags aren't subject to CORS.
  fetchGvizRows(sheetName){
    return new Promise((resolve, reject) => {
      if (!GVIZ_SHEET_ID) {
        reject(new Error('GVIZ_SHEET_ID not configured in config.js'));
        return;
      }

      const callbackName = `__betalog_gviz_${Date.now()}_${this.gvizCallbackCounter++}`;
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out loading gviz data for "${sheetName}" tab.`));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (json) => {
        cleanup();
        if (json.status === 'error') {
          const detail = (json.errors && json.errors[0] && json.errors[0].detailed_message) || 'unknown gviz error';
          reject(new Error(`gviz error reading "${sheetName}" tab: ${detail}`));
          return;
        }
        // Each row's cells come through as { v: value, f: formattedValue },
        // or null for a blank cell — flatten to a plain array of raw values.
        const rows = (json.table.rows || [])
          .map(row => row.c.map(cell => (cell ? cell.v : null)))
          .filter(cells => cells.some(c => c !== null && c !== ''));
        resolve(rows);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load gviz data for "${sheetName}" tab — check GVIZ_SHEET_ID and sharing settings.`));
      };

      // tqx sub-options are semicolon-separated within the single param.
      script.src = `https://docs.google.com/spreadsheets/d/${GVIZ_SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&headers=1&sheet=${encodeURIComponent(sheetName)}`;
      document.head.appendChild(script);
    });
  },

  // The one network round trip (three parallel requests, but no shared
  // server execution to wait on) the whole app needs: log + goal + plan,
  // read directly off the sheet.
  async fetchCombinedRaw(){
    const [logRows, goalRows, planRows] = await Promise.all([
      this.fetchGvizRows('log'),
      this.fetchGvizRows('goals'),
      this.fetchGvizRows('plan')
    ]);

    return {
      // Column order matches the sheet headers: Timestamp, Date, Grade, Status, Climber.
      log: logRows.map(c => ({
        date: this.gvizCellToDateStr(c[1]),
        grade: c[2] || '',
        status: c[3] || '',
        climber: c[4] || ''
      })),
      // Column order: Grade.
      goal: goalRows.map(c => ({ grade: c[0] || '' })),
      // Column order: Week, Date, Climb 1, Climb 2, Climb 3, Climb 4, First Climber.
      plan: planRows.map(c => ({
        week: Number(c[0]),
        date: this.gvizCellToDateStr(c[1]),
        climb1: c[2] || '',
        climb2: c[3] || '',
        climb3: c[4] || '',
        climb4: c[5] || '',
        firstClimber: c[6] || ''
      }))
    };
  },

  // Dedupes concurrent callers onto a single in-flight network call — this is
  // what lets prefetch() (fired from the lock screen) and the later getData()
  // call (fired on unlock) share one request instead of two, and generally
  // protects against double-fetching if multiple views ask for data at once.
  _inflight: null,

  async fetchAndCache(){
    if (this._inflight) return this._inflight;
    this._inflight = (async () => {
      try {
        const fresh = await this.fetchCombinedRaw();
        this.setCache(fresh);
        return this.formatCombined(fresh);
      } catch(e){
        console.warn('Combined fetch failed, falling back to local log only.', e);
        return {
          log: this.getLocal().map(r => ({ ...r, gradeValue: gradeIndex(r.grade) })),
          goal: null,
          plan: []
        };
      } finally {
        this._inflight = null;
      }
    })();
    return this._inflight;
  },

  // Fire the refresh but don't make the caller wait on it — used for the
  // "stale-while-revalidate" path below.
  refreshInBackground(onUpdate){
    this.fetchAndCache().then(data => { if (onUpdate) onUpdate(data); });
  },

  // Kick the combined fetch off as early as possible — call this from the
  // lock screen, before the passphrase is even submitted, so by the time
  // renderDashboard() calls getData() the data may already be in hand.
  // Now that reads go through gviz instead of Apps Script there's no cold
  // start to hide, but this still shaves the full round trip (however short)
  // off the perceived wait after unlocking (fetchAndCache's dedupe means it
  // joins this same in-flight request either way — no double fetch).
  prefetch(){
    const cache = this.getCache();
    if (cache && this.isCacheFresh(cache)) return; // already fresh, nothing to warm
    this.fetchAndCache().catch(()=>{});
  },

  // Main read path for the whole app. Resolves as fast as possible:
  //  - fresh cache (< TTL old)  -> return it immediately, no network call at all
  //  - stale cache (>= TTL old) -> return it immediately AND refresh quietly
  //    in the background, calling onUpdate(data) once the fresh data lands
  //  - no cache yet             -> nothing to show instantly, wait on the network
  // This makes switching between Dashboard/Plan feel instant after the first
  // load, while still keeping data reasonably current.
  async getData(onUpdate){
    const cache = this.getCache();

    if (cache && this.isCacheFresh(cache)) {
      return this.formatCombined(cache);
    }

    if (cache) {
      const stale = this.formatCombined(cache);
      this.refreshInBackground(onUpdate);
      return stale;
    }

    return this.fetchAndCache();
  },

  async add(entry){
    // always cache locally so the UI stays responsive / works offline
    const rows = this.getLocal();
    rows.push(entry);
    this.setLocal(rows);

    try {
      // NOTE: no explicit Content-Type header — this avoids a CORS preflight
      // that Apps Script's doPost doesn't handle. Body is still JSON text.
      // gradeValue is dropped before sending — the sheet only stores the
      // grade text, and gradeValue is re-derived from it on every read.
      const { gradeValue, ...toSend } = entry;
      const res = await fetch(APPS_SCRIPT_URL, {
        method:'POST',
        body: JSON.stringify(toSend)
      });
      const json = await res.json();

      // Patch the new entry straight into the combined cache (rather than
      // invalidating it) so the Dashboard reflects the new climb instantly
      // on next render, without waiting out the TTL or spending another
      // round trip just to re-fetch what we already just sent.
      if (json.ok) {
        const cache = this.getCache();
        if (cache) {
          cache.log = [...(cache.log || []), toSend];
          this.setCache(cache);
        }
      }

      return json;
    } catch(e){
      console.warn('Sheet sync failed, entry kept locally only.', e);
      return { ok:false, local:true, error:String(e) };
    }
  }
};