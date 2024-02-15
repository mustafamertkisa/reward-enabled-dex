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
        uint256 earnedReward;
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
        address trader,
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
        periods[currentPeriod].marketVolume += volume;
        traders[msg.sender].lastTradeTime = block.timestamp;
        traders[msg.sender].cumulativeTradingVolume += volume;
        traderPeriodVolume[msg.sender][currentPeriod] += volume;
        calculateReward(msg.sender, volume);
    }

    /// @notice Handles closing a trading position
    /// @param currentPeriod Current period index
    function handleClosedPosition(uint256 currentPeriod) private {
        traderPeriodStatus[msg.sender][currentPeriod] = true;
    }

    /// @notice Calculates the reward for a trader based on their trading activity
    /// @param traderAdress Address of the trader
    /// @param volume Volume of the trade
    function calculateReward(address traderAdress, uint256 volume) private {
        uint256 currentPeriod = getCurrentPeriod();
        Trader storage trader = traders[traderAdress];
        Period storage period = periods[currentPeriod];

        if (trader.lastTradeTime == 0) {
            trader.lastTradeTime = block.timestamp;
            trader.cumulativeTradingVolume = volume;
            return;
        }

        uint256 timeDifference = trader.lastTradeTime - period.lastTradeTime;

        require(period.marketVolume > 0, "Division market volume by zero");
        uint256 rewardResult = (timeDifference * volume) / period.marketVolume;

        if (traderPeriodStatus[traderAdress][currentPeriod]) {
            rewardResult = (rewardResult * REWARD_RATE) / 1000;
        }

        trader.totalReward += rewardResult;
    }

    /// @notice Allows a trader to claim their earned rewards
    /// @param traderAddress Address of the trader
    function claimReward(address traderAddress) external {
        uint256 currentPeriod = getCurrentPeriod();
        uint256 reward = traders[traderAddress].totalReward;

        rewardContract.distributeReward(traderAddress, reward);

        traders[traderAddress].earnedReward += reward;
        traderPeriodStatus[traderAddress][currentPeriod] = false;
    }

    /// @notice Gets the cumulative trading volume of a trader
    /// @param traderAddress Address of the trader
    /// @return Cumulative trading volume of the trader
    function getCumulativeTradingVolume(
        address traderAddress
    ) public view returns (uint256) {
        return traders[traderAddress].cumulativeTradingVolume;
    }

    /// @notice Gets the total reward earned by a trader
    /// @param traderAddress Address of the trader
    /// @return Total reward earned by the trader
    function getTraderReward(
        address traderAddress
    ) public view returns (uint256) {
        return traders[traderAddress].totalReward;
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
