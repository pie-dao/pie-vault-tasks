# Pie Vault Tasks

Tasks for executing swaps on dexes from a PieVault.

## How to use

Tasks are run to create calls which can be dry run to inspect the result or from which a payload can be generated to submit to the multisig.

The following commands can be used to list all available tasks

```
npx hardhat help
npx hardhat [taskName] help
```

### Install and build

```
yarn
yarn typechain
```

### Generate calldata for swaps

Sushiswap/Uniswap, 1inch and the matcha API are currently supported. We pipe the data into a json file so it can be used in dry runs and/or be converted into a payload to use with a multisig

#### Uniswap/SushiSwap

``
npx hardhat get-uni-like-execute-swap-txs --sell-token SNX --buy-token MKR --sell-amount 0.1 --slippage 1 --router 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D --to 0x992e9f1d29e2fdb57a9e09a78e122fafe3720cc5 --log > calls.json
``

#### 1inch

```
npx hardhat get-matcha-order-execute-txs --buy-token LINK --sell-token SNX --sell-amount 0.1 --slippage 0.1 --network mainnet --log > calls.json
```

#### Matcha (0x-api)

```
npx hardhat get-matcha-order-execute-txs --buy-token LINK --sell-token SNX --sell-amount 0.1 --slippage 0.1 --network defaultNetwork --log > calls.json
```

### Dry run

Dry running a batch of calls allows us to inspect the changes to balances and the tokens that are in a PieVault before actually running it onchain.


```
npx hardhat dry-run-tx --pie [address of the pie] --calls ./calls.json --from [address the tx should be send from can be a multisig address]
```

### Preparing calldata

Combine the calls into a single function call with the PieVault as target

```
npx hardhat get-execute-calls-tx-from-json --pie 0x992e9f1d29e2fdb57a9e09a78e122fafe3720cc5 --calls ./calls.json --log > pieCall.json
```

The output in ``pieCall.json`` can then be used with a multi sig wallet or EOA