import { FoodItem } from '../types';

declare var gapi: any;
declare var google: any;

let tokenClient: any;
let gapiInited = false;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

export const initGoogleServices = async (clientId: string) => {
  return new Promise<void>((resolve, reject) => {
    if (gapiInited) {
      resolve();
      return;
    }

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;

        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // defined at request time
        });

        resolve();
      } catch (err) {
        console.error("Error initializing Google Services:", err);
        reject(err);
      }
    });
  });
};

export const exportToGoogleSheets = async (logs: FoodItem[], goal: number) => {
  if (!gapiInited || !tokenClient) {
    throw new Error("Google Services not initialized. Please check your Client ID.");
  }

  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        console.error("OAuth Error:", resp);
        reject(resp);
        return;
      }
      
      // CRITICAL FIX: Set the access token for the GAPI client
      // This bridges the gap between the new Identity Services (tokenClient) and the GAPI client library
      if (gapi.client) {
        gapi.client.setToken(resp);
      }

      try {
        await createSpreadsheet(logs, goal);
        resolve();
      } catch (err) {
        console.error("Spreadsheet Creation Error:", err);
        reject(err);
      }
    };

    // Request token
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

const createSpreadsheet = async (logs: FoodItem[], goal: number) => {
  // 1. Process Data
  const groupedData: Record<string, any> = {};
  logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString();
    if (!groupedData[date]) {
      groupedData[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, items: 0 };
    }
    groupedData[date].calories += log.calories;
    groupedData[date].protein += log.macros.protein;
    groupedData[date].carbs += log.macros.carbs;
    groupedData[date].fat += log.macros.fat;
    groupedData[date].items += 1;
  });

  const summaryRows = Object.keys(groupedData).map(date => [
    date,
    groupedData[date].calories,
    goal,
    groupedData[date].protein,
    groupedData[date].carbs,
    groupedData[date].fat
  ]);

  // 2. Create Sheet
  const title = `SmartCal Report ${new Date().toLocaleDateString()}`;
  const spreadsheet = await gapi.client.sheets.spreadsheets.create({
    properties: { title },
  });
  
  if (!spreadsheet.result) {
      throw new Error("Failed to create spreadsheet result.");
  }
  
  const spreadsheetId = spreadsheet.result.spreadsheetId;
  const sheetId = spreadsheet.result.sheets[0].properties.sheetId;

  // 3. Construct Data for Cells
  // Summary Table at the top
  const headerRow = ["Date", "Calories Consumed", "Daily Goal", "Protein (g)", "Carbs (g)", "Fat (g)"];
  
  const allData = [
    ["SMARTCAL NUTRITION DASHBOARD"], // A1 Title
    ["Generated on " + new Date().toLocaleString()], // A2 Subtitle
    [], // A3 Spacer
    headerRow, // A4 Headers
    ...summaryRows,
    [], // Spacer
    ["DETAILED LOGS"], // Detailed Header
    ["Time", "Food Item", "Description", "Calories", "P", "C", "F"], // Detailed Columns
  ];

  // Append detailed logs sorted by date
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  sortedLogs.forEach(log => {
    allData.push([
       new Date(log.timestamp).toLocaleDateString() + ' ' + new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
       log.name,
       log.quantityStr,
       log.calories,
       log.macros.protein,
       log.macros.carbs,
       log.macros.fat
    ]);
  });

  // 4. Batch Update (Write Data, Format, Add Charts)
  const requests: any[] = [];

  // Write All Data
  requests.push({
    updateCells: {
      start: { sheetId, rowIndex: 0, columnIndex: 0 },
      rows: allData.map(row => ({
        values: row.map(cell => ({
          userEnteredValue: typeof cell === 'number' ? { numberValue: cell } : { stringValue: String(cell) }
        }))
      })),
      fields: 'userEnteredValue'
    }
  });

  // Formatting: Title (Row 0)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
      cell: {
        userEnteredFormat: {
          textFormat: { fontSize: 18, bold: true, foregroundColor: { red: 0.06, green: 0.72, blue: 0.5 } }, // Emerald
        }
      },
      fields: 'userEnteredFormat(textFormat)'
    }
  });

  // Formatting: Header Row (Row 3 - 0-indexed)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 6 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.12, green: 0.16, blue: 0.23 }, // Slate 800
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER'
        }
      },
      fields: 'userEnteredFormat'
    }
  });

  // Formatting: Detailed Header Row
  const detailedHeaderIndex = 3 + summaryRows.length + 2;
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: detailedHeaderIndex, endRowIndex: detailedHeaderIndex + 1, startColumnIndex: 0, endColumnIndex: 7 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.2, green: 0.25, blue: 0.35 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
        }
      },
      fields: 'userEnteredFormat'
    }
  });

  // Chart 1: Calories vs Goal (Column Chart)
  // Data Range: Rows 4 to 4+summaryRows.length. Cols 0 (Date), 1 (Cals), 2 (Goal)
  if (summaryRows.length > 0) {
      requests.push({
        addChart: {
          chart: {
            spec: {
              title: "Daily Calorie Intake vs Goal",
              basicChart: {
                chartType: "COLUMN",
                legendPosition: "BOTTOM_LEGEND",
                axis: [
                  { position: "BOTTOM_AXIS", title: "Date" },
                  { position: "LEFT_AXIS", title: "Calories" }
                ],
                domains: [{ domain: { sourceRange: { sources: [{ sheetId, startRowIndex: 4, endRowIndex: 4 + summaryRows.length, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
                series: [
                  { series: { sourceRange: { sources: [{ sheetId, startRowIndex: 4, endRowIndex: 4 + summaryRows.length, startColumnIndex: 1, endColumnIndex: 2 }] } }, targetAxis: "LEFT_AXIS" },
                  { series: { sourceRange: { sources: [{ sheetId, startRowIndex: 4, endRowIndex: 4 + summaryRows.length, startColumnIndex: 2, endColumnIndex: 3 }] } }, targetAxis: "LEFT_AXIS" }
                ],
                headerCount: 0
              }
            },
            position: {
              overlayPosition: {
                anchorCell: { sheetId, rowIndex: 1, columnIndex: 7 }, // Place chart to the right
                widthPixels: 600,
                heightPixels: 350
              }
            }
          }
        }
      });
  }

  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests }
  });

  // Open the sheet
  window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
};