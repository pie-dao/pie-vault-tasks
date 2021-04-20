import { task, types } from "hardhat/config";
import { IPieVaultFactory } from "../types/ethers-contracts/IPieVaultContract";
import { BigNumber, constants, utils } from "ethers";

const FacetCutAction = {
    Add: 0,
    Replace: 1,
    Remove: 2,
};

task("get-remove-function-tx")
    .addParam("pie")
    .addParam("signature")
    .setAction(async(taskArgs, {ethers}) => {
        const signer = (await ethers.getSigners())[0]
        const pie = IPieVaultFactory.connect(taskArgs.pie, signer);

        const facets = await pie.facets();

        // @ts-ignore
        const sighash = pie.interface.getSighash(pie.interface.functions[taskArgs.signature]);
        let tx: any;

        for (const facet of facets) {
            for(const selector of facet.functionSelectors) {
                if (selector == sighash) {
                    tx = await pie.populateTransaction.diamondCut(
                        [{
                            facetAddress: constants.AddressZero,
                            action: BigNumber.from(FacetCutAction.Remove),
                            functionSelectors: [selector]
                        }],
                        constants.AddressZero,
                        "0x"
                    )
                    break;
                }
            }
        }
        console.log(tx);
});