# Exchange and Reward Contracts

This project consists of two Solidity smart contracts: Exchange and Reward. The Exchange contract facilitates trading on an exchange platform, while the Reward contract distributes rewards to traders based on their trading activity.

## Contracts

### Exchange

The Exchange contract allows traders to open and close trading positions. It tracks traders' cumulative trading volumes and calculates rewards based on trading activity.

#### Functions

- `openPosition(uint256 volume)`: Opens a trading position with the specified volume for the calling trader.
- `closePosition(uint256 volume)`: Closes a trading position with the specified volume for the calling trader.
- `claimReward(address traderAddress)`: Claims rewards for a trader based on their trading activity.
- `getCumulativeTradingVolume(address traderAddress)`: Returns the cumulative trading volume of a trader.
- `getTraderCurrentPeriodVolume(address traderAddress)`: Returns the trading volume of a trader in the current period.
- `getTraderCurrentPeriodStatus(address traderAddress)`: Returns the status of a trader's position in the current period.
- `getCumulativeMarketVolume(uint256 period)`: Returns the cumulative market volume for a specific period.

### Reward

The Reward contract distributes rewards to traders based on their trading activity as recorded by the Exchange contract.

#### Functions

- `distributeReward(address traderAddress, uint256 rewardAmount)`: Distributes rewards to a trader based on their trading activity.
- `setExchangeContract(address _exchangeContract)`: Sets the address of the associated Exchange contract.
- `withdraw()`: Allows the contract owner to withdraw any remaining balance in the contract.

## Usage

To use these contracts, deploy them to an Ethereum-compatible blockchain network using a tool like Hardhat or Truffle. Once deployed, interact with the contracts using a web3 provider or directly through a blockchain explorer.

## Testing

Unit tests can be written using testing frameworks such as Hardhat. Test cases should cover various scenarios, including opening and closing positions, claiming rewards, and contract interactions.
