import { parseUnits } from "ethers/lib/utils";
import { internalTask, task, types } from "hardhat/config";
import { UniRouterFactory } from "../types/ethers-contracts/UniRouterContract";

const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const UNI_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

task("get-uni-like-swap-tx")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "Max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addParam("router", "Address of the router")
    .addParam("to", "Address to swap to, PieVault address in most cases")
    .addOptionalParam("deadline", "timestamp when the order expires")
    .addFlag("log", "log the data")
    .setAction(async(taskArgs, { ethers, run }) => {
        const signers = await ethers.getSigners();
        const router = await UniRouterFactory.connect(taskArgs.router, signers[0]);

        const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});
        const buyToken = await run("get-token-address-from-symbol", {symbol: taskArgs.buyToken}); 

        // limit slippage to 5%
        const slippage = Math.min(taskArgs.slippage as number, 5);
        const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
    
        const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

        let route: string[];

        
        if(sellToken.toLowerCase() == WETH ) { //swapping from weth
            route = [WETH, buyToken];
        } else if(buyToken.toLowerCase() == WETH) { //swapping to weth
            route = [sellToken, WETH];
        } else { // swapping two non WETH tokens through WETH
            route = [sellToken, WETH, buyToken];
        }

        let deadline;

        if(taskArgs.deadline) {
            deadline = taskArgs.deadline;
        } else {
            deadline = Math.round(Date.now() / 1000) + 60 * 15;
        }

        const estimatedAmounts = await router.getAmountsOut(sellAmount, route);
        const estimatedAmount = estimatedAmounts[estimatedAmounts.length -1];

        const minAmount = estimatedAmount.mul(100 - slippage).div(100);
       
        const swapTx = await router.populateTransaction.swapExactTokensForTokens(sellAmount, minAmount, route, taskArgs.to, deadline);

        const returnData = {
            to: swapTx.to,
            data: swapTx.data,
            value: 0,
        }

        taskArgs.log && console.log(returnData);

        return returnData;
});

task("get-uni-like-execute-swap-txs")
    .addParam("sellToken", "Token to sell")
    .addParam("buyToken", "Token to buy")
    .addParam("sellAmount", "Amount of token to sell")
    .addParam("slippage", "Max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addParam("router", "Address of the router")
    .addParam("to", "Address to swap to, PieVault address in most cases")
    .addOptionalParam("deadline", "timestamp when the order expires")
    .addFlag("log", "log the data")
    .setAction(async(taskArgs, { ethers, run }) => {

        const transactions: any[] = [];

        const sellToken = await run("get-token-address-from-symbol", {symbol: taskArgs.sellToken});

        const decimals = await run("get-token-decimals", {tokenAddress: sellToken});
        const sellAmount = parseUnits(taskArgs.sellAmount, decimals);

        //reset approval
        const approval1Tx = await run("get-approval-data", {token: sellToken, spender: taskArgs.router, amount: "0"});
        transactions.push(approval1Tx);

        //set approval
        const approval2Tx = await run("get-approval-data", {token: sellToken, spender: taskArgs.router, amount: sellAmount.toString()});
        transactions.push(approval2Tx);

        // swap
        const swapTx = await run("get-uni-like-swap-tx", {...taskArgs, log: false});
        transactions.push(swapTx);

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});