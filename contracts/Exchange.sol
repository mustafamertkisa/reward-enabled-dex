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

    struct Position {
        uint256 tradeTime;
        uint256 tradeVolume;
        bool isLong;
    }

    // Mapping to store trader information
    mapping(address => Trader) public traders;
    // Mapping to store trading volume per period
    mapping(uint256 => uint256) public periodMarketVolume;
    // Mapping to store the status of traders' positions per period
    mapping(address => mapping(uint256 => bool)) public traderPeriodStatus;
    // Mapping to store trading volume per trader per period
    mapping(address => mapping(uint256 => uint256)) public traderPeriodVolume;
    mapping(address => mapping(uint256 => Position))
        public traderPeriodPositions;

    // Instance of the reward contract interface
    IReward public rewardContract;

    /// @notice Contract constructor
    /// @param _rewardContract Address of the reward contract
    constructor(address _rewardContract) {
        rewardContract = IReward(_rewardContract);
        periodStartTime = block.timestamp;
    }

    /// @notice Opens a trading position for a trader
    /// @param volume Volume of the position to open
    function openPosition(uint256 volume, bool isLong) external {
        require(volume > 0, "Volume cannot be 0");
        require(msg.sender != address(0), "Invalid address");

        uint256 currentPeriod = getCurrentPeriod();
        traders[msg.sender].lastTradeTime = block.timestamp;
        traders[msg.sender].cumulativeTradingVolume += volume;
        traderPeriodVolume[msg.sender][currentPeriod] += volume;
        periodMarketVolume[currentPeriod] += volume;
        traderPeriodPositions[msg.sender][currentPeriod].isLong = isLong;
        traderPeriodPositions[msg.sender][currentPeriod].tradeTime = block
            .timestamp;
        traderPeriodPositions[msg.sender][currentPeriod].tradeVolume = volume;
    }

    /// @notice Closes a trading position for a trader
    /// @param volume Volume of the position to close
    function closePosition(uint256 volume) external {
        require(volume > 0, "Volume cannot be 0");
        require(msg.sender != address(0), "Invalid address");

        uint256 currentPeriod = getCurrentPeriod();
        traderPeriodStatus[msg.sender][currentPeriod] = true;
        traderPeriodPositions[msg.sender][currentPeriod].isLong = false;
        traderPeriodPositions[msg.sender][currentPeriod].tradeTime = block
            .timestamp;
        traderPeriodPositions[msg.sender][currentPeriod].tradeVolume -= volume;
    }

    /// @notice Claims rewards for a trader
    /// @param traderAddress Address of the trader to claim rewards for
    function claimReward(address traderAddress) external {
        uint256 currentPeriod = getCurrentPeriod();
        uint256 reward;
        uint256 lastTradeTime;
        for (uint i = 0; i < currentPeriod; i++) {
            if (traderPeriodStatus[traderAddress][i]) {
                uint256 traderVolume = traderPeriodVolume[traderAddress][i];
                uint256 marketVolume = periodMarketVolume[i];
                uint256 tradeTime = traderPeriodPositions[traderAddress][i]
                    .tradeTime;

                if (i > 0) {
                    lastTradeTime = traderPeriodPositions[traderAddress][i - 1]
                        .tradeTime;
                }

                uint256 timeDifference = tradeTime - lastTradeTime;
                uint256 result = (marketVolume / traderVolume) * REWARD_RATE;

                if (timeDifference != 0) {
                    result = result * timeDifference;
                }

                reward += result;
            }
        }

        rewardContract.distributeReward(traderAddress, reward);

        traders[traderAddress].totalReward += reward;
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

    /// @notice Gets the trading volume of a trader in the current period
    /// @param traderAddress Address of the trader
    /// @return Trading volume of the trader in the current period
    function getTraderCurrentPeriodVolume(
        address traderAddress
    ) public view returns (uint256) {
        uint256 currentPeriod = getCurrentPeriod();

        return traderPeriodVolume[traderAddress][currentPeriod];
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

    /// @notice Gets the cumulative market volume for a specific period
    /// @param period Period for which to get the cumulative market volume
    /// @return Cumulative market volume for the specified period
    function getCumulativeMarketVolume(
        uint256 period
    ) public view returns (uint256) {
        return periodMarketVolume[period];
    }

    /// @notice Gets the current period based on the elapsed time since contract deployment
    /// @return Current period
    function getCurrentPeriod() public view returns (uint256) {
        return (block.timestamp - periodStartTime) / PERIOD_DURATION;
    }
}
