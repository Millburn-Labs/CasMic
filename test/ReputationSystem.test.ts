import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("ReputationSystem", function () {
  async function deployReputationFixture() {
    const [owner, manager, user1, user2] = await hre.ethers.getSigners();

    const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
    const reputation = await ReputationSystem.deploy();

    return { reputation, owner, manager, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set correct level thresholds", async function () {
      const { reputation } = await loadFixture(deployReputationFixture);

      expect(await reputation.levelThresholds(0)).to.equal(0); // Newcomer
      expect(await reputation.levelThresholds(1)).to.equal(100); // Member
      expect(await reputation.levelThresholds(2)).to.equal(500); // Contributor
      expect(await reputation.levelThresholds(3)).to.equal(2000); // Veteran
      expect(await reputation.levelThresholds(4)).to.equal(10000); // Elder
    });
  });

  describe("Reputation Awarding", function () {
    it("Should award reputation points and update user reputation", async function () {
      const { reputation, owner, user1 } = await loadFixture(deployReputationFixture);

      await expect(reputation.awardReputation(user1.address, 50, "Test participation"))
        .to.emit(reputation, "ReputationPointsAwarded")
        .withArgs(user1.address, 50, "Test participation");

      const [level, points, participation] = await reputation.getUserReputation(user1.address);
      expect(level).to.equal(0); // Newcomer (0-99 points)
      expect(points).to.equal(50);
      expect(participation).to.equal(1);
    });

    it("Should level up user when threshold is reached", async function () {
      const { reputation, owner, user1 } = await loadFixture(deployReputationFixture);

      await reputation.awardReputation(user1.address, 100, "Reaching Member");
      
      let [level] = await reputation.getUserReputation(user1.address);
      expect(level).to.equal(1); // Member (100+ points)

      // Award more to reach Contributor
      await reputation.awardReputation(user1.address, 400, "Reaching Contributor");
      [level] = await reputation.getUserReputation(user1.address);
      expect(level).to.equal(2); // Contributor (500+ points)
    });

    it("Should not allow non-manager to award reputation", async function () {
      const { reputation, user1, user2 } = await loadFixture(deployReputationFixture);

      await expect(reputation.connect(user1).awardReputation(user2.address, 50, "Test"))
        .to.be.revertedWithCustomError(reputation, "AccessControlUnauthorizedAccount");
    });

    it("Should track participation count correctly", async function () {
      const { reputation, owner, user1 } = await loadFixture(deployReputationFixture);

      await reputation.awardReputation(user1.address, 10, "Participation 1");
      await reputation.awardReputation(user1.address, 20, "Participation 2");
      await reputation.awardReputation(user1.address, 30, "Participation 3");

      const [, , participation] = await reputation.getUserReputation(user1.address);
      expect(participation).to.equal(3);
    });
  });

  describe("Level Checking", function () {
    it("Should correctly check if user has required level", async function () {
      const { reputation, owner, user1 } = await loadFixture(deployReputationFixture);

      // Newcomer level
      expect(await reputation.hasRequiredLevel(user1.address, 0)).to.be.true;

      // Award points to reach Member
      await reputation.awardReputation(user1.address, 100, "Member level");
      expect(await reputation.hasRequiredLevel(user1.address, 1)).to.be.true;
      expect(await reputation.hasRequiredLevel(user1.address, 2)).to.be.false;

      // Reach Elder level
      await reputation.awardReputation(user1.address, 9900, "Elder level");
      expect(await reputation.hasRequiredLevel(user1.address, 4)).to.be.true;
    });
  });

  describe("Unlocked Abilities", function () {
    it("Should return correct abilities for each level", async function () {
      const { reputation } = await loadFixture(deployReputationFixture);

      // Newcomer abilities
      let abilities = await reputation.getUnlockedAbilities(0);
      expect(abilities).to.have.lengthOf(2);
      expect(abilities[0]).to.equal("Basic Voting");
      expect(abilities[1]).to.equal("View Proposals");

      // Member abilities
      abilities = await reputation.getUnlockedAbilities(1);
      expect(abilities).to.have.lengthOf(3);

      // Contributor abilities
      abilities = await reputation.getUnlockedAbilities(2);
      expect(abilities).to.have.lengthOf(4);
      expect(abilities[3]).to.equal("Create Proposals");

      // Veteran abilities
      abilities = await reputation.getUnlockedAbilities(3);
      expect(abilities).to.have.lengthOf(5);
      expect(abilities[4]).to.equal("Delegate Voting");

      // Elder abilities
      abilities = await reputation.getUnlockedAbilities(4);
      expect(abilities).to.have.lengthOf(7);
      expect(abilities[5]).to.equal("Moderate Proposals");
      expect(abilities[6]).to.equal("Elder Governance Powers");
    });
  });

  describe("Level Threshold Updates", function () {
    it("Should allow admin to update level thresholds", async function () {
      const { reputation, owner } = await loadFixture(deployReputationFixture);

      await reputation.setLevelThreshold(2, 600);
      expect(await reputation.levelThresholds(2)).to.equal(600);
    });

    it("Should not allow non-admin to update thresholds", async function () {
      const { reputation, user1 } = await loadFixture(deployReputationFixture);

      await expect(reputation.connect(user1).setLevelThreshold(2, 600))
        .to.be.revertedWithCustomError(reputation, "AccessControlUnauthorizedAccount");
    });
  });
});
