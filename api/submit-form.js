// api/submit-form.js
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
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

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { name, email, phone, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Initialize Google Sheets
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Get the first sheet or create one if it doesn't exist
    let sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: "Message Registrations" });
    }

    // Set headers if the sheet is empty
    const rows = await sheet.getRows();
    if (rows.length === 0) {
      await sheet.setHeaderRow([
        "Timestamp",
        "Name",
        "Email",
        "Password",
        "Number",
        "Message",
      ]);
    }

    // Add data to Google Sheets
    await sheet.addRow({
      Timestamp: new Date().toLocaleDateString(),
      Name: name,
      Email: email,
      Password: password,
      Number: number,
      Message: message,
    });

    console.log("Form submitted successfully:", {
      name,
      email,
      password,
      number,
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
