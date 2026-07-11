/**
 * Beta Log — Apps Script backend
 *
 * Setup:
 * 1. Create a Google Sheet. Add a sheet (tab) named "Climbs" with this header row in row 1:
 *    Timestamp | Date | Discipline | Grade | GradeValue | Status | Attempts | Location | Notes
 * 2. In the Sheet, go to Extensions > Apps Script.
 * 3. Delete any starter code and paste this whole file in.
 * 4. (Optional) Set SECRET below to any string, then enter the same string in the app's Settings tab.
 *    This is a very light deterrent, not real security — anyone with the URL can still read your data.
 * 5. Click Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the deployment URL (ends in /exec) into the app's Settings tab.
 */

const SHEET_NAME = 'Climbs';
const SECRET = ''; // optional shared secret, leave blank to disable the check

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp','Date','Discipline','Grade','GradeValue','Status','Attempts','Location','Notes']);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const data = values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[String(h).charAt(0).toLowerCase() + String(h).slice(1)] = row[i]; });
      return obj;
    });
  return jsonOut_({ ok: true, data });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SECRET && body.secret !== SECRET) {
      return jsonOut_({ ok: false, error: 'Invalid secret.' });
    }

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      body.date || '',
      body.discipline || '',
      body.grade || '',
      body.gradeValue !== undefined ? body.gradeValue : '',
      body.status || '',
      body.attempts || '',
      body.location || '',
      body.notes || ''
    ]);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
