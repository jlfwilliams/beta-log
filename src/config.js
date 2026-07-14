/* ---------- Config ---------- */
// Replace with your deployed Apps Script Web App URL (ends in /exec).
// Hardcoded so it's baked into the page instead of something users have to enter.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwl912jffG5huMY6JWzau2NYUt-hf6LLzl8-ilO98FIeS7SnnYrOTa5cWyYyxcJ4Wttqg/exec';
function isConfigured(){ return !!APPS_SCRIPT_URL && !APPS_SCRIPT_URL.startsWith('PASTE_'); }
