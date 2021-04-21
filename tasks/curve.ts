import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { task } from "hardhat/config";

import { utils } from "ethers";

import { ICurvePoolFactory } from "../types/ethers-contracts/ICurvePoolContract";
import { IWETHFactory } from "../types/ethers-contracts/IWETHContract";
import CurveABI from "../abis/ICurvePool.json";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";

const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const STETH = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
const STETH_POOL = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";

task("get-curve-join-steth-pool-tx")
    .addParam("wethAmount")
    .addParam("stethAmount")
    .addParam("slippage")
    .addFlag("log")
    .addFlag("shouldReset")
    .setAction(async(taskArgs, { ethers, run}) => {
        const transactions: any[] = [];
        const signers = await ethers.getSigners();

        const curvePool = ICurvePoolFactory.connect(STETH_POOL, signers[0]);

        const wethAmount = parseUnits(taskArgs.wethAmount, 18);
        const stethAmount = parseUnits(taskArgs.stethAmount, 18);

        if(taskArgs.shouldReset) {
            //reset approval
            const approvalTx = await run("get-approval-data", {token: STETH, spender: STETH_POOL, amount: "0"});
            transactions.push(approvalTx);
        }

        //set approval
        const approvalSteth = await run("get-approval-data", {token: STETH, spender: STETH_POOL, amount: stethAmount.toString()});
        transactions.push(approvalSteth);

        const weth = IWETHFactory.connect(WETH, signers[0]);
        //unwrap eth
        const unwrapTX = await weth.populateTransaction.withdraw(wethAmount);
        transactions.push({...unwrapTX, value: 0});

        // limit slippage to 5%
        const slippage = Math.min(taskArgs.slippage as number, 5);
        const virtualPrice = await curvePool.get_virtual_price();
        // console.log(formatEther(virtualPrice))
        const minAmount = (wethAmount.add(stethAmount)).mul(parseEther("1")).div(virtualPrice).mul((100 - slippage )).div(100);
        
        const iface = new utils.Interface(CurveABI);

        const fragment = iface.functions["add_liquidity(uint256[2],uint256)"];
        const txData = iface.encodeFunctionData(fragment, [[wethAmount, stethAmount], minAmount]);

        const mintTx  = {
            to: STETH_POOL,
            data: txData,
            value: wethAmount.toString()
        };
        transactions.push(mintTx);

        taskArgs.log && console.log(JSON.stringify(transactions, null, 2));
        return transactions;
}); 