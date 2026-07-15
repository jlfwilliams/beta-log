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

  // The one network call the whole app needs: log + goal + plan in a single
  // round trip, instead of a separate fetch per view.
  async fetchCombinedRaw(){
    const res = await fetch(APPS_SCRIPT_URL + '?type=all', { method:'GET' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Combined fetch failed');
    return { log: json.log || [], goal: json.goal || [], plan: json.plan || [] };
  },

  async fetchAndCache(){
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
    }
  },

  // Fire the refresh but don't make the caller wait on it — used for the
  // "stale-while-revalidate" path below.
  refreshInBackground(onUpdate){
    this.fetchAndCache().then(data => { if (onUpdate) onUpdate(data); });
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
