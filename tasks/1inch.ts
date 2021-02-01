import axios from "axios";
import { parseUnits } from "ethers/lib/utils";
import { task, types } from "hardhat/config";

const baseUrl = "https://api.1inch.exchange/v2.0/swap/";
const ONE_INCH = "0x111111125434b319222CdBf8C261674aDB56F3ae";


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
        const callUrl = `?fromTokenAddress=${sellToken}&toTokenAddress=${buyToken}&amount=${sellAmount}&fromAddress=${taskArgs.to}&toAddress=${taskArgs.to}&slippage=${slippage}&disableEstimate=true`;

        const result = await axios.get(`${baseUrl}${callUrl}`);

        const returnData = {
            to: result.data.tx.to,
            data: result.data.tx.data,
            value: 0
        }

        taskArgs.log && console.log(returnData);

        return returnData;
});

task("get-1inch-swap-execute-txs")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addParam("to", "Address to swap from, the PieVault in most cases")
    .addFlag("log", "log the output")
    .setAction(async (taskArgs, {ethers, run}) => {
        const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});
        const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
        const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

        const transactions:any[] = [];

        //reset approval
        const approval1Tx = await run("get-approval-data", {token: sellToken, spender: ONE_INCH, amount: "0"});
        transactions.push(approval1Tx);

        //set approval
        const approval2Tx = await run("get-approval-data", {token: sellToken, spender: ONE_INCH, amount: sellAmount.toString()});
        transactions.push(approval2Tx);

        //swap
        const swapTx = await run("get-1inch-swap-tx", {...taskArgs, log: false});
        transactions.push(swapTx);

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});




// TODO Create complete task