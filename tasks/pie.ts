import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { utils } from "ethers";
import { internalTask, task, types } from "hardhat/config";
import { IERC20Factory } from "../types/ethers-contracts/IERC20Contract";

import { IPieVaultFactory } from "../types/ethers-contracts/IPieVaultContract";
import { ITokenListUpdaterFactory } from "../types/ethers-contracts/ITokenListUpdaterContract";

const TOKEN_UPDATER = "0xE0e5470E2AFc58F6E8D54C7a4952D029175271AB";

internalTask("get-execute-calls-tx")
    .addParam("pie")
    .addParam("calls", "Calls to execute", undefined, types.any)
    .setAction(async(taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();

        const calls = taskArgs.calls;

        const pieVault = IPieVaultFactory.connect(taskArgs.pie, signers[0]);

        const targets = calls.map((call: any) => (call.to));
        const data = calls.map((call:any) => (call.data));
        const values = calls.map((call: any) => (call.value));

        const tx = await pieVault.populateTransaction.call(targets, data, values);
        
        return tx;
});

task("get-execute-calls-tx-from-json", "Get execute calls tx from json")
    .addParam("pie")
    .addParam("calls", "path to json containing calls to execute")
    .addFlag("log", "log the output")
    .setAction(async (taskArgs, {ethers, run}) => {
        const calls = require(`${process.cwd()}/${taskArgs.calls}`);
        const returnData = await run("get-execute-calls-tx", { pie: taskArgs.pie, calls: calls});

        taskArgs.log && console.log(JSON.stringify(returnData, null, 2));

        return returnData;
});

task("drie-run-tx", "Drie run calls against a pie")
    .addParam("pie")
    .addParam("from")
    .addParam("calls", "path to a json containing the calls")
    .setAction(async(taskArgs, {ethers, run, network}) => {
        
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [taskArgs.from]
        });
        const signer = await ethers.provider.getSigner(taskArgs.from);

        const pieVault = IPieVaultFactory.connect(taskArgs.pie, signer);

        const calls = require(`${process.cwd()}/${taskArgs.calls}`);
        const transaction = await run("get-execute-calls-tx", { pie: taskArgs.pie, calls: calls});

        const tokenAndAmountsBefore = await pieVault.calcTokensForAmount(await pieVault.totalSupply());

        await signer.sendTransaction({
            to: transaction.to,
            data: transaction.data,
            value: 0
        });

        const tokenAndAmountsAfter = await pieVault.calcTokensForAmount(await pieVault.totalSupply());
        
        await logOutput(tokenAndAmountsBefore, tokenAndAmountsAfter, signer);
});

internalTask("get-update-tokens-tx", "Updates the token list of a PieVault")
    .addParam("pie", "pie to update")
    .addParam("tokens", "tokens to check must be an address", undefined, types.any)
    .setAction(async(taskArgs, {ethers}) => {
        const signers = await ethers.getSigners();
        const tokenListUpdater = ITokenListUpdaterFactory.connect(TOKEN_UPDATER, signers[0]);

        const tokens: string[] = taskArgs.tokens as string[];

        const tx = tokenListUpdater.populateTransaction.update(taskArgs.pie, tokens);

        return tx;
});


async function logOutput(amountsAndTokensBefore:any, amountsAndTokensAfter:any, signer: any) {
    const output = await amountsAndTokensBefore.tokens.map(async (address:any, index:number) => {
        const token = IERC20Factory.connect(address, signer)
        const decimals = await token.decimals();
        // Name errors out on some tokens
        // const name = await token.name();
        const amountBefore = utils.formatUnits(amountsAndTokensBefore.amounts[index], decimals);
        const amountAfter = utils.formatUnits(amountsAndTokensAfter.amounts[index], decimals);

        return { 
            address,
            amountBefore,
            amountAfter,
            // name
        }
    })

    console.table(await Promise.all(output));
}