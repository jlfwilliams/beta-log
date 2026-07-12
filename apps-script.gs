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
const PLAN_SHEET_NAME = 'plan';

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

function getPlanSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PLAN_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PLAN_SHEET_NAME);
    sheet.appendRow(['Week','Date','Climb 1','Climb 2','Climb 3','Climb 4','First Climber']);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetAsObjects_(sheet) {
  const tz = Session.getScriptTimeZone();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let cell = row[i];
        // Sheets auto-converts date-looking strings (e.g. "2026-07-01") written via
        // appendRow into real Date cells. Left as a Date object, JSON.stringify turns
        // it into a full timestamp that can drift to the wrong calendar day once the
        // timezone offset is applied, which breaks date-based sorting/display on the
        // client. Normalize it back to a plain yyyy-MM-dd string here at the source.
        if (cell instanceof Date) {
          cell = Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
        }
        obj[String(h).charAt(0).toLowerCase() + String(h).slice(1)] = cell;
      });
      return obj;
    });
}

function readPlanRows_() {
  const sheet = getPlanSheet_();
  const tz = Session.getScriptTimeZone();
  const values = sheet.getDataRange().getValues();
  values.shift(); // drop header row
  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => ({
      week: Number(row[0]),
      date: row[1] instanceof Date ? Utilities.formatDate(row[1], tz, 'yyyy-MM-dd') : row[1],
      climb1: row[2] || '',
      climb2: row[3] || '',
      climb3: row[4] || '',
      climb4: row[5] || '',
      firstClimber: row[6] || ''
    }));
}

function doGet(e) {
  const type = e && e.parameter && e.parameter.type;
  if (type === 'goals') {
    const data = readSheetAsObjects_(getGoalsSheet_());
    return jsonOut_({ ok: true, data });
  }
  if (type === 'plan') {
    return jsonOut_({ ok: true, data: readPlanRows_() });
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
