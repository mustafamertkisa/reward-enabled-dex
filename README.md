# Exchange Contract

The Exchange Contract facilitates trading on the exchange and distributes rewards to traders.

## Overview

This contract is designed to manage trading positions and reward distribution based on trading activity within specific periods. It includes functionality for opening and closing positions, calculating rewards, claiming earned rewards, and querying trading and market volume data.

## Contract Details

- **Periods**: The contract divides time into periods, with each period lasting 30 days.
- **Reward Rate**: The reward rate per period is fixed at 387.
- **Trader Structure**: Stores information about traders including their last trade time, cumulative trading volume, and total rewards earned.
- **Period Structure**: Stores information about each period including the market volume and last trade time.
- **Mappings**: Several mappings are used to store trader information, period information, and the status of traders' positions and volumes per period.
- **Reward Contract Interface**: Utilizes an interface for the reward contract to distribute rewards to traders.

## Functions

- **newPosition**: Allows traders to open or close trading positions.
- **claimReward**: Allows traders to claim their earned rewards.
- **getCumulativeTradingVolume**: Returns the cumulative trading volume of a trader.
- **getTraderReward**: Returns the total reward earned by a trader.
- **getTraderCurrentPeriodStatus**: Returns the status of a trader's position in the current period.
- **getTraderCurrentPeriodVolume**: Returns the trading volume of a trader in the current period.
- **getCumulativeMarketVolume**: Returns the cumulative market volume for a specific period.
- **getCurrentPeriod**: Calculates the current period index based on the elapsed time since contract deployment.

## Constructor

The contract constructor initializes the exchange contract with the address of the reward contract.

## Events

- **NewPosition**: Fired when a trader opens or closes a trading position, providing details such as the trader's address, position type, and timestamp.

# Reward Contract

This Solidity contract facilitates the distribution of rewards to traders based on their trading activity. Here's an overview of its functionalities:

## Features:

1. **Reward Distribution**: Traders receive rewards based on their trading activity, with rewards distributed periodically.

2. **Owner Management**: The contract owner can set the associated exchange contract and withdraw the contract's balance.

3. **Integration with ERC20 Token**: The contract interacts with an external ERC20 token contract (`IMockERC20`) to distribute rewards in tokens.

## Usage:

- **Constructor**: Upon deployment, the contract initializes with the address of the mock ERC20 token contract.

- **Distribute Reward**: Only the associated exchange contract can call this function to distribute rewards to traders. Rewards are transferred directly from the contract to the trader's address.

- **Set Exchange Contract**: The owner can set the address of the associated exchange contract using this function.

- **Withdraw**: The owner can withdraw the contract's balance to their address.

# MockToken Contract

This Solidity contract implements a mock ERC20 token. It utilizes OpenZeppelin's ERC20 implementation and Ownable contract for enhanced security and functionality.

## Features:

1. **ERC20 Implementation**: This contract implements the ERC20 standard, providing functionalities such as transfer, allowance, and balance inquiries.

2. **Ownable**: The contract inherits from the Ownable contract, allowing the owner to manage certain functions and properties of the token.

## Usage:

- **Constructor**: Upon deployment, the contract initializes the ERC20 token with a name ("MockToken"), symbol ("MTK"), and initial supply of tokens.

- **Minting Tokens**: The initial supply of tokens (1,000,000) is minted and assigned to the contract owner upon deployment.

- **Transfer and Balance**: Users can transfer tokens to other addresses and check their token balances using standard ERC20 functions.
