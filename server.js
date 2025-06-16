// server.js
const express = require("express");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets setup
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

// Initialize Google Sheets connection
const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Initialize the sheet
let doc;
let sheet;

const initializeSheet = async () => {
  try {
    doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    // Get the first sheet or create one if it doesn't exist
    sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ title: "Course Registrations" });
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

    console.log("Google Sheets initialized successfully");
  } catch (error) {
    console.error("Error initializing Google Sheets:", error);
  }
};

// API endpoint to submit form data
app.post("/api/submit-form", async (req, res) => {
  try {
    const { name, email, password, number, message } = req.body;

    // Validate required fields
    if (!name || !email || !password || !number || !message) {
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

    // Add data to Google Sheets
    await sheet.addRow({
      Timestamp: new Date().toISOString(),
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

    res.json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Get all submissions (optional endpoint for viewing data)
app.get("/api/submissions", async (req, res) => {
  try {
    const rows = await sheet.getRows();
    const submissions = rows.map((row) => ({
      timestamp: row.Timestamp,
      name: row.Name,
      email: row.Email,
      password: row.password,
      number: row.number,
      message: row.message,
    }));

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching submissions",
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeSheet();
});

module.exports = app;
