import { task } from "hardhat/config";
import { MultisigFactory } from "../types/ethers-contracts/MultisigContract";

// task("submit-ms-tx")
//     .addParam("multisig", "address of the multisig")
//     // .addParam("")
//     .setAction(async(taskArgs, {ethers}) => {
//         const signers = await ethers.getSigners();
 
//         const multisig = MultisigFactory.connect(taskArgs.multisig, signers[0]);

// });