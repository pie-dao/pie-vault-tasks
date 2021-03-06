require("dotenv").config();

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";

// tasks
import "./tasks/multisig";
import "./tasks/pie";
import "./tasks/0x";
import "./tasks/tokenList";
import "./tasks/tokens";
import "./tasks/uniswap";
import "./tasks/1inch";
import "./tasks/facets";
import "./tasks/balancer";
import "./tasks/curve";


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, {ethers}) => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/ffa6c1dc83e44e6c9971d4706311d5ab"
      }
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/ffa6c1dc83e44e6c9971d4706311d5ab",
      accounts: [
        // never ever actually use this private key
        "0xf0245d1c9679f303c7fd6df6d715fcde0dfb00e61077eada9d81794ea1cb3880"
      ]
    },
    goerli: {
      url: "https://goerli.infura.io/v3/ffa6c1dc83e44e6c9971d4706311d5ab",
      accounts: [
        // never ever actually usse this private key
        "0xf0245d1c9679f303c7fd6df6d715fcde0dfb00e61077eada9d81794ea1cb3880"
      ]
    }
  }
};





export default config;