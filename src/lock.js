/* ---------- Access lock ---------- */
// This is a basic deterrent for a personal static site, not real security —
// the hash below is visible to anyone who views source. It just stops casual
// visitors from opening the app or hitting your Apps Script endpoint.
//
// To set your own passphrase: open a browser console anywhere and run
  // crypto.subtle.digest('SHA-256', new TextEncoder().encode('your passphrase'))
  //   .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
// then paste the resulting hex string in as ACCESS_SECRET_HASH below.
const ACCESS_SECRET_HASH = '6b9cd4d271dd9c0d1ca51c808c314b09e54592a23f6773aa401df78738d44acf';
const UNLOCK_KEY = 'betalog_unlock_hash';

async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}

function unlockApp(){
  document.getElementById('lock-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  renderDashboard();
}

document.getElementById('lock-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('lock-input');
  const error = document.getElementById('lock-error');
  const hash = await sha256Hex(input.value);
  if (hash === ACCESS_SECRET_HASH){
    localStorage.setItem(UNLOCK_KEY, hash);
    unlockApp();
  } else {
    error.textContent = 'Wrong passphrase.';
    const card = document.querySelector('.lock-card');
    card.classList.remove('lock-shake');
    void card.offsetWidth; // restart animation
    card.classList.add('lock-shake');
    input.value = '';
    input.focus();
  }
});

(function checkStoredUnlock(){
  const stored = localStorage.getItem(UNLOCK_KEY);
  if (stored && stored === ACCESS_SECRET_HASH) unlockApp();
})();
