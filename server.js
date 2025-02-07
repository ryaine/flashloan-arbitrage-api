const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Replace with your actual spreadsheet ID
const SPREADSHEET_ID = '1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE';

// Authentication setup
const auth = new google.auth.GoogleAuth({
    keyFile: 'yourServiceAccountKey.json', // Path to your service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Function to log data to Google Sheet
async function logDataToGoogleSheet(priceData, res) {
    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Log received data for debugging
        console.log("Received price data:", priceData);

        // Append data to Google Sheets
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "ArbitrageBotSheet!A:C", // Ensure this sheet name matches exactly
            valueInputOption: "RAW",
            requestBody: {
                values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]]
            }
        });

        console.log("Data written to Google Sheets:", response.data.updates.updatedCells);
        res.status(200).json({ message: "Data written to Google Sheets." });
    } catch (sheetsError) {
        console.error("Failed to write data to Google Sheets:", sheetsError.response ? sheetsError.response.data : sheetsError);
        res.status(500).json({ error: "Failed to write data to Google Sheets." });
    }
}

// Endpoint to receive price data and log it
app.post('/log-price-data', (req, res) => {
    const priceData = req.body; // Expecting JSON body with timestamp, pricePancake, priceBakery

    // Validate input
    if (!priceData.timestamp || !priceData.pricePancake || !priceData.priceBakery) {
        return res.status(400).json({ error: "Invalid data. Please provide timestamp, pricePancake, and priceBakery." });
    }

    logDataToGoogleSheet(priceData, res);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
