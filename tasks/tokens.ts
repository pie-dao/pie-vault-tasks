import { task, types } from "hardhat/config";
import  { IERC20Factory } from "../types/ethers-contracts/IERC20Contract"

task("get-token-decimals")
    .addPositionalParam("tokenAddress", "address of the token")
    .addParam("log", "log the output", false, types.boolean, true)
    .setAction(async(taskArgs, { ethers }) => {
        const signers = await ethers.getSigners();

        const token = IERC20Factory.connect(taskArgs.tokenAddress, signers[0]);
        const decimals = await token.decimals();
        
        taskArgs.log && console.log(decimals);

        return decimals;
});

task("get-approval-data")
    .addParam("token", "address or symbol of the token")
    .addParam("spender", "address ")
    .addParam("amount", "amount to approve in the smallest unit", undefined, types.string)
    .addOptionalParam("log", "log the output", false, types.boolean)
    .setAction(async(taskArgs, {ethers, run}) => {
        const signers = await ethers.getSigners();
        
        const tokenAddress = await run("get-token-address-from-symbol", {symbol: taskArgs.token});
        const token = IERC20Factory.connect(tokenAddress, signers[0]);

        const target = token.address;
        const data = (await token.populateTransaction.approve(taskArgs.spender, taskArgs.amount)).data;
        const value = 0;
        
        const returnData = {
            to: target,
            data,
            value
        }

        taskArgs.log && console.log(returnData);

        return returnData;
})