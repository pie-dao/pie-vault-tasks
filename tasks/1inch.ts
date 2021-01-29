import axios from "axios";
import { parseUnits } from "ethers/lib/utils";
import { task, types } from "hardhat/config";

const baseUrl = "https://api.1inch.exchange/v2.0/swap/";


// TODO set allowance and wait before executing this task
task("get-1inch-swap-tx")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addParam("to", "Address to swap from, the PieVault in most cases")
    .addFlag("log", "log the output")
    .setAction(async (taskArgs, {ethers, run}) => {
        
        const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});
        const buyToken = await run("get-token-address-from-symbol", {symbol: taskArgs.buyToken}); 
    
        // limit slippage to 5%
        const slippage = Math.min(taskArgs.slippage as number, 5);
        const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
    
        const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

        // TODO check out other optional query params
        const callUrl = `?fromTokenAddress=${sellToken}&toTokenAddress=${buyToken}&amount=${sellAmount}&fromAddress=${taskArgs.to}&toAddress=${taskArgs.to}&slippage=${slippage}`;

        const result = await axios.get(`${baseUrl}${callUrl}`);

        console.log(result);
});