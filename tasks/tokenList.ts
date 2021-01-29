import axios from "axios";
import { task, types } from "hardhat/config";
import { isAddress } from "../utils";

const tokenList = "https://tokens.coingecko.com/uniswap/all.json";


async function getList() {
    const result = (await axios.get(tokenList)).data.tokens;
    return result;
}
 
task("get-token-list", async() => {
    const list = await getList();
    return list;
})

task("get-token-address-from-symbol")
    .addParam("symbol")
    .addParam("log", "log the output", false, types.boolean, true)
    .setAction(async(taskArgs) => {

        if(isAddress(taskArgs.symbol)) {
            return taskArgs.symbol;
        }

        const list: any[] = await getList();

        const addresses = list.filter(token => token.symbol.toLowerCase() === taskArgs.symbol.toLowerCase()).map(token => token.address);

        if(addresses.length === 0) {
            throw new Error("Token address not found");
        }

        if(addresses.length > 1) {
            throw new Error("Multiple tokens with the same symbol");
        }

        if(taskArgs.log) {
            console.log(addresses[0]);
        }

        return addresses[0];   
})