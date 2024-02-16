import { ethers } from "hardhat";
import { expect } from "chai";
import {
  Exchange,
  Exchange__factory,
  Reward,
  Reward__factory,
  MockToken,
  MockToken__factory,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("ExchangeContract", function () {
  let exchangeContract: Exchange;
  let exchangeContractFactory: Exchange__factory;
  let rewardContract: Reward;
  let rewardContractFactory: Reward__factory;
  let mockTokenContract: MockToken;
  let mockTokenContractFactory: MockToken__factory;
  let owner: HardhatEthersSigner;
  let trader1: HardhatEthersSigner;
  let trader2: HardhatEthersSigner;
  let trader3: HardhatEthersSigner;
  let trader4: HardhatEthersSigner;
  let trader5: HardhatEthersSigner;
  let isOpen: boolean;
  let isLong: boolean;
  let amount: bigint;

  before(async function () {
    // Get signers (accounts) from ethers
    [owner, trader1, trader2, trader3, trader4, trader5] =
      await ethers.getSigners();

    // Get contract factories for MockToken, Reward, and Exchange contracts
    mockTokenContractFactory = (await ethers.getContractFactory(
      "MockToken"
    )) as MockToken__factory;

    rewardContractFactory = (await ethers.getContractFactory(
      "Reward"
    )) as Reward__factory;

    exchangeContractFactory = (await ethers.getContractFactory(
      "Exchange"
    )) as Exchange__factory;

    // Deploy MockToken contract
    mockTokenContract = await mockTokenContractFactory.connect(owner).deploy();

    // Deploy Reward contract and pass the address of MockToken contract
    rewardContract = await rewardContractFactory
      .connect(owner)
      .deploy(mockTokenContract.getAddress());

    // Deploy Exchange contract and pass the address of Reward contract
    exchangeContract = await exchangeContractFactory
      .connect(owner)
      .deploy(rewardContract.getAddress());

    // Transfer total supply of MockToken to the Reward contract
    await mockTokenContract
      .connect(owner)
      .transfer(
        await rewardContract.getAddress(),
        await mockTokenContract.totalSupply()
      );
  });

  it("Should set the exchange contract address in the reward contract", async function () {
    const exchangeContractAddress = await exchangeContract.getAddress();
    const exchangeContractInReward = await rewardContract.getExchangeContract();

    await expect(
      rewardContract
        .connect(trader1)
        .setExchangeContract(exchangeContract.getAddress())
    ).to.be.revertedWith("Only owner can call this function");

    await rewardContract
      .connect(owner)
      .setExchangeContract(exchangeContract.getAddress());

    const newExchangeContractInReward =
      await rewardContract.getExchangeContract();

    expect(exchangeContractInReward).to.be.not.equal(exchangeContractAddress);
    expect(newExchangeContractInReward).to.be.equal(exchangeContractAddress);
  });

  it("Should only call exchange contract for distribute reward", async function () {
    // Distribute reward to the trader
    const rewardAmount = ethers.parseEther("100");
    await expect(
      rewardContract.distributeReward(trader1.address, rewardAmount)
    ).to.be.revertedWith("Only exchange contract can call this function");
  });

  it("Should amount be greater than 0 when opening a position", async function () {
    await expect(
      exchangeContract.connect(trader2).newPosition(0, true, true)
    ).to.be.revertedWith("Volume cannot be 0");
  });

  it("Should allow trading and claiming rewards over multiple periods", async function () {
    const periods = 100;
    let cumulativeVolume = 0;

    const traderLastTradeTime = await exchangeContract.getTraderLastTradeTime(
      trader1.address
    );
    expect(traderLastTradeTime).to.be.equal(0);

    // Perform trading actions and claim rewards over multiple periods
    for (let i = 0; i < periods; i++) {
      // Open a new trading position
      const volume = i + 100; // Volume can be any value for demonstration purposes
      isOpen = true;
      isLong = true;
      await exchangeContract
        .connect(trader5)
        .newPosition(volume, isOpen, isLong);

      cumulativeVolume += volume;
      isOpen = false;
      await exchangeContract
        .connect(trader5)
        .newPosition(volume, isOpen, isLong);

      // Check the cumulative trading volume and claimed rewards
      const traderVolume = await exchangeContract.getCumulativeTradingVolume(
        trader5.address
      );

      expect(traderVolume).to.equal(
        cumulativeVolume,
        "Cumulative trading volume should match expected"
      );

      const traderReward = await exchangeContract.getTraderReward(
        trader5.address
      );

      // Claim the rewards
      if (traderReward > 0) {
        const tokenBalanceTrader5 = await mockTokenContract.balanceOf(
          trader5.address
        );

        await exchangeContract.connect(trader5).claimReward();

        const newTokenBalanceTrader5 = await mockTokenContract.balanceOf(
          trader5.address
        );

        expect(newTokenBalanceTrader5).to.be.greaterThan(tokenBalanceTrader5);
      }

      const newTraderLastTradeTime =
        await exchangeContract.getTraderLastTradeTime(trader1.address);

      expect(newTraderLastTradeTime).to.be.greaterThanOrEqual(
        traderLastTradeTime
      );
    }
  });

  describe("Should execute the scenario as described", async function () {
    it("Period 1", async function () {
      const currentPeriod = formatEtherValue(
        await exchangeContract.getCurrentPeriod()
      );

      // T1
      amount = ethers.parseEther("100000");
      isOpen = true;
      isLong = true;
      await exchangeContract
        .connect(trader1)
        .newPosition(amount, isOpen, isLong); // Trader1: open position 100K long

      // T2
      amount = ethers.parseEther("50000");
      isLong = false;
      await exchangeContract
        .connect(trader2)
        .newPosition(amount, isOpen, isLong); // Trader2: open position 50K short

      // T3
      amount = ethers.parseEther("100000");
      isLong = true;
      await exchangeContract
        .connect(trader3)
        .newPosition(amount, isOpen, isLong); // Trader3: open position 100K long

      // T4
      amount = ethers.parseEther("25000");
      isOpen = false;
      await exchangeContract
        .connect(trader2)
        .newPosition(amount, isOpen, isLong); // Trader2: close 50% of position 25K long

      const periodStatusTrader2 =
        await exchangeContract.getTraderCurrentPeriodStatus(trader2.address);
      expect(periodStatusTrader2).to.be.true;

      isOpen = true;
      await exchangeContract
        .connect(trader2)
        .newPosition(amount, isOpen, isLong);

      // Get cumulative trading volumes and cumulative market volume
      let cumulativeTradingVolume1: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address)
      );
      let cumulativeTradingVolume2: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address)
      );
      let cumulativeTradingVolume3: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address)
      );
      let cumulativeMarketVolume: string = formatEtherValue(
        await exchangeContract.getCumulativeMarketVolume(currentPeriod)
      );

      // Assertions for Period 1
      expect(cumulativeTradingVolume1).to.equal(
        "100000",
        "Cumulative trading volume for Trader1 should be 100K"
      );
      expect(cumulativeTradingVolume2).to.equal(
        "75000",
        "Cumulative trading volume for Trader2 should be 75K"
      );
      expect(cumulativeTradingVolume3).to.equal(
        "100000",
        "Cumulative trading volume for Trader3 should be 100K"
      );
      expect(cumulativeMarketVolume).to.equal(
        "275000",
        "Cumulative market volume should be 275K"
      );
    });

    it("Period 2", async function () {
      // Pass to period 2
      const periodStartTime = await exchangeContract.periodStartTime();
      const periodDuration = await exchangeContract.PERIOD_DURATION();
      await time.increaseTo(periodStartTime + periodDuration);

      const currentPeriod = await exchangeContract.getCurrentPeriod();

      // T5
      amount = ethers.parseEther("100000");
      isOpen = true;
      isLong = false;
      await exchangeContract
        .connect(trader4)
        .newPosition(amount, isOpen, isLong); // Trader4: open position 100K short

      // T6
      amount = ethers.parseEther("25000");
      isLong = true;
      await exchangeContract
        .connect(trader2)
        .newPosition(amount, isOpen, isLong);
      amount = ethers.parseEther("12500");
      isOpen = false;
      await exchangeContract
        .connect(trader2)
        .newPosition(amount, isOpen, isLong); // Trader2: close 50% of the rest of position 25K long

      // Get cumulative trading volumes and cumulative market volume
      let cumulativeTradingVolume1: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address)
      );
      let cumulativeTradingVolume2: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address)
      );
      let cumulativeTradingVolume3: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address)
      );
      let cumulativeTradingVolume4: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader4.address)
      );
      let cumulativeMarketVolume: string = formatEtherValue(
        await exchangeContract.getCumulativeMarketVolume(currentPeriod)
      );

      // Assertions for Period 2
      expect(cumulativeTradingVolume1).to.equal(
        "0",
        "Cumulative trading volume for Trader1 should be 0"
      );
      expect(cumulativeTradingVolume2).to.equal(
        "25000",
        "Cumulative trading volume for Trader2 should be 25K"
      );
      expect(cumulativeTradingVolume3).to.equal(
        "0",
        "Cumulative trading volume for Trader3 should be 0"
      );
      expect(cumulativeTradingVolume4).to.equal(
        "100000",
        "Cumulative trading volume for Trader4 should be 100K"
      );
      expect(cumulativeMarketVolume).to.equal(
        "125000",
        "Cumulative market volume should be 125K"
      );
    });

    it("Period 3", async function () {
      // Pass to period 3
      const periodStartTime = await exchangeContract.periodStartTime();
      const periodDuration = await exchangeContract.PERIOD_DURATION();
      await time.increaseTo(periodStartTime + periodDuration + periodDuration);

      const currentPeriod = await exchangeContract.getCurrentPeriod();

      // T7
      amount = ethers.parseEther("100000");
      isOpen = true;
      isLong = false;
      await exchangeContract
        .connect(trader1)
        .newPosition(amount, isOpen, isLong);
      isOpen = false;
      await exchangeContract
        .connect(trader1)
        .newPosition(amount, isOpen, isLong); // Trader1: close full position 100K short

      // Get cumulative trading volumes and cumulative market volume
      let cumulativeTradingVolume1: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address)
      );
      let cumulativeTradingVolume2: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address)
      );
      let cumulativeTradingVolume3: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address)
      );
      let cumulativeTradingVolume4: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader4.address)
      );
      let cumulativeMarketVolume: string = formatEtherValue(
        await exchangeContract.getCumulativeMarketVolume(currentPeriod)
      );

      // Assertions for Period 3
      expect(cumulativeTradingVolume1).to.equal(
        "100000",
        "Cumulative trading volume for Trader1 should be 100K"
      );
      expect(cumulativeTradingVolume2).to.equal(
        "0",
        "Cumulative trading volume for Trader2 should be 0"
      );
      expect(cumulativeTradingVolume3).to.equal(
        "0",
        "Cumulative trading volume for Trader3 should be 0"
      );
      expect(cumulativeTradingVolume4).to.equal(
        "0",
        "Cumulative trading volume for Trader4 should be 0"
      );
      expect(cumulativeMarketVolume).to.equal(
        "100000",
        "Cumulative market volume should be 100K"
      );
    });

    it("Period 4", async function () {
      // Pass to period 4
      const periodStartTime = await exchangeContract.periodStartTime();
      const periodDuration = await exchangeContract.PERIOD_DURATION();
      await time.increaseTo(
        periodStartTime + periodDuration + periodDuration + periodDuration
      );

      const currentPeriod = await exchangeContract.getCurrentPeriod();

      // No trades in Period 4

      // Get cumulative trading volumes and cumulative market volume
      let cumulativeTradingVolume1: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address)
      );
      let cumulativeTradingVolume2: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address)
      );
      let cumulativeTradingVolume3: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address)
      );
      let cumulativeTradingVolume4: string = formatEtherValue(
        await exchangeContract.getTraderCurrentPeriodVolume(trader4.address)
      );
      let cumulativeMarketVolume: string = formatEtherValue(
        await exchangeContract.getCumulativeMarketVolume(currentPeriod)
      );

      // Assertions for Period 4
      expect(cumulativeTradingVolume1).to.equal(
        "0",
        "Cumulative trading volume for Trader1 should be 0"
      );
      expect(cumulativeTradingVolume2).to.equal(
        "0",
        "Cumulative trading volume for Trader2 should be 0"
      );
      expect(cumulativeTradingVolume3).to.equal(
        "0",
        "Cumulative trading volume for Trader3 should be 0"
      );
      expect(cumulativeTradingVolume4).to.equal(
        "0",
        "Cumulative trading volume for Trader4 should be 0"
      );
      expect(cumulativeMarketVolume).to.equal(
        "0",
        "Cumulative market volume should be 0"
      );
    });

    it("Period 5", async function () {
      // T9: Claim rewards for all traders
      const earnedRewardTrader1 = await exchangeContract.getTraderReward(
        trader1.address
      );
      const earnedRewardTrader2 = await exchangeContract.getTraderReward(
        trader2.address
      );
      const earnedRewardTrader3 = await exchangeContract.getTraderReward(
        trader3.address
      );
      const earnedRewardTrader4 = await exchangeContract.getTraderReward(
        trader4.address
      );

      if (earnedRewardTrader1 > BigInt(0)) {
        await expect(exchangeContract.connect(trader1).claimReward()).to.emit(
          rewardContract,
          "RewardDistributed"
        );

        const trader1Balance = await mockTokenContract.balanceOf(
          trader1.address
        );
        expect(trader1Balance).greaterThan(0);
      }

      if (earnedRewardTrader2 > BigInt(0)) {
        await expect(exchangeContract.connect(trader2).claimReward()).to.emit(
          rewardContract,
          "RewardDistributed"
        );

        const trader2Balance = await mockTokenContract.balanceOf(
          trader2.address
        );
        expect(trader2Balance).greaterThan(0);
      }

      if (earnedRewardTrader3 > BigInt(0)) {
        await expect(exchangeContract.connect(trader3).claimReward()).to.emit(
          rewardContract,
          "RewardDistributed"
        );

        const trader3Balance = await mockTokenContract.balanceOf(
          trader3.address
        );
        expect(trader3Balance).greaterThan(0);
      }

      if (earnedRewardTrader4 > BigInt(0)) {
        await expect(exchangeContract.connect(trader4).claimReward()).to.emit(
          rewardContract,
          "RewardDistributed"
        );

        const trader4Balance = await mockTokenContract.balanceOf(
          trader4.address
        );
        expect(trader4Balance).greaterThan(0);
      }

      const cumulativeTradingVolume1 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address);
      const cumulativeTradingVolume2 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address);
      const cumulativeTradingVolume3 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address);
      const cumulativeTradingVolume4 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader4.address);

      // Assertions for Period5
      expect(cumulativeTradingVolume1).to.equal(
        0,
        "Cumulative trading volume for Trader1 should be 0"
      );
      expect(cumulativeTradingVolume2).to.equal(
        0,
        "Cumulative trading volume for Trader2 should be 0"
      );
      expect(cumulativeTradingVolume3).to.equal(
        0,
        "Cumulative trading volume for Trader3 should be 0"
      );
      expect(cumulativeTradingVolume4).to.equal(
        0,
        "Cumulative trading volume for Trader4 should be 0"
      );

      const withdrawnRewardTrader1 =
        await rewardContract.getTraderWithdrawnReward(trader1.address);
      const withdrawnRewardTrader2 =
        await rewardContract.getTraderWithdrawnReward(trader2.address);
      const withdrawnRewardTrader3 =
        await rewardContract.getTraderWithdrawnReward(trader3.address);
      const withdrawnRewardTrader4 =
        await rewardContract.getTraderWithdrawnReward(trader4.address);

      expect(earnedRewardTrader1).to.be.equal(withdrawnRewardTrader1);
      expect(earnedRewardTrader2).to.be.equal(withdrawnRewardTrader2);
      expect(earnedRewardTrader3).to.be.equal(withdrawnRewardTrader3);
      expect(earnedRewardTrader4).to.be.equal(withdrawnRewardTrader4);

      // Should revert if reward for the period has already been distributed
      await expect(
        exchangeContract.connect(trader1).claimReward()
      ).to.be.revertedWith("Reward cannot be 0");
    });

    it("Should withdraw reward contract's balance to the owner", async function () {
      // Get the initial balance of the owner
      const initialBalance = await mockTokenContract.balanceOf(owner.address);

      // Get the contract's balance before withdrawal
      const contractBalanceBefore = await mockTokenContract.balanceOf(
        rewardContract.getAddress()
      );

      await expect(
        rewardContract.connect(trader1).withdraw()
      ).to.be.revertedWith("Only owner can call this function");

      // Call the withdraw function
      await rewardContract.connect(owner).withdraw();

      // Get the contract's balance after withdrawal
      const contractBalanceAfter = await mockTokenContract.balanceOf(
        rewardContract.getAddress()
      );

      // Get the final balance of the owner
      const finalBalance = await mockTokenContract.balanceOf(owner.address);

      // Assert that the contract's balance decreased and the owner's balance increased
      expect(contractBalanceBefore).to.be.greaterThan(contractBalanceAfter);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });
  });
});

// Helper function to format ether value
function formatEtherValue(value: bigint): string {
  return ethers.formatEther(value).split(".")[0];
}
