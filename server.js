const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

// Replace with your actual spreadsheet ID
const SPREADSHEET_ID = '1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE';

// Read credentials from environment variable
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), // Ensure this is set in Render.com
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Function to log data to Google Sheet
async function logDataToGoogleSheet(priceData, res) {
    try {
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        console.log("✅ Authenticated with Google Sheets API");

        // Define the range explicitly
        const range = "ArbitrageBotSheet!A2:C"; // Ensure this matches your sheet name and range
        console.log("📝 Using range:", range);

        // Append data to Google Sheets
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS", // Ensures data is appended correctly
            requestBody: {
                values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]]
            }
        });

        console.log("✅ Data written to Google Sheets:", response.data.updates.updatedCells);
        res.status(200).json({ message: "Data written to Google Sheets." });
    } catch (sheetsError) {
        console.error("❌ Failed to write data to Google Sheets:", sheetsError);
        res.status(500).json({ error: "Failed to write data to Google Sheets.", details: sheetsError.message });
    }
}

// API endpoint to receive price data and log it to Google Sheets
app.post('/log-price-data', (req, res) => {
    const priceData = req.body;

    // Validate input
    if (!priceData.timestamp || !priceData.pricePancake || !priceData.priceBakery) {
        console.log("❌ Invalid data received:", priceData);
        return res.status(400).json({ error: "Invalid data. Please provide timestamp, pricePancake, and priceBakery." });
    }

    console.log("📩 Received price data:", priceData);
    logDataToGoogleSheet(priceData, res);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
