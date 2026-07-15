const Store = {
  key: 'betalog_climbs',

  getLocal(){ return JSON.parse(localStorage.getItem(this.key) || '[]'); },
  setLocal(rows){ localStorage.setItem(this.key, JSON.stringify(rows)); },

  // If multiple goals exist, the most recently added one (the last row) is
  // treated as the current goal.
  async fetchGoal(){
    try {
      const res = await fetch(APPS_SCRIPT_URL + '?type=goals', { method:'GET' });
      const json = await res.json();
      if (json.ok && json.data.length){
        const g = json.data[json.data.length - 1];
        const idx = gradeIndex(g.grade);
        if (idx === -1) return null;
        return { grade: g.grade, gradeValue: idx };
      }
    } catch(e){ console.warn('Goal fetch failed.', e); }
    return null;
  },

  async fetchPlan(){
    try {
      const res = await fetch(APPS_SCRIPT_URL + '?type=plan', { method:'GET' });
      const json = await res.json();
      if (json.ok) return json.data;
    } catch(e){ console.warn('Plan fetch failed.', e); }
    return [];
  },

  async fetchAll(){
    try {
      const res = await fetch(APPS_SCRIPT_URL, { method:'GET' });
      const json = await res.json();

      if (json.ok) return json.data.map(r => ({
        date: r.date,
        grade: r.grade,
        gradeValue: gradeIndex(r.grade),
        status: r.status,
        climber: r.climber
      }));
    } catch(e){ console.warn('Sheet fetch failed, falling back to local.', e); }
    return this.getLocal().map(r => ({ ...r, gradeValue: gradeIndex(r.grade) }));
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
      return json;
    } catch(e){
      console.warn('Sheet sync failed, entry kept locally only.', e);
      return { ok:false, local:true, error:String(e) };
    }
  }
};
