require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const Web3 = require('web3');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// ✅ BSC Node Provider
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(new Web3.providers.HttpProvider(BSC_RPC));

// ✅ PancakeSwap & BakerySwap Router Addresses
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const BAKERY_ROUTER = "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F";

// ✅ Convert addresses to checksum format
function getChecksumAddress(address) {
    return web3.utils.toChecksumAddress(address); // Web3.js method for proper checksum
}

// ✅ Load ABIs from Environment Variables
let pancakeRouter, bakeryRouter;

try {
    const pancakeABI = JSON.parse(process.env.PancakeSwapABI || "[]");
    const bakeryABI = JSON.parse(process.env.BakerySwapABI || "[]");

    if (pancakeABI.length === 0 || bakeryABI.length === 0) {
        throw new Error("Missing or invalid ABIs in environment variables.");
    }

    // ✅ Initialize Contracts
    pancakeRouter = new web3.eth.Contract(pancakeABI, PANCAKE_ROUTER);
    bakeryRouter = new web3.eth.Contract(bakeryABI, BAKERY_ROUTER);

    console.log("✅ PancakeSwap & BakerySwap contracts initialized!");
} catch (error) {
    console.error("❌ Failed to load ABIs:", error.message);
    process.exit(1); // Stop execution if ABIs are missing
}

// ✅ Google Sheets Setup
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    console.error("❌ Missing SPREADSHEET_ID environment variable.");
    process.exit(1); // Stop execution if SPREADSHEET_ID is missing
}

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ✅ Fetch BNB Price from PancakeSwap & BakerySwap
async function fetchPrices(tokenIn, tokenOut) {
    try {
        const amountIn = web3.utils.toWei("1", "ether"); // 1 BNB

        // 🥞 Fetch from PancakeSwap
        const pancakeAmounts = await pancakeRouter.methods
            .getAmountsOut(amountIn, [tokenIn, tokenOut])
            .call();
        const pricePancake = web3.utils.fromWei(pancakeAmounts[1], "ether");

        // 🥖 Fetch from BakerySwap
        const bakeryAmounts = await bakeryRouter.methods
            .getAmountsOut(amountIn, [tokenIn, tokenOut])
            .call();
        const priceBakery = web3.utils.fromWei(bakeryAmounts[1], "ether");

        console.log(`🥞 PancakeSwap: ${pricePancake} ${tokenOut}`);
        console.log(`🥖 BakerySwap: ${priceBakery} ${tokenOut}`);

        return { pricePancake, priceBakery };
    } catch (error) {
        console.error("❌ Failed to fetch prices:", error);
        return { pricePancake: null, priceBakery: null };
    }
}

// ✅ Log Data to Google Sheets
async function logDataToGoogleSheet(priceData, tokenIn, tokenOut, res) {
    try {
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const timestamp = new Date().toISOString();

        const range = "Sheet1!A:E"; // Ensure this matches your sheet name and columns
        console.log("📝 Using range:", range);

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [
                    [
                        timestamp,
                        tokenIn,
                        tokenOut,
                        priceData.pricePancake,
                        priceData.priceBakery
                    ]
                ]
            }
        });

        console.log("✅ Data logged:", response.data);
        res.status(200).json({ message: "Price data logged successfully." });

    } catch (error) {
        console.error("❌ Failed to write to Google Sheets:", error);
        res.status(500).json({ error: "Failed to write data to Google Sheets.", details: error.message });
    }
}

// ✅ API Route to Fetch Prices & Log to Google Sheets
app.post('/log-price-data', async (req, res) => {
    console.log("📩 Received request to fetch prices...");

    const { tokenIn, tokenOut } = req.body; // Expecting tokenIn and tokenOut in the request body

    if (!tokenIn || !tokenOut) {
        return res.status(400).json({ error: "Missing tokenIn or tokenOut in the request body." });
    }

    const priceData = await fetchPrices(tokenIn, tokenOut);

    if (!priceData.pricePancake || !priceData.priceBakery) {
        return res.status(500).json({ error: "Failed to fetch prices." });
    }

    await logDataToGoogleSheet(priceData, tokenIn, tokenOut, res);
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
