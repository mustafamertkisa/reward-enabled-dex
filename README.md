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

<br><br>

# Reward Contract

This Solidity smart contract facilitates the distribution of rewards to traders based on their trading activity. It interacts with an ERC20 token contract to manage reward distribution. Below is an overview of its functionalities:

## Contract Overview

- **Owner:** The address that deployed the contract, which has privileged access to certain functions.
- **Exchange Contract:** The associated exchange contract that interacts with this reward contract.
- **Mock ERC20 Token Contract:** An interface for the ERC20 token used for reward distribution.
- **Rewards Mapping:** Stores rewards for traders.
- **Modifiers:**
  - `onlyExchange`: Restricts access to only the associated exchange contract.
  - `onlyOwner`: Restricts access to the contract owner.
- **Events:**
  - `RewardDistributed`: Emitted when a reward is distributed to a trader.

## Functions

1. **Constructor:**

   - Initializes the contract owner and the mock ERC20 token contract.

2. **`distributeReward`:**

   - Distributes rewards to a trader, called only by the associated exchange contract.

3. **`setExchangeContract`:**

   - Sets the address of the associated exchange contract, accessible only by the contract owner.

4. **`getTraderWithdrawnReward`:**

   - Retrieves the withdrawn reward for a trader.

5. **`withdraw`:**

   - Allows the owner to withdraw the contract's ERC20 token balance.

6. **`getExchangeContract`:**
   - Retrieves the address of the associated exchange contract.

## Usage

1. Deploy the contract, passing the address of the ERC20 token contract.
2. Set the associated exchange contract address using `setExchangeContract`.
3. Call `distributeReward` from the exchange contract to distribute rewards.
4. Traders can retrieve their withdrawn rewards using `getTraderWithdrawnReward`.
5. The owner can withdraw remaining tokens using `withdraw`.

<br><br>

# MockToken Contract

This Solidity contract implements a mock ERC20 token. It utilizes OpenZeppelin's ERC20 implementation and Ownable contract for enhanced security and functionality.

## Features:

1. **ERC20 Implementation**: This contract implements the ERC20 standard, providing functionalities such as transfer, allowance, and balance inquiries.

2. **Ownable**: The contract inherits from the Ownable contract, allowing the owner to manage certain functions and properties of the token.

## Usage:

- **Constructor**: Upon deployment, the contract initializes the ERC20 token with a name ("MockToken"), symbol ("MTK"), and initial supply of tokens.

- **Minting Tokens**: The initial supply of tokens (1,000,000) is minted and assigned to the contract owner upon deployment.

- **Transfer and Balance**: Users can transfer tokens to other addresses and check their token balances using standard ERC20 functions.

<br><br>

# Coverage

| File                        | % Stmts   | % Branch   | % Funcs   | % Lines   | Uncovered Lines   |
| --------------------------- | --------- | ---------- | --------- | --------- | ----------------- |
| contracts/                  | 97.56     | 80         | 100       | 95.08     |                   |
| Exchange.sol                | 96.67     | 78.57      | 100       | 93.18     | 106,107,108       |
| Reward.sol                  | 100       | 81.25      | 100       | 100       |                   |
| contracts/interfaces/       | 100       | 100        | 100       | 100       |                   |
| IMockERC20.sol              | 100       | 100        | 100       | 100       |                   |
| IReward.sol                 | 100       | 100        | 100       | 100       |                   |
| contracts/mocks/            | 100       | 100        | 100       | 100       |                   |
| MockToken.sol               | 100       | 100        | 100       | 100       |                   |
| --------------------------- | --------- | ---------- | --------- | --------- | ----------------- |
| All files                   | 97.62     | 80         | 100       | 95.16     |                   |
| --------------------------- | --------- | ---------- | --------- | --------- | ----------------- |
