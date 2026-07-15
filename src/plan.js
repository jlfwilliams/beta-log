const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let plan = [];
let goal = null;

function formatDateNoYear(dateStr){
  // Plan dates come in as yyyy-MM-dd; parse the parts directly rather than via
  // `new Date()` so this can't drift a day from a timezone offset.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!m) return dateStr || '—';
  const month = MONTH_ABBR[parseInt(m[2], 10) - 1];
  const day = parseInt(m[3], 10);
  return month ? `${month} ${day}` : dateStr;
}

async function renderPlan(){
  Promise.all([
  plan = await Store.fetchPlan(),
  goal = await Store.fetchGoal()
  ])
  const sorted = [...plan]
    .filter(row => row.date && !isNaN(new Date(row.date)))
    .sort((a,b)=> new Date(a.date) - new Date(b.date));

  const today = new Date();
  today.setHours(0,0,0,0);

  // The current training week is the latest week whose start date has already
  // passed (or is today) — i.e. the last row we haven't walked past yet.
  let current = null;
  for (const row of sorted) {
    const d = new Date(row.date);
    d.setHours(0,0,0,0);
    if (d <= today) current = row;
    else break;
  }

  const currentSub = document.getElementById('plan-current-sub');
  const currentBody = document.getElementById('plan-current-body');

  if (!current) {
    currentSub.textContent = sorted.length
      ? 'Your plan starts in the future — nothing active yet.'
      : 'No plan loaded yet — add rows to your plan sheet.';
    currentBody.innerHTML = '';
  } else {
    currentSub.textContent = `Week ${current.week} · starts ${formatDateNoYear(current.date)}`;
    const climbs = [current.climb1, current.climb2, current.climb3, current.climb4];
    currentBody.innerHTML = `
      <div class="plan-climb-grid">
        ${climbs.map((g, i) => {
          if (!g) return '<div></div>';
          // Climbs at or above the goal grade (set directly in the goals
          // sheet) get the same accent-color callout as the pyramid, so the
          // goal marks which of this week's climbs push toward it.
          const atOrAboveGoal = goal && gradeIndex(g) >= goal.gradeValue;
          const bg = atOrAboveGoal ? 'var(--tape-flash)' : gradeColor(g);
          return `
          <div class="plan-climb-cell">
            <div class="climb-label">Climb ${i + 1}${atOrAboveGoal ? ' 🎯' : ''}</div>
            <span class="grade-pill mono" style="background:${bg}; color:#17161A;">${g}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:13.5px; color:var(--chalk-300);">
        First climb picked by <strong style="color:var(--tape-flash);">${current.firstClimber || '—'}</strong> this week.
      </div>
    `;
  }

  const tbody = document.getElementById('plan-table-body');
  tbody.innerHTML = sorted.map(row => `
    <tr style="${current && row.week === current.week ? 'background:rgba(200,255,77,0.08);' : ''}">
      <td class="mono">${row.week}</td>
      <td class="mono">${formatDateNoYear(row.date)}</td>
      <td>${row.climb1 || '—'}</td>
      <td>${row.climb2 || '—'}</td>
      <td>${row.climb3 || '—'}</td>
      <td>${row.climb4 || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="color:var(--chalk-500); text-align:center; padding:20px;">No plan rows yet.</td></tr>';
}
