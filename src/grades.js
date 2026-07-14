/* ---------- Grade table (Sport leading, YDS) ---------- */
const GRADES = (() => {
  const list = ['5.6','5.7','5.8','5.9'];
  const letters = ['a','b','c','d'];
  for (let n=10;n<=13;n++){ letters.forEach(l => list.push(`5.${n}${l}`)); }
  return list;
})();

function gradeIndex(grade){ return GRADES.indexOf(grade); }
function gradeColor(grade){
  const idx = GRADES.indexOf(grade);
  const pct = idx / Math.max(GRADES.length-1,1);
  const stops = ['#6FCF97','#C8FF4D','#FFD166','#FF8C42','#FF4B3E'];
  const pos = Math.round(pct * (stops.length-1));
  return stops[Math.max(0, Math.min(stops.length-1, pos))];
}

function populateGradeSelect(sel){
  sel.innerHTML = GRADES.map(g=>`<option value="${g}">${g}</option>`).join('');
}
