const Web3 = require('web3');
const { google } = require('googleapis');

// Initialize Web3 (using BSC RPC node)
const web3 = new Web3('https://bsc-dataseed.binance.org/');

// Retrieve the ABIs from environment variables
const pancakeRouterABI = JSON.parse(process.env.PancakeSwap_ABI);
const bakeryRouterABI = JSON.parse(process.env.BakerySwap_ABI);

// Router contract addresses
const pancakeRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const bakeryRouterAddress = '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F';

// Create router contract instances
const pancakeRouter = new web3.eth.Contract(pancakeRouterABI, pancakeRouterAddress);
const bakeryRouter = new web3.eth.Contract(bakeryRouterABI, bakeryRouterAddress);

// Token addresses
const BNB_TOKEN = '0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD_TOKEN = '0xe9e7cea3dedca5984780bafc599bd69add087d56';

// Google Sheets setup
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_RANGE = 'ArbitrageBotSheet!A2:C'; // Specify range in your Google Sheet

// Function to log data to Google Sheets
async function logDataToGoogleSheet(priceData) {
    try {
        const authClient = await google.auth.getClient({
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_RANGE,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[priceData.timestamp, priceData.pricePancake, priceData.priceBakery]],
            },
        });

        console.log('Data written to Google Sheets:', response.data.updates.updatedCells);
    } catch (sheetsError) {
        console.error('Failed to write data to Google Sheets:', sheetsError);
    }
}

// Fetch prices from PancakeSwap and BakerySwap
async function fetchPrices() {
    const amountIn = web3.utils.toWei('1', 'ether');

    try {
        // Fetch PancakeSwap price
        const pancakeAmounts = await pancakeRouter.methods.getAmountsOut(amountIn, [BNB_TOKEN, BUSD_TOKEN]).call();
        console.log('🥞 PancakeSwap Price:', pancakeAmounts);

        // Fetch BakerySwap price
        const bakeryAmounts = await bakeryRouter.methods.getAmountsOut(amountIn, [BNB_TOKEN, BUSD_TOKEN]).call();
        console.log('🥖 BakerySwap Price:', bakeryAmounts);

        // Prepare data for Google Sheets
        const priceData = {
            timestamp: new Date().toISOString(),
            pricePancake: web3.utils.fromWei(pancakeAmounts[1], 'ether'),
            priceBakery: web3.utils.fromWei(bakeryAmounts[1], 'ether'),
        };

        // Log data to Google Sheets
        await logDataToGoogleSheet(priceData);
    } catch (error) {
        console.error('❌ Error fetching prices:', error);
    }
}

// Test prices and write to Google Sheets
fetchPrices();
