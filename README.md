# Exchange Contract

This Solidity contract serves as the backbone of an exchange platform, facilitating trading activities and rewarding traders based on their participation. Here's an overview of its functionalities:

## Features:

1. **Periodic Reward Distribution**: Traders are rewarded periodically based on their trading activity within each period.

2. **Trader Information Management**: The contract maintains essential information about traders, including their cumulative trading volume, last trade time, and total rewards earned.

3. **Position Management**: Traders can open and close trading positions, specifying the volume and type (long or short) of each position.

4. **Reward Calculation and Distribution**: Rewards are calculated based on a predefined reward rate per period and distributed to traders accordingly.

5. **Integration with Reward Contract**: The contract interfaces with an external reward contract (`IReward`) to facilitate the distribution of rewards.

6. **Helper Functions**: Various helper functions are provided to retrieve trader information, such as cumulative trading volume, current period trading volume, position status, and cumulative market volume.

## Usage:

- **Constructor**: Upon deployment, the contract initializes with the address of the reward contract and sets the period start time.

- **Open Position**: Traders can open new trading positions by specifying the volume and type of position (long or short).

- **Close Position**: Traders can close their existing trading positions by specifying the volume to close.

- **Claim Reward**: Traders can claim their rewards, which are calculated based on their trading activity and the total market volume within each period.

- **Helper Functions**: Several functions are provided to retrieve trader-related information and market volume data.

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
