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

  before(async function () {
    // Get signers (accounts) from ethers
    [owner, trader1, trader2, trader3, trader4] = await ethers.getSigners();

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

    // Set the Exchange contract address in the Reward contract
    await rewardContract.setExchangeContract(exchangeContract.getAddress());

    // Transfer total supply of MockToken to the Reward contract
    await mockTokenContract
      .connect(owner)
      .transfer(
        await rewardContract.getAddress(),
        await mockTokenContract.totalSupply()
      );
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

  describe("Should execute the scenario as described", async function () {
    it("Period 1", async function () {
      const currentPeriod = formatEtherValue(
        await exchangeContract.getCurrentPeriod()
      );

      // T1
      let amount: bigint = ethers.parseEther("100000");
      let isOpen: boolean = true;
      let isLong: boolean = true;
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
      let amount: bigint = ethers.parseEther("100000");
      let isOpen: boolean = true;
      let isLong: boolean = false;
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
      let amount: bigint = ethers.parseEther("100000");
      let isOpen: boolean = true;
      let isLong: boolean = false;
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
      await expect(exchangeContract.claimReward(trader1.address)).to.emit(
        rewardContract,
        "RewardDistributed"
      );
      await expect(exchangeContract.claimReward(trader2.address)).to.emit(
        rewardContract,
        "RewardDistributed"
      );
      await expect(exchangeContract.claimReward(trader3.address)).to.emit(
        rewardContract,
        "RewardDistributed"
      );
      await expect(exchangeContract.claimReward(trader4.address)).to.emit(
        rewardContract,
        "RewardDistributed"
      );

      const cumulativeTradingVolume1 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader1.address);
      const cumulativeTradingVolume2 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader2.address);
      const cumulativeTradingVolume3 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader3.address);
      const cumulativeTradingVolume4 =
        await exchangeContract.getTraderCurrentPeriodVolume(trader4.address);

      const trader1Balance = await mockTokenContract.balanceOf(trader1.address);
      const trader2Balance = await mockTokenContract.balanceOf(trader2.address);
      const trader3Balance = await mockTokenContract.balanceOf(trader3.address);
      const trader4Balance = await mockTokenContract.balanceOf(trader4.address);

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

      expect(trader1Balance).greaterThan(0);
      expect(trader2Balance).greaterThan(0);
      expect(trader3Balance).greaterThan(0);
      expect(trader4Balance).greaterThan(0);

      // Should revert if reward for the period has already been distributed
      await expect(
        exchangeContract.claimReward(trader1.address)
      ).to.be.revertedWith(
        "Reward for this period has already been distributed"
      );
    });
  });
});

// Helper function to format ether value
function formatEtherValue(value: bigint): string {
  return ethers.formatEther(value).split(".")[0];
}
