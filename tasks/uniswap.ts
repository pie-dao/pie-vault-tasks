import { parseUnits } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { UniRouterFactory } from "../types/ethers-contracts/UniRouterContract";
import { IMasterChefFactory } from "../types/ethers-contracts/IMasterChefContract";
import { BigNumber } from "@ethersproject/bignumber";
import { IERC20Factory } from "../types/ethers-contracts/IERC20Contract";

const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const UNI_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const SUSHI_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';
export const SUSHI_MASTERCHEF = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';

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
        const buyToken = await run("get-token-address-from-symbol", {symbol: taskArgs.buyToken})

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

        //token update
        // const updateTx = await run("get-update-tokens-tx", {pie: taskArgs.pie, tokens: [sellToken, buyToken]});
        // transactions.push(updateTx);

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});


task("get-uni-like-join-pool-txs")
    .addParam("tokenA", "One of the token to join with")
    .addParam("tokenB", "One of the token to join with")
    .addParam("tokenAAmount", "Token A amount") // Desired amount
    .addParam("tokenBAmount", "Token B amount") // Desired amount
    .addParam("slippage", "Max allowed slippage in percents 1 == 1% max slippage", 1.0, types.float)
    .addParam("router", "Address of the router")
    .addParam("to", "Address to swap to, PieVault address in most cases")
    .addOptionalParam("deadline", "timestamp when the order expires")
    .addFlag("log", "log the data")
    .addFlag("shouldReset", "should reset transactions")
    .setAction(async(taskArgs, { ethers, run }) => {
        const transactions: any[] = [];

        const tokenA = await run("get-token-address-from-symbol", {symbol: taskArgs.tokenA});
        const tokenB = await run("get-token-address-from-symbol", {symbol: taskArgs.tokenB})

        const tokenAdecimals = await run("get-token-decimals", {tokenAddress: tokenA});
        const tokenBdecimals = await run("get-token-decimals", {tokenAddress: tokenB});

        const tokenAAmount = parseUnits(taskArgs.tokenAAmount, tokenAdecimals);
        const tokenBAmount = parseUnits(taskArgs.tokenBAmount, tokenBdecimals);

        if(taskArgs.shouldReset) {
            //reset approval
            const approval1Tx = await run("get-approval-data", {token: tokenA, spender: taskArgs.router, amount: "0"});
            transactions.push(approval1Tx);
            
            const approval2Tx = await run("get-approval-data", {token: tokenB, spender: taskArgs.router, amount: "0"});
            transactions.push(approval2Tx);
        }
        
        const signers = await ethers.getSigners();
        const router = await UniRouterFactory.connect(taskArgs.router, signers[0]);

        // limit slippage to 5%
        const slippage = Math.min(taskArgs.slippage as number, 5);

        //set approval
        const approvalTokenA = await run("get-approval-data", {token: tokenA, spender: taskArgs.router, amount: tokenAAmount.toString()});
        const approvalTokenB = await run("get-approval-data", {token: tokenB, spender: taskArgs.router, amount: tokenBAmount.toString()});

        transactions.push(approvalTokenA);
        transactions.push(approvalTokenB);

        // Calculate min amount
        // Bounds the extent to which the B/A price can go up before the transaction reverts. Must be <= amountADesired.
        const tokenAminAmount = tokenAAmount.mul(100 - slippage).div(100);
        const tokenBminAmount = tokenBAmount.mul(100 - slippage).div(100);


        // deadline
        let deadline;

        if(taskArgs.deadline) {
            deadline = taskArgs.deadline;
        } else {
            deadline = Math.round(Date.now() / 1000) + 60 * 15;
        }

        // join pool with addLiquidity
        const addLiquidityTx = await router.populateTransaction.addLiquidity(
            tokenA, 
            tokenB, 
            tokenAAmount, 
            tokenBAmount, 
            tokenAminAmount, 
            tokenBminAmount, 
            taskArgs.to,
            deadline
        );
        
        transactions.push({ ...addLiquidityTx, value:0});

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});

task("get-masterchef-like-stake-lp-txs")
    .addParam("lpToken", "Token to stake")
    .addOptionalParam("tokenAmount", "Token amount") // Desired amount
    .addParam("masterchef", "Address of the masterchef", SUSHI_MASTERCHEF)
    .addParam("to", "Address to swap to, PieVault address in most cases")
    .addFlag("log", "log the data")
    .addFlag("shouldReset", "should reset transactions")
    .addFlag("maxAmount", "will use the max amount")
    .setAction(async(taskArgs, { ethers, run }) => {
        const transactions: any[] = [];
        const signers = await ethers.getSigners();

        const lpToken = await run("get-token-address-from-symbol", {symbol: taskArgs.lpToken});
        const lpTokenDecimals = await run("get-token-decimals", {tokenAddress: lpToken});

        let amount;
        if(taskArgs.tokenAmount && !taskArgs.maxAmount) {
            amount = parseUnits(taskArgs.tokenAmount, lpTokenDecimals);
        } else {
            const targetToken = IERC20Factory.connect(lpToken, signers[0]);
            const balanceLpToken = await targetToken.balanceOf(taskArgs.to);
            amount = balanceLpToken;
        }

        if(taskArgs.shouldReset) {
            //reset approval
            const approval1Tx = await run("get-approval-data", {token: lpToken, spender: taskArgs.masterchef, amount: "0"});
            transactions.push(approval1Tx);
        }
        
        const masterchef = await IMasterChefFactory.connect(taskArgs.masterchef, signers[0]);

        //set approval
        const approvalTx = await run("get-approval-data", {token: lpToken, spender: taskArgs.masterchef, amount: amount.toString()});
        transactions.push(approvalTx);


        // Search for the right pool id
        const poolId = await run("get-masterchef-poolid-lp", { lpToken: lpToken, masterchef: taskArgs.masterchef });
        
        if(!poolId) {
            throw('Pool ID not found');
        }

        // Stake the lpToken
        const depositLpTx = await masterchef.populateTransaction.deposit(
            BigNumber.from(poolId),
            amount
        );
        
        transactions.push({ ...depositLpTx, value:0 });

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});

task("get-masterchef-poolid-lp")
    .addParam("lpToken", "Token to stake")
    .addParam("masterchef", "Address of the masterchef", SUSHI_MASTERCHEF)
    .setAction(async(taskArgs, { ethers, run }) => {
        const signers = await ethers.getSigners();
        const masterchef = await IMasterChefFactory.connect(taskArgs.masterchef, signers[0]);

        // Search for the right pool id
        let poolId: any = false;
        const poolCount = await masterchef.poolLength();
        for (let index = 0; index < poolCount.toNumber(); index++) {
            const poolInfo = await masterchef.poolInfo(index);
            if(poolInfo.lpToken.toLowerCase() === taskArgs.lpToken.toLowerCase()){
                poolId = index;
                break;
            }
        }
        
        return poolId ? BigNumber.from(poolId) : false;
});
