require("dotenv").config();
const express = require("express");
const Web3 = require("web3");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to Binance Smart Chain
const web3 = new Web3("https://bsc-dataseed.binance.org/");

// PancakeSwap & BakerySwap Routers
const pancakeRouter = new web3.eth.Contract(
    require("./UniswapV2RouterABI.json"),
    "0x10ED43C718714eb63d5aA57B78B54704E256024E" // PancakeSwap Router Address (Mainnet)
);
const bakeryRouter = new web3.eth.Contract(
    require("./UniswapV2RouterABI.json"),
    "0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F" // BakerySwap Router Address (Mainnet)
);

// 🔹 API: Fetch Token Prices (Only for Display in Bubble)
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

        res.json({
            pricePancake: web3.utils.fromWei(pricePancake[1], "ether"),
            priceBakery: web3.utils.fromWei(priceBakery[1], "ether")
        });

    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
