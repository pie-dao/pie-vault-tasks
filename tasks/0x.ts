import { task, types } from "hardhat/config";

import axios from "axios";
import { parseUnits } from "ethers/lib/utils";

const baseUrl = "https://api.0x.org/swap/v1/";
const zXTransferProxy = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";


task("get-matcha-order-tx")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addFlag("log", "log the output")
    .setAction(async(taskArgs, { run }) => {
    
    const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});
    const buyToken = await run("get-token-address-from-symbol", {symbol: taskArgs.buyToken}); 
    
    // limit slippage to 5%
    const slippage = Math.min(taskArgs.slippage as number, 5);
    const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
    
    const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

    const callUrl = `${baseUrl}quote?sellAmount=${sellAmount}&buyToken=${buyToken}&sellToken=${sellToken}&slippagePercentage=${slippage / 100}`;
    
    const result = await axios.get(callUrl);
    const quote = result.data;
    
    taskArgs.log && console.log(quote);

    //TODO create type
    const returnData = {
        to: quote.to,
        data: quote.data,
        value: 0
    }

    taskArgs.log && console.log(returnData);

    return returnData;
});

task("get-matcha-order-execute-txs")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addFlag("log", "log the output")
    .setAction(async(taskArgs, { run }) => {
        
        const transactions: any[] = [];

        const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});

        const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
        const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

        //reset approval
        const approval1Tx = await run("get-approval-data", {token: sellToken, spender: zXTransferProxy, amount: "0"});
        transactions.push(approval1Tx);

        //set approval
        const approval2Tx = await run("get-approval-data", {token: sellToken, spender: zXTransferProxy, amount: sellAmount.toString()});
        transactions.push(approval2Tx);

        //swap
        const swapTx = await run("get-matcha-order-tx", {...taskArgs, log: false});
        transactions.push(swapTx);

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});
