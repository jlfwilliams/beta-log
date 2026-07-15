const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwl912jffG5huMY6JWzau2NYUt-hf6LLzl8-ilO98FIeS7SnnYrOTa5cWyYyxcJ4Wttqg/exec';
const APP_VERSION = '1.3.0';
 
// The Sheet ID from your spreadsheet's URL:
//   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
//
// Reads (Dashboard, Plan) go straight to Google's public gviz endpoint using
// this ID — no Apps Script execution involved, so no cold-start latency.
// Writes (Log Climb) still go through Apps Script's doPost as before.
//
// IMPORTANT: gviz only works if the sheet is shared as
// "Anyone with the link -> Viewer". That means the raw log/goals/plan data
// becomes readable by anyone who has this Sheet ID, bypassing the app's
// passphrase lock — the passphrase still gates the app UI, but not the
// underlying sheet data once it's shared this way.
const SHEET_ID = '1pzodnPiBtvjSTgMQxoFhczoOGGodIr70VeJg1UtOrYA';
 
