const GRADES = (() => {
  const list = ['5.6','5.7','5.8','5.9'];
  const letters = ['a','b','c','d'];
  for (let n=10;n<=13;n++){ letters.forEach(l => list.push(`5.${n}${l}`)); }
  return list;
})();

function gradeIndex(grade){ return GRADES.indexOf(grade); }

function gradeColor(grade){
  const bands = [
    { test: g => g === '5.6' || g === '5.7' || g === '5.8' || g === '5.9', color: '#6FCF97' },
    { test: g => g.startsWith('5.10'), color: '#C8FF4D' },
    { test: g => g.startsWith('5.11'), color: '#FFD166' },
    { test: g => g.startsWith('5.12'), color: '#FF8C42' },
    { test: g => g.startsWith('5.13'), color: '#FF4B3E' },
  ];
  const band = bands.find(b => b.test(grade));
  return band ? band.color : '#6FCF97';
}

function populateGradeSelect(sel){
  sel.innerHTML = GRADES.map(g=>`<option value="${g}">${g}</option>`).join('');
}
