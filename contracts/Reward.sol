// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import the interface for the ERC20 token
import "./interfaces/IMockERC20.sol";

/// @title Reward Contract
/// @notice This contract distributes rewards to traders based on their trading activity.
contract Reward {
    address public owner; // Address of the contract owner
    address public exchangeContract; // Address of the associated exchange contract
    uint256 public constant REWARD_RATE = 387; // Reward rate per period

    // Instance of the ERC20 token contract
    IMockERC20 public mockTokenContract;

    // Mapping to store rewards for traders
    mapping(address => uint256) public rewards; // trader => period => check reward

    // Event emitted when a reward is distributed
    event RewardDistributed(address indexed traderAddress, uint256 reward);

    /// @dev Modifier to restrict access to only the associated exchange contract
    modifier onlyExchange() {
        require(
            msg.sender == exchangeContract,
            "Only exchange contract can call this function"
        );
        _;
    }

    /// @dev Modifier to restrict access to the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /// @notice Contract constructor
    /// @param mockTokenAddress Address of the mock ERC20 token contract
    constructor(address mockTokenAddress) {
        owner = msg.sender; // Set the contract owner
        mockTokenContract = IMockERC20(mockTokenAddress); // Initialize the mock token contract
    }

    /// @notice Distributes reward to a trader
    /// @param traderAddress Address of the trader to receive the reward
    /// @param rewardAmount Amount of reward to distribute
    function distributeReward(
        address traderAddress,
        uint256 rewardAmount
    ) external onlyExchange {
        require(
            rewards[traderAddress] == 0,
            "Reward for this period has already been distributed"
        );

        // Ensure the reward contract has enough balance
        require(
            mockTokenContract.balanceOf(address(this)) >= rewardAmount,
            "Reward contract does not have enough balance"
        );

        // Update rewards mapping before transferring tokens
        rewards[traderAddress] = rewardAmount;

        // Transfer tokens directly from the reward contract
        if (rewardAmount != 0) {
            mockTokenContract.transfer(traderAddress, rewardAmount);
        }

        emit RewardDistributed(traderAddress, rewardAmount);
    }

    /// @notice Sets the address of the associated exchange contract
    /// @param _exchangeContract Address of the exchange contract
    function setExchangeContract(address _exchangeContract) external onlyOwner {
        exchangeContract = _exchangeContract;
    }

    /// @notice Withdraws the contract's balance to the owner
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
