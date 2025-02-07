const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

const SPREADSHEET_ID = '1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE';

// Read credentials from environment variable
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function logDataToGoogleSheet(priceData, res) {
    try {
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        console.log("Authenticated with Google Sheets API");

        const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "ArbitrageBotSheet!A:C", // Append to the next available row
    valueInputOption: "RAW",
    requestBody: {
        values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]]
    }
});
        

        console.log("Data written to Google Sheets:", response.data.updates.updatedCells);
        res.status(200).json({ message: "Data written to Google Sheets." });
    } catch (sheetsError) {
        console.error("Failed to write data to Google Sheets:", sheetsError);
        res.status(500).json({ error: "Failed to write data to Google Sheets.", details: sheetsError.message });
    }
}

app.post('/log-price-data', (req, res) => {
    const priceData = req.body;

    if (!priceData.timestamp || !priceData.pricePancake || !priceData.priceBakery) {
        return res.status(400).json({ error: "Invalid data. Please provide timestamp, pricePancake, and priceBakery." });
    }

    console.log("Received price data:", priceData);
    logDataToGoogleSheet(priceData, res);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
