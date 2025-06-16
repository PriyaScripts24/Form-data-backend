// api/submissions.js
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Google Sheets setup
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export default async function handler(req, res) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Initialize Google Sheets
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      return res.status(200).json({
        success: true,
        submissions: [],
      });
    }

    const rows = await sheet.getRows();
    const submissions = rows.map((row) => ({
      timestamp: row.Timestamp,
      name: row.Name,
      email: row.Email,
      phone: row.Phone,
      message: row.Message,
    }));

    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching submissions",
    });
  }
}
