/* ---------- Dashboard ---------- */
let progressChart = null;
let dashboardRows = [];
let dashboardGoal = null;
let dashboardClimberFilter = 'All';

document.querySelectorAll('#dashboard-climber-toggle button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#dashboard-climber-toggle button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    dashboardClimberFilter = btn.dataset.climber;
    applyDashboardFilter();
  });
});

async function renderDashboard(){
  dashboardRows = await Store.fetchAll();
  dashboardGoal = await Store.fetchGoal();
  applyDashboardFilter();
}

function applyDashboardFilter(){
  const rows = dashboardClimberFilter === 'All'
    ? dashboardRows
    : dashboardRows.filter(r => r.climber === dashboardClimberFilter);

  document.getElementById('stat-total').textContent = rows.length;
  const sends = rows.filter(r => r.status === 'Send' || r.status === 'Redpoint');
  document.getElementById('stat-sends').textContent = sends.length;
  document.getElementById('stat-rate').textContent = rows.length ? Math.round(sends.length / rows.length * 100) + '%' : '0%';

  const maxSend = sends.reduce((best, r) => (!best || r.gradeValue > best.gradeValue) ? r : best, null);
  document.getElementById('stat-max').textContent = maxSend ? maxSend.grade : '—';

  // Each panel is rendered independently — if one throws (e.g. the Chart.js
  // CDN script failed to load), it must not prevent the others from rendering.
  try { renderPyramid(rows, dashboardGoal); } catch(e){ console.error('Grade pyramid failed to render.', e); }
  try { renderProgressChart(rows); } catch(e){ console.error('Progress chart failed to render.', e); }
  try { renderRecentTable(rows); } catch(e){ console.error('Recent sessions failed to render.', e); }
}

function renderPyramid(rows, goal){
  const filtered = rows.filter(r => r.status === 'Send' || r.status === 'Redpoint');

  const container = document.getElementById('pyramid-container');
  if (!filtered.length){
    container.innerHTML = '<div class="pyramid-empty">No sends logged yet. Log a climb to start building your pyramid.</div>';
    return;
  }
  const counts = {};
  filtered.forEach(r => { counts[r.grade] = (counts[r.grade]||0) + 1; });
  const gradesPresent = Object.keys(counts).sort((a,b)=> gradeIndex(b) - gradeIndex(a));
  const maxCount = Math.max(...Object.values(counts));

  container.innerHTML = gradesPresent.map(g => {
    const count = counts[g];
    const widthPct = Math.max((count / maxCount) * 100, 8);
    const idx = gradeIndex(g);
    // Grades at or above the goal (set directly in the goals sheet) get the
    // accent "goal" color instead of the usual difficulty gradient, so the
    // goal visibly marks which grades are goal-tier versus still building
    // toward it. The exact goal grade also gets a small target marker.
    const atOrAboveGoal = goal && idx >= goal.gradeValue;
    const color = atOrAboveGoal ? 'var(--tape-flash)' : gradeColor(g);
    const isGoalRow = goal && idx === goal.gradeValue;
    return `<div class="pyramid-row">
      <div class="grade-label mono">${g}${isGoalRow ? ' 🎯' : ''}</div>
      <div class="bar-track"><div class="bar" style="width:${widthPct}%; background:${color};">${count}</div></div>
    </div>`;
  }).join('');
}

function renderProgressChart(rows){
  const canvasEl = document.getElementById('progress-chart');
  const fallback = document.getElementById('progress-chart-fallback');

  // If the Chart.js CDN script failed to load (network block, ad blocker, etc.),
  // `Chart` won't exist. Fail gracefully here instead of throwing, since an
  // uncaught error here would otherwise be indistinguishable from other panels
  // simply not rendering.
  if (typeof Chart === 'undefined') {
    canvasEl.style.display = 'none';
    fallback.style.display = 'block';
    fallback.textContent = 'Chart library failed to load — check your connection and refresh.';
    return;
  }
  canvasEl.style.display = '';
  fallback.style.display = 'none';

  const sends = rows.filter(r => (r.status === 'Send' || r.status === 'Redpoint') && r.date);
  const byWeek = {};
  sends.forEach(r => {
    if (!r.date) return;
    const d = new Date(r.date);
    if (isNaN(d)) return;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0,10);
    if (!byWeek[key] || r.gradeValue > byWeek[key].value){
      byWeek[key] = { value: r.gradeValue, label: r.grade };
    }
  });
  const weeks = Object.keys(byWeek).sort();
  if (progressChart) progressChart.destroy();
  progressChart = new Chart(canvasEl, {
    type: 'line',
    data: {
      labels: weeks,
      datasets: [{
        label: 'Hardest send',
        // Plot the raw grade index (not a normalized percentage) so the y
        // axis below can be labeled with the actual YDS grade at each step.
        data: weeks.map(w => byWeek[w].value),
        borderColor: '#C8FF4D',
        backgroundColor: 'rgba(200,255,77,0.12)',
        pointBackgroundColor: '#C8FF4D',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      plugins: {
        legend: { display:false },
        tooltip: {
          callbacks: {
            label: (ctx) => byWeek[weeks[ctx.dataIndex]].label
          }
        }
      },
      scales: {
        x: { ticks: { color:'#8A857D' }, grid:{ color:'#2B282C' } },
        y: {
          min: 0,
          max: GRADES.length - 1,
          ticks: {
            stepSize: 1,
            color:'#8A857D',
            // Show the actual YDS grade at each gridline instead of a raw
            // index or percentage.
            callback: (value) => GRADES[value] || ''
          },
          grid:{ color:'#2B282C' },
          title:{ display:true, text:'Grade', color:'#8A857D' }
        }
      }
    }
  });
}

function renderRecentTable(rows){
  const toTime = (r) => { const t = new Date(r.date).getTime(); return isNaN(t) ? -Infinity : t; };
  const sorted = [...rows].sort((a,b)=> toTime(b) - toTime(a)).slice(0,10);
  const body = document.getElementById('recent-table-body');
  body.innerHTML = sorted.map(r => `
    <tr>
      <td class="mono">${r.date || '—'}</td>
      <td><span class="grade-pill mono" style="background:${gradeColor(r.grade)}; color:#17161A;">${r.grade}</span></td>
      <td>${r.status}</td>
      <td>${r.climber || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="color:var(--chalk-500); text-align:center; padding:20px;">No climbs logged yet.</td></tr>';
}
