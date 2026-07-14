/* ---------- Log form ---------- */
const gradeSel = document.getElementById('f-grade');
populateGradeSelect(gradeSel);
document.getElementById('f-date').valueAsDate = new Date();

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
    gradeValue: gradeIndex(grade),
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
