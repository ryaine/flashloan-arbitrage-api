const express = require("express");
const Web3 = require("web3");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to Binance Smart Chain
const web3 = new Web3("https://bsc-dataseed.binance.org/");

// PancakeSwap & BakerySwap Routers
const pancakeRouter = new web3.eth.Contract(
    require("./PancakeSwapABI.json"),  // Ensure this file exists and is correct
    "0x10ED43C718714eb63d5aA57B78B54704E256024E"
);

const bakeryRouter = new web3.eth.Contract(
    require("./BakerySwapABI.json"),  // Ensure this file exists and is correct
    "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F"
);

// Google Sheets Setup
const auth = new google.auth.GoogleAuth({
    keyFile: "RevGoogleSheetAPI.json", // Ensure this file exists and is correct
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE"; // Replace with your actual sheet ID

// 🔹 API: Fetch Token Prices & Log to Google Sheets
app.get("/fetch-prices", async (req, res) => {
    try {
        const { tokenIn, tokenOut } = req.query;

        if (!tokenIn || !tokenOut) {
            return res.status(400).json({ error: "Missing tokenIn or tokenOut." });
        }

        const amountIn = web3.utils.toWei("1", "ether"); // Fetch price for 1 token

        // Get Prices
        const pricePancake = await pancakeRouter.methods.getAmountsOut(amountIn, [tokenIn, tokenOut]).call();
        const priceBakery = await bakeryRouter.methods.getAmountsOut(amountIn, [tokenIn, tokenOut]).call();

        const priceData = {
            pricePancake: web3.utils.fromWei(pricePancake[1], "ether"),
            priceBakery: web3.utils.fromWei(priceBakery[1], "ether"),
            timestamp: new Date().toISOString()
        };

        console.log("Fetched Prices:", priceData);

        // Save to Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "ArbitrageBotSheet!A:C", // Column A: Timestamp, B: PancakeSwap Price, C: BakerySwap Price
            valueInputOption: "RAW",
            requestBody: { values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]] }
        });

        console.log("Data written to Google Sheets");

        res.json(priceData);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.toString() });
    }
});

// Start Server
const PORT = 5000; // Hardcoded port since there's no .env file
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
