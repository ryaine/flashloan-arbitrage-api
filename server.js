const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const fetch = require('node-fetch'); // Ensure this is installed

// ✅ BSC Node Provider (Use Infura, QuickNode, or Public RPC)
const BSC_RPC = "https://bsc-dataseed.binance.org/";
const web3 = new Web3(new Web3.providers.HttpProvider(BSC_RPC));

// ✅ PancakeSwap & BakerySwap Router Addresses
const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // Mainnet
const BAKERY_ROUTER = "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F"; // Mainnet

// ✅ BNB Token Address (Example: BNB/BUSD Pair)
const BNB_TOKEN = "0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD_TOKEN = "0xe9e7cea3dedca5984780bafc599bd69add087d56"; 

// ✅ ABI for `getAmountsOut` (Minimal ERC20 ABI for price fetching)
const ROUTER_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "amountIn", "type": "uint256"}, {"name": "path", "type": "address[]"}],
        "name": "getAmountsOut",
        "outputs": [{"name": "amounts", "type": "uint256[]"}],
        "type": "function"
    }
];

// ABI URLs for PancakeSwap and BakerySwap hosted on GitHub
const PANCAKE_ABI_URL = 'https://raw.githubusercontent.com/ryaine/flashloan-arbitrage-api/main/PancakeSwapABI.json';
const BAKERY_ABI_URL = 'https://raw.githubusercontent.com/ryaine/flashloan-arbitrage-api/main/BakerySwapABI.json';

// Function to fetch ABI from GitHub URL
async function fetchABI(url) {
    try {
        const response = await fetch(url);
        const abi = await response.json();
        return abi;
    } catch (error) {
        console.error('Failed to fetch ABI from GitHub:', error);
        return null;
    }
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(bodyParser.json());

const SPREADSHEET_ID = '1K7hglTFtXSb3KMJYlEyzZuoXURmj2X_DVaTpTfpqNBE';

// ✅ Authenticate Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ✅ Function to fetch BNB price from PancakeSwap & BakerySwap
async function fetchPrices() {
    try {
        const amountIn = web3.utils.toWei("1", "ether"); // 1 BNB

        // 🥞 Fetch Price from PancakeSwap
        const pancakeAmounts = await pancakeRouter.methods
            .getAmountsOut(amountIn, [BNB_TOKEN, BUSD_TOKEN])
            .call();
        const pricePancake = web3.utils.fromWei(pancakeAmounts[1], "ether");

        // 🥖 Fetch Price from BakerySwap
        const bakeryAmounts = await bakeryRouter.methods
            .getAmountsOut(amountIn, [BNB_TOKEN, BUSD_TOKEN])
            .call();
        const priceBakery = web3.utils.fromWei(bakeryAmounts[1], "ether");

        console.log(`🥞 PancakeSwap: ${pricePancake} BUSD`);
        console.log(`🥖 BakerySwap: ${priceBakery} BUSD`);

        return { pricePancake, priceBakery };
    } catch (error) {
        console.error("❌ Failed to fetch prices:", error);
        return { pricePancake: null, priceBakery: null };
    }
}

// ✅ Function to log real-time data to Google Sheets
async function logDataToGoogleSheet(priceData, res) {
    try {
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const timestamp = new Date().toISOString();

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: "Sheet1!A:C",
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS",
            requestBody: {
                values: [[timestamp, priceData.pricePancake, priceData.priceBakery]]
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
    
    const pancakeABI = await fetchABI(PANCAKE_ABI_URL);
    const bakeryABI = await fetchABI(BAKERY_ABI_URL);

    if (!pancakeABI || !bakeryABI) {
        return res.status(500).json({ error: "Failed to load ABIs from GitHub." });
    }

    // Initialize PancakeSwap and BakerySwap Router Contracts
    const pancakeRouter = new web3.eth.Contract(pancakeABI, PANCAKE_ROUTER);
    const bakeryRouter = new web3.eth.Contract(bakeryABI, BAKERY_ROUTER);

    const priceData = await fetchPrices();
    
    if (!priceData.pricePancake || !priceData.priceBakery) {
        return res.status(500).json({ error: "Failed to fetch prices." });
    }

    await logDataToGoogleSheet(priceData, res);
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
