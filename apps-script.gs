/**
 * Beta Log — Apps Script backend
 *
 * Setup:
 * 1. Create a Google Sheet. This script will auto-create a "log" tab (climbs) and a
 *    "goals" tab the first time it runs, with the right headers, so you don't need to
 *    set those up by hand.
 * 2. In the Sheet, go to Extensions > Apps Script.
 * 3. Delete any starter code and paste this whole file in.
 * 4. Click Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL (ends in /exec) into APPS_SCRIPT_URL in index.html.
 */

const SHEET_NAME = 'log';
const GOALS_SHEET_NAME = 'goals';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp','Date','Grade','GradeValue','Status','Climber']);
  }
  return sheet;
}

function getGoalsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GOALS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(GOALS_SHEET_NAME);
    sheet.appendRow(['Timestamp','Grade','GradeValue']);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetAsObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[String(h).charAt(0).toLowerCase() + String(h).slice(1)] = row[i]; });
      return obj;
    });
}

function doGet(e) {
  const type = e && e.parameter && e.parameter.type;
  if (type === 'goals') {
    const data = readSheetAsObjects_(getGoalsSheet_());
    return jsonOut_({ ok: true, data });
  }
  const data = readSheetAsObjects_(getSheet_());
  return jsonOut_({ ok: true, data });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.type === 'goal') {
      const goalsSheet = getGoalsSheet_();
      goalsSheet.appendRow([
        new Date(),
        body.grade || '',
        body.gradeValue !== undefined ? body.gradeValue : ''
      ]);
      return jsonOut_({ ok: true });
    }

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      body.date || '',
      body.grade || '',
      body.gradeValue !== undefined ? body.gradeValue : '',
      body.status || '',
      body.climber || ''
    ]);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
