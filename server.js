const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

const SPREADSHEET_ID = '1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE';

// ✅ Fix: Use correct credentials & scope
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function logDataToGoogleSheet(priceData, res) {
    try {
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        console.log("✅ Connected to Google Sheets API");

        // ✅ Fix: Use the correct sheet name
        const range = "Sheet1!A:C"; // Change to your actual sheet name

        // ✅ Debugging: Print sheet name
        console.log("📝 Writing to range:", range);

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]]
            }
        });

        console.log("✅ Data written to Google Sheets:", response.data);
        res.status(200).json({ message: "Data written to Google Sheets." });

    } catch (error) {
        console.error("❌ Failed to write to Google Sheets:", error);

        if (error.response) {
            console.error("❗ GaxiosError Details:", error.response.data);
        }

        res.status(500).json({ error: "Failed to write data to Google Sheets.", details: error.message });
    }
}

app.post('/log-price-data', (req, res) => {
    const priceData = req.body;

    if (!priceData.timestamp || !priceData.pricePancake || !priceData.priceBakery) {
        console.log("❌ Invalid data received:", priceData);
        return res.status(400).json({ error: "Invalid data. Please provide timestamp, pricePancake, and priceBakery." });
    }

    console.log("📩 Received price data:", priceData);
    logDataToGoogleSheet(priceData, res);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

