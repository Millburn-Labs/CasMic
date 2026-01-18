import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("TokenStaking", function () {
  async function deployStakingFixture() {
    const [owner, user1, user2] = await hre.ethers.getSigners();

    // Deploy governance token
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy("Governance Token", "GOV");

    // Deploy staking contract
    const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
    const staking = await TokenStaking.deploy(await token.getAddress());

    // Mint tokens to users
    const amount = hre.ethers.parseEther("10000");
    await token.mint(user1.address, amount);
    await token.mint(user2.address, amount);

    return { token, staking, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set correct governance token address", async function () {
      const { token, staking } = await loadFixture(deployStakingFixture);
      expect(await staking.governanceToken()).to.equal(await token.getAddress());
    });

    it("Should set correct lock period durations", async function () {
      const { staking } = await loadFixture(deployStakingFixture);

      expect(await staking.lockPeriodDurations(1)).to.equal(7 * 24 * 60 * 60); // 1 week
      expect(await staking.lockPeriodDurations(2)).to.equal(30 * 24 * 60 * 60); // 1 month
      expect(await staking.lockPeriodDurations(3)).to.equal(90 * 24 * 60 * 60); // 3 months
    });

    it("Should set correct voting power multipliers", async function () {
      const { staking } = await loadFixture(deployStakingFixture);

      expect(await staking.votingPowerMultipliers(0)).to.equal(10000); // 1x
      expect(await staking.votingPowerMultipliers(1)).to.equal(12000); // 1.2x
      expect(await staking.votingPowerMultipliers(2)).to.equal(15000); // 1.5x
      expect(await staking.votingPowerMultipliers(5)).to.equal(30000); // 3x (1 year)
    });
  });

  describe("Staking", function () {
    it("Should allow staking tokens with lock period", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = hre.ethers.parseEther("1000");
      const lockPeriod = 2; // OneMonth

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);

      const tx = await staking.connect(user1).stake(stakeAmount, lockPeriod);
      const receipt = await tx.wait();
      const unlockTime = (await time.latest()) + 30 * 24 * 60 * 60;

      await expect(tx)
        .to.emit(staking, "TokensStaked")
        .withArgs(user1.address, stakeAmount, lockPeriod, (val: bigint) => val > 0n);

      expect(await token.balanceOf(await staking.getAddress())).to.equal(stakeAmount);
      expect(await staking.totalStaked(user1.address)).to.equal(stakeAmount);
    });

    it("Should track multiple stakes per user", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);

      await token.connect(user1).approve(await staking.getAddress(), hre.ethers.parseEther("5000"));

      await staking.connect(user1).stake(hre.ethers.parseEther("1000"), 1); // OneWeek
      await staking.connect(user1).stake(hre.ethers.parseEther("2000"), 2); // OneMonth

      expect(await staking.totalStaked(user1.address)).to.equal(hre.ethers.parseEther("3000"));
      
      const [stakes] = await staking.getUserStakes(user1.address);
      expect(stakes).to.have.lengthOf(2);
    });

    it("Should not allow staking zero amount", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);

      await expect(staking.connect(user1).stake(0, 2))
        .to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Unstaking", function () {
    it("Should allow unstaking after lock period expires", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = hre.ethers.parseEther("1000");
      const lockPeriod = 1; // OneWeek

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);

      // Fast forward time
      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(staking.connect(user1).unstake(0))
        .to.emit(staking, "TokensUnstaked")
        .withArgs(user1.address, stakeAmount, 0);

      expect(await token.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("10000"));
      expect(await staking.totalStaked(user1.address)).to.equal(0);
    });

    it("Should not allow unstaking before lock period expires", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = hre.ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount, 2); // OneMonth

      await time.increase(7 * 24 * 60 * 60); // Only 1 week passed

      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("Lock period not expired");
    });

    it("Should not allow unstaking same stake twice", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);
      const stakeAmount = hre.ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount, 1); // OneWeek

      await time.increase(7 * 24 * 60 * 60 + 1);
      await staking.connect(user1).unstake(0);

      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("Stake already unstaked");
    });
  });

  describe("Voting Power Calculation", function () {
    it("Should calculate effective voting power with multipliers", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);

      await token.connect(user1).approve(await staking.getAddress(), hre.ethers.parseEther("5000"));

      // Stake 1000 tokens for 1 month (1.5x multiplier)
      await staking.connect(user1).stake(hre.ethers.parseEther("1000"), 2);

      const votingPower = await staking.getEffectiveVotingPower(user1.address);
      // 1000 * 1.5 = 1500 (in wei units)
      expect(votingPower).to.equal(hre.ethers.parseEther("1500"));
    });

    it("Should sum voting power from multiple stakes", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);

      await token.connect(user1).approve(await staking.getAddress(), hre.ethers.parseEther("5000"));

      // Stake 1000 with 1.2x (OneWeek)
      await staking.connect(user1).stake(hre.ethers.parseEther("1000"), 1);
      // Stake 2000 with 2x (ThreeMonth)
      await staking.connect(user1).stake(hre.ethers.parseEther("2000"), 3);

      const votingPower = await staking.getEffectiveVotingPower(user1.address);
      // (1000 * 1.2) + (2000 * 2) = 1200 + 4000 = 5200
      expect(votingPower).to.equal(hre.ethers.parseEther("5200"));
    });

    it("Should not count unstaked tokens in voting power", async function () {
      const { token, staking, user1 } = await loadFixture(deployStakingFixture);

      await token.connect(user1).approve(await staking.getAddress(), hre.ethers.parseEther("5000"));

      await staking.connect(user1).stake(hre.ethers.parseEther("1000"), 1); // OneWeek
      await staking.connect(user1).stake(hre.ethers.parseEther("2000"), 2); // OneMonth

      await time.increase(7 * 24 * 60 * 60 + 1);
      await staking.connect(user1).unstake(0); // Unstake first stake

      const votingPower = await staking.getEffectiveVotingPower(user1.address);
      // Only second stake counts: 2000 * 1.5 = 3000
      expect(votingPower).to.equal(hre.ethers.parseEther("3000"));
    });

    it("Should return zero voting power for non-staker", async function () {
      const { staking, user2 } = await loadFixture(deployStakingFixture);

      const votingPower = await staking.getEffectiveVotingPower(user2.address);
      expect(votingPower).to.equal(0);
    });
  });

  describe("Configuration", function () {
    it("Should allow admin to update lock period configuration", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);

      await staking.updateLockPeriod(2, 45 * 24 * 60 * 60, 16000);

      expect(await staking.lockPeriodDurations(2)).to.equal(45 * 24 * 60 * 60);
      expect(await staking.votingPowerMultipliers(2)).to.equal(16000);
    });

    it("Should not allow non-admin to update configuration", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);

      await expect(staking.connect(user1).updateLockPeriod(2, 45 * 24 * 60 * 60, 16000))
        .to.be.revertedWithCustomError(staking, "AccessControlUnauthorizedAccount");
    });
  });
});
