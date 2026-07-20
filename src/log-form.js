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
  const feedback = document.getElementById('log-feedback');
  feedback.textContent = 'Saving...';
  const result = await Store.add(entry);
  feedback.textContent = result.ok
    ? (result.local ? 'Saved locally (no sheet connected).' : 'Saved to sheet ✓')
    : 'Saved locally — sheet sync failed, check the Apps Script URL.';
});