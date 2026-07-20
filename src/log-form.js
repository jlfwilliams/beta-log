const gradeSel = document.getElementById('f-grade');
populateGradeSelect(gradeSel);
// Not using `valueAsDate = new Date()` here — its setter treats the Date as
// a UTC instant, so anywhere behind UTC (all of the US) this can default to
// tomorrow once past UTC midnight locally. Build the local yyyy-MM-dd string
// by hand instead, matching the ISO format the rest of the app now uses.
const today = new Date();
const localIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
document.getElementById('f-date').value = localIso;

let selectedStatus = 'Send';
document.querySelectorAll('#status-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#status-toggle button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedStatus = btn.dataset.status;
  });
});

// --- Full log table (below the form) ---------------------------------
// Lives here rather than dashboard.js since it's specific to the Log Climb
// tab, but reuses gradeColor/formatMonthDay from dashboard.js — safe to call
// once DOMContentLoaded fires, since by then every deferred script (dashboard.js
// included) has already run, even though it's declared later in index.html.
let logTableRows = [];

async function renderLogTable(){
  const data = await Store.getData((fresh) => {
    logTableRows = fresh.log;
    paintLogTable();
  });
  logTableRows = data.log;
  paintLogTable();
}

function paintLogTable(){
  const body = document.getElementById('log-table-body');
  if (!body) return;
  // Newest-logged-first, using the actual write time rather than the climb
  // date, so a same-day entry always lands above earlier same-day entries.
  const sorted = [...logTableRows].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  body.innerHTML = sorted.map(r => `
    <tr>
      <td class="mono">${formatTimestamp(r.timestamp)}</td>
      <td class="mono">${formatMonthDay(r.date)}</td>
      <td><span class="grade-pill mono" style="background:${gradeColor(r.grade)}; color:#17161A;">${r.grade}</span></td>
      <td>${r.status}</td>
      <td>${r.climber || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="color:var(--chalk-500); text-align:center; padding:20px;">No climbs logged yet.</td></tr>';
}

// Timestamps with no time-of-day component (e.g. an offline-only entry that
// hasn't synced yet) fall back to '—' rather than a misleading 12:00am.
function formatTimestamp(ts){
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return '—';
  const hours24 = d.getHours();
  const hours12 = ((hours24 + 11) % 12) + 1;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const isoLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${formatMonthDay(isoLocal)} ${hours12}:${minutes}${ampm}`;
}

document.addEventListener('DOMContentLoaded', renderLogTable);

// --- Feedback message with auto-fade ----------------------------------
let feedbackFadeTimer = null;
let feedbackClearTimer = null;

function setLogFeedback(message, { autoFade = true } = {}){
  const feedback = document.getElementById('log-feedback');
  clearTimeout(feedbackFadeTimer);
  clearTimeout(feedbackClearTimer);
  feedback.style.opacity = '1';
  feedback.textContent = message;
  if (!autoFade) return;
  feedbackFadeTimer = setTimeout(() => {
    feedback.style.opacity = '0';
    // Clear the text after the fade transition finishes so it isn't left
    // sitting there invisible (e.g. for screen readers) until next submit.
    feedbackClearTimer = setTimeout(() => { feedback.textContent = ''; }, 500);
  }, 3000);
}

let selectedClimber = 'Parker';
document.querySelectorAll('#climber-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#climber-toggle button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedClimber = btn.dataset.climber;
  });
});

document.getElementById('log-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const grade = gradeSel.value;
  const entry = {
    date: document.getElementById('f-date').value,
    grade,
    status: selectedStatus,
    climber: selectedClimber
  };
  setLogFeedback('Saving...', { autoFade: false });
  const result = await Store.add(entry);
  setLogFeedback(
    result.ok
      ? (result.local ? 'Saved locally (no sheet connected).' : 'Saved to sheet ✓')
      : 'Saved locally — sheet sync failed, check the Apps Script URL.'
  );

  // Paint the new entry into the table right away rather than waiting on
  // Store.getData()'s cache TTL — mirrors the timestamp stand-in Store.add()
  // itself writes into the cache, so this stays consistent with what a
  // future getData() call would return until the real sheet Timestamp lands.
  logTableRows = [...logTableRows, { ...entry, timestamp: Date.now() }];
  paintLogTable();
});