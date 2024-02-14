// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IReward {
    function distributeReward(
        address traderAddress,
        uint256 rewardAmount
    ) external;
}
