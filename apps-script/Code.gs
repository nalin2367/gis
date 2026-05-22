const DATABASE_TITLE = 'Guru Insurance Database';
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

const TABLES = {
  customers: {
    sheetName: 'Customers',
    headers: ['id', 'name', 'email', 'phone', 'joinedDate', 'status'],
    numberFields: [],
  },
  policies: {
    sheetName: 'Policies',
    headers: [
      'id',
      'customerId',
      'type',
      'coverageAmount',
      'premium',
      'startDate',
      'endDate',
      'status',
      'registrationNo',
      'engineNo',
      'chassisNo',
      'makeModel',
      'yearOfMfg',
      'cubicCapacity',
      'seating',
    ],
    numberFields: ['coverageAmount', 'premium'],
  },
  claims: {
    sheetName: 'Claims',
    headers: [
      'id',
      'policyId',
      'customerId',
      'dateFiled',
      'amountClaimed',
      'amountApproved',
      'status',
      'description',
    ],
    numberFields: ['amountClaimed', 'amountApproved'],
  },
  invoices: {
    sheetName: 'Invoices',
    headers: ['id', 'customerId', 'policyId', 'amount', 'dueDate', 'status', 'issueDate'],
    numberFields: ['amount'],
  },
};

function setup() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(TABLES).forEach((resource) => ensureTable_(spreadsheet, resource));

  const message = `Guru Insurance database ready: ${spreadsheet.getUrl()}`;
  Logger.log(message);

  return {
    status: 'ok',
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
  };
}

function doGet(e) {
  try {
    const path = getRequestPath_(e);

    if (!path || path === 'health') {
      return jsonOutput_({
        status: 'ok',
        backend: 'google-apps-script',
      });
    }

    const resource = path.split('/')[0];
    assertResource_(resource);

    return jsonOutput_(readRows_(resource));
  } catch (error) {
    return jsonError_(error);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const path = getRequestPath_(e);
    const parts = path.split('/').filter(Boolean);
    const resource = parts[0];
    const action = parts[1];

    assertResource_(resource);
    if (action !== 'sync') {
      throw new Error('Unsupported action. Use /{resource}/sync.');
    }

    const rows = parsePostRows_(e);
    if (!Array.isArray(rows)) {
      throw new Error('Payload must be an array.');
    }

    lock.waitLock(30000);
    syncRows_(resource, rows);

    return jsonOutput_({
      status: 'ok',
      resource,
      count: rows.length,
    });
  } catch (error) {
    return jsonError_(error);
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // Lock was not acquired or was already released.
    }
  }
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const configuredId = properties.getProperty(SPREADSHEET_ID_PROPERTY);

  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const spreadsheet = activeSpreadsheet || SpreadsheetApp.create(DATABASE_TITLE);
  properties.setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());

  return spreadsheet;
}

function ensureTable_(spreadsheet, resource) {
  const config = TABLES[resource];
  let sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.sheetName);
  }

  const existingHeaders = getExistingHeaders_(sheet);
  if (existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
  } else {
    const missingHeaders = config.headers.filter((header) => !existingHeaders.includes(header));
    if (missingHeaders.length > 0) {
      sheet
        .getRange(1, existingHeaders.length + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
    }
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function getExistingHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];

  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map((header) => String(header || '').trim())
    .filter(Boolean);
}

function readRows_(resource) {
  const spreadsheet = getSpreadsheet_();
  const sheet = ensureTable_(spreadsheet, resource);
  const config = TABLES[resource];
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, config.headers.length).getValues();

  return values
    .filter((row) => row.some((value) => value !== '' && value !== null))
    .map((row) => rowToRecord_(row, config));
}

function syncRows_(resource, rows) {
  const spreadsheet = getSpreadsheet_();
  const sheet = ensureTable_(spreadsheet, resource);
  const config = TABLES[resource];
  const values = [config.headers].concat(
    rows
      .filter((row) => row && row.id)
      .map((row) => config.headers.map((header) => normalizeWriteValue_(row[header], header, config)))
  );

  sheet.clearContents();
  sheet.getRange(1, 1, values.length, config.headers.length).setValues(values);
  sheet.setFrozenRows(1);
}

function rowToRecord_(row, config) {
  return config.headers.reduce((record, header, index) => {
    const value = row[index];
    const coerced = normalizeReadValue_(value, header, config);

    if (coerced !== undefined) {
      record[header] = coerced;
    }

    return record;
  }, {});
}

function normalizeReadValue_(value, header, config) {
  if (value === '' || value === null || value === undefined) {
    return config.numberFields.includes(header) && header !== 'amountApproved' ? 0 : undefined;
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (config.numberFields.includes(header)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return String(value);
}

function normalizeWriteValue_(value, header, config) {
  if (value === null || value === undefined || value === '') {
    return config.numberFields.includes(header) && header !== 'amountApproved' ? 0 : '';
  }

  if (config.numberFields.includes(header)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return String(value);
}

function parsePostRows_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return [];
  }

  return JSON.parse(e.postData.contents);
}

function getRequestPath_(e) {
  const parameterPath = e && e.parameter && e.parameter.resource;
  const pathInfo = e && e.pathInfo;
  return String(parameterPath || pathInfo || '').replace(/^\/+|\/+$/g, '');
}

function assertResource_(resource) {
  if (!resource || !TABLES[resource]) {
    throw new Error(`Unknown resource: ${resource || '(empty)'}`);
  }
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(error) {
  const message = error && error.message ? error.message : String(error);
  console.error(message);

  return jsonOutput_({
    status: 'error',
    message,
  });
}
