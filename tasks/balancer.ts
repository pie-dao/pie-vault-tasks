import { BigNumber } from "@ethersproject/bignumber";
import { formatEther, parseUnits } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { IBPoolFactory } from "../types/ethers-contracts/IBPoolContract";

task("get-balancer-join-pool-tx")
    .addParam("tokenA")
    .addParam("tokenB")
    .addParam("tokenAAmount")
    .addParam("tokenBAmount")
    .addParam("pool")
    .addParam("slippage")
    .addFlag("log")
    .addFlag("shouldReset")
    .setAction(async(taskArgs, { ethers, run}) => {
        const transactions: any[] = [];

        const signers = await ethers.getSigners();
        const pool = IBPoolFactory.connect(taskArgs.pool, signers[0]);

        const poolTokenA = (await pool.getCurrentTokens())[0];

        let tokenA = await run("get-token-address-from-symbol", {symbol: taskArgs.tokenA});
        let tokenB = await run("get-token-address-from-symbol", {symbol: taskArgs.tokenB});

        // if tokens are in the wrong order, swap them
        if(tokenA.toLowerCase() !== poolTokenA.toLowerCase()) {
            let tokenAMem = tokenA;
            tokenA = tokenB;
            tokenB = tokenAMem;

            let tokenAAmountMem = taskArgs.tokenAAmount;
            taskArgs.tokenAAmount = taskArgs.tokenBAmount;
            taskArgs.tokenBAmount = tokenAAmountMem;
        }

        const tokenAdecimals = await run("get-token-decimals", {tokenAddress: tokenA});
        const tokenBdecimals = await run("get-token-decimals", {tokenAddress: tokenB});

        const tokenAAmount = parseUnits(taskArgs.tokenAAmount, tokenAdecimals);
        const tokenBAmount = parseUnits(taskArgs.tokenBAmount, tokenBdecimals);

        if(taskArgs.shouldReset) {
            //reset approval
            const approval1Tx = await run("get-approval-data", {token: tokenA, spender: taskArgs.pool, amount: "0"});
            transactions.push(approval1Tx);
            
            const approval2Tx = await run("get-approval-data", {token: tokenB, spender: taskArgs.pool, amount: "0"});
            transactions.push(approval2Tx);
        }

        // Set approval
        const approvalATx = await run("get-approval-data", {token: tokenA, spender: taskArgs.pool, amount: tokenAAmount.toString()});
        transactions.push(approvalATx);
        
        const approvalBTx = await run("get-approval-data", {token: tokenB, spender: taskArgs.pool, amount: tokenBAmount.toString()});
        transactions.push(approvalBTx);

        const tokenAPoolAmount = await pool.getBalance(tokenA);
        const tokenBPoolAmount = await pool.getBalance(tokenB);

        const poolSupply = await pool.totalSupply();

        const maxMintBasedOnA = poolSupply.mul(tokenAAmount).div(tokenAPoolAmount);
        const maxMintBasedOnB = poolSupply.mul(tokenBAmount).div(tokenBPoolAmount);
        
        // limit slippage to 5%
        const slippage = Math.min(taskArgs.slippage as number, 5);

        // TODO slippage
        let mintAmount: BigNumber;
        if(maxMintBasedOnA.lt(maxMintBasedOnB)) {
            mintAmount = maxMintBasedOnA;
        } else {
            mintAmount = maxMintBasedOnB;
        }
        mintAmount = mintAmount.mul(100 - slippage).div(100);

        const joinTx = await pool.populateTransaction.joinPool(mintAmount, [tokenAAmount, tokenBAmount]);
        transactions.push({...joinTx, value: 0});

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));

        return transactions;
});
