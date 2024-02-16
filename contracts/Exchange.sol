// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import the interface for the reward contract
import "./interfaces/IReward.sol";

/// @title Exchange Contract
/// @notice This contract facilitates trading on the exchange and distributes rewards to traders.
contract Exchange {
    uint256 public periodStartTime;
    uint256 public constant PERIOD_DURATION = 2592000; // 30 days in seconds
    uint256 public constant REWARD_RATE = 387; // Reward rate per period

    // Struct to store trader information
    struct Trader {
        uint256 lastTradeTime; // Timestamp of the last trade
        uint256 cumulativeTradingVolume; // Total trading volume of the trader
        uint256 totalReward; // Total reward earned by the trader
    }

    struct Period {
        uint256 marketVolume; // Total trading volume within the period
        uint256 lastTradeTime; // Timestamp of the last trade within the period
    }

    // Mapping to store trader information
    mapping(address => Trader) public traders;
    // Mapping to store period information
    mapping(uint256 => Period) public periods;
    // Mapping to store the status of traders' positions per period
    mapping(address => mapping(uint256 => bool)) public traderPeriodStatus;
    // Mapping to store the status of traders' volumes per period
    mapping(address => mapping(uint256 => uint256)) public traderPeriodVolume;

    // Instance of the reward contract interface
    IReward public rewardContract;

    event NewPosition(
        address indexed trader,
        bool isOpen,
        bool isLong,
        uint256 timestamp
    );

    /// @notice Contract constructor
    /// @dev Initializes the exchange contract with the address of the reward contract
    /// @param _rewardContract Address of the reward contract
    constructor(address _rewardContract) {
        rewardContract = IReward(_rewardContract);
        periodStartTime = block.timestamp;
    }

    /// @notice Handles opening or closing of trading positions
    /// @param volume Volume of the trade
    /// @param isOpen Flag indicating if the position is being opened or closed
    /// @param isLong Flag indicating if the position is long or short
    function newPosition(uint256 volume, bool isOpen, bool isLong) external {
        require(volume > 0, "Volume cannot be 0");
        require(msg.sender != address(0), "Invalid address");

        uint256 currentPeriod = getCurrentPeriod();

        if (isOpen) {
            handleOpenPosition(volume, currentPeriod);
        } else {
            handleClosedPosition(currentPeriod);
        }

        emit NewPosition(msg.sender, isOpen, isLong, block.timestamp);
    }

    /// @notice Handles opening a trading position
    /// @param volume Volume of the trade
    /// @param currentPeriod Current period index
    function handleOpenPosition(uint256 volume, uint256 currentPeriod) private {
        // Update the total market volume
        periods[currentPeriod].marketVolume += volume;
        // Update the last trade time for the trader
        traders[msg.sender].lastTradeTime = block.timestamp;
        // Update the cumulative trading volume for the trader
        traders[msg.sender].cumulativeTradingVolume += volume;
        // Update the trading volume for the current period for the trader
        traderPeriodVolume[msg.sender][currentPeriod] += volume;
        // Calculate the reward for the trader
        calculateReward(msg.sender, volume);
        // Update the last trade time for the current period
        periods[currentPeriod].lastTradeTime = traders[msg.sender]
            .lastTradeTime;
    }

    /// @notice Handles closing a trading position
    /// @param currentPeriod Current period index
    function handleClosedPosition(uint256 currentPeriod) private {
        traderPeriodStatus[msg.sender][currentPeriod] = true;
    }

    /// @notice Calculates the reward for a trader based on their trading activity
    /// @param traderAddress Address of the trader
    /// @param volume Volume of the trade
    function calculateReward(address traderAddress, uint256 volume) private {
        uint256 currentPeriod = getCurrentPeriod();
        Trader storage trader = traders[traderAddress];
        Period storage period = periods[currentPeriod];

        if (trader.lastTradeTime == 0) {
            trader.lastTradeTime = block.timestamp;
            trader.cumulativeTradingVolume = volume;
            return;
        }

        uint256 timeDifference = block.timestamp - period.lastTradeTime;

        require(period.marketVolume > 0, "Division market volume by zero");
        uint256 rewardResult = (timeDifference * volume) / period.marketVolume;

        if (traderPeriodStatus[traderAddress][currentPeriod]) {
            rewardResult = (rewardResult * REWARD_RATE) / 1000;
        }

        trader.totalReward += rewardResult;
    }

    /// @notice Allows a trader to claim their earned rewards
    function claimReward() external {
        uint256 currentPeriod = getCurrentPeriod();
        uint256 reward = traders[msg.sender].totalReward;
        require(reward > 0, "Reward cannot be 0");

        // Set the totalReward to 0 before distributing the reward
        traders[msg.sender].totalReward = 0;

        // Set the period status to false before distributing the reward
        traderPeriodStatus[msg.sender][currentPeriod] = false;

        // Distribute the reward
        rewardContract.distributeReward(msg.sender, reward);
    }

    /// @notice Gets the status of a trader's position in the current period
    /// @param traderAddress Address of the trader
    /// @return Status of the trader's position in the current period
    function getTraderCurrentPeriodStatus(
        address traderAddress
    ) public view returns (bool) {
        uint256 currentPeriod = getCurrentPeriod();

        return traderPeriodStatus[traderAddress][currentPeriod];
    }

    function getTraderCurrentPeriodVolume(
        address traderAddress
    ) public view returns (uint256) {
        uint256 currentPeriod = getCurrentPeriod();

        return traderPeriodVolume[traderAddress][currentPeriod];
    }

    /// @notice Gets the total reward earned by a trader
    /// @param traderAddress Address of the trader
    /// @return Total reward earned by the trader
    function getTraderReward(
        address traderAddress
    ) public view returns (uint256) {
        return traders[traderAddress].totalReward;
    }

    /// @notice Gets the cumulative trading volume of a trader
    /// @param traderAddress Address of the trader
    /// @return Cumulative trading volume of the trader
    function getCumulativeTradingVolume(
        address traderAddress
    ) public view returns (uint256) {
        return traders[traderAddress].cumulativeTradingVolume;
    }

    /// @dev Retrieves the timestamp of the last trade made by a trader
    /// @param traderAddress The Ethereum address of the trader
    /// @return The timestamp (in Unix epoch time) of the last trade made by the trader
    function getTraderLastTradeTime(
        address traderAddress
    ) public view returns (uint256) {
        return traders[traderAddress].lastTradeTime;
    }

    /// @notice Gets the cumulative market volume for a specific period
    /// @param period Period for which to get the cumulative market volume
    /// @return Cumulative market volume for the specified period
    function getCumulativeMarketVolume(
        uint256 period
    ) public view returns (uint256) {
        return periods[period].marketVolume;
    }

    /// @notice Gets the current period index based on the elapsed time since contract deployment
    /// @return Current period index
    function getCurrentPeriod() public view returns (uint256) {
        return (block.timestamp - periodStartTime) / PERIOD_DURATION;
    }
}
