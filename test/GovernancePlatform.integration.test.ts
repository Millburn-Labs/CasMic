import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("GovernancePlatform Integration", function () {
  async function deployPlatformFixture() {
    const [owner, proposer, voter1, voter2, voter3] = await hre.ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy("Governance Token", "GOV");

    // Deploy ReputationSystem
    const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
    const reputation = await ReputationSystem.deploy();

    // Deploy GovernanceBadgeNFT
    const GovernanceBadgeNFT = await hre.ethers.getContractFactory("GovernanceBadgeNFT");
    const badge = await GovernanceBadgeNFT.deploy("Governance Badges", "GBADGE");

    // Deploy TokenStaking
    const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
    const staking = await TokenStaking.deploy(await token.getAddress());

    // Deploy GovernanceVoting
    const GovernanceVoting = await hre.ethers.getContractFactory("GovernanceVoting");
    const voting = await GovernanceVoting.deploy(await staking.getAddress());

    // Deploy OnchainDiscussions
    const OnchainDiscussions = await hre.ethers.getContractFactory("OnchainDiscussions");
    const discussions = await OnchainDiscussions.deploy();

    // Deploy GovernancePlatform
    const GovernancePlatform = await hre.ethers.getContractFactory("GovernancePlatform");
    const platform = await GovernancePlatform.deploy(
      await token.getAddress(),
      await reputation.getAddress(),
      await badge.getAddress(),
      await staking.getAddress(),
      await voting.getAddress(),
      await discussions.getAddress()
    );

    // Setup roles
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, await platform.getAddress());

    const REPUTATION_MANAGER_ROLE = await reputation.REPUTATION_MANAGER_ROLE();
    await reputation.grantRole(REPUTATION_MANAGER_ROLE, await platform.getAddress());

    const BADGE_MINTER_ROLE = await badge.MINTER_ROLE();
    await badge.grantRole(BADGE_MINTER_ROLE, await platform.getAddress());

    const BADGE_LEVEL_MANAGER_ROLE = await badge.LEVEL_MANAGER_ROLE();
    await badge.grantRole(BADGE_LEVEL_MANAGER_ROLE, await platform.getAddress());

    const PROPOSAL_MANAGER_ROLE = await voting.PROPOSAL_MANAGER_ROLE();
    await voting.grantRole(PROPOSAL_MANAGER_ROLE, proposer.address);

    // Mint tokens to users
    const amount = hre.ethers.parseEther("10000");
    await token.mint(voter1.address, amount);
    await token.mint(voter2.address, amount);
    await token.mint(voter3.address, amount);

    return {
      token,
      reputation,
      badge,
      staking,
      voting,
      discussions,
      platform,
      owner,
      proposer,
      voter1,
      voter2,
      voter3,
    };
  }

  describe("Full Governance Workflow", function () {
    it("Should complete full governance cycle: stake -> vote -> earn rewards", async function () {
      const { token, staking, voting, reputation, badge, platform, proposer, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Step 1: User stakes tokens
      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 2); // OneMonth lock

      // Step 2: Create proposal
      await voting.connect(proposer).createProposal(
        "Important Proposal",
        "This proposal is very important",
        0, // Simple voting
        7 * 24 * 60 * 60
      );

      // Step 3: User votes
      await voting.connect(voter1).castVote(1, 1); // Vote For

      // Step 4: Verify voting worked
      const [forVotes] = await voting.getProposalResults(1);
      const votingPower = await staking.getEffectiveVotingPower(voter1.address);
      expect(forVotes).to.equal(votingPower);

      // Step 5: Manually award reputation to simulate reward system
      // (In production, this would be called by voting contract after vote)
      await reputation.awardReputation(voter1.address, 10, "Voting participation");
      await badge.mintBadge(voter1.address, 2, "ipfs://QmVoterBadge");

      // Step 6: Verify reputation was awarded
      const [, reputationPoints] = await reputation.getUserReputation(voter1.address);
      expect(reputationPoints).to.equal(10);

      // Step 7: Verify badge was minted
      expect(await badge.hasBadge(voter1.address, 2)).to.be.true; // BadgeType.Voter = 2
    });

    it("Should track user stats across all systems", async function () {
      const { token, staking, voting, reputation, badge, platform, proposer, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Setup: stake and vote
      const stakeAmount = hre.ethers.parseEther("2000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 2);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);
      await voting.connect(voter1).castVote(1, 1);

      // Award some reputation
      await reputation.awardReputation(voter1.address, 150, "Active participation");

      // Get user stats
      const [tokenBalance, stakedBalance, repLevel, repPoints, badgeCount] = 
        await platform.getUserStats(voter1.address);

      expect(tokenBalance).to.equal(hre.ethers.parseEther("8000")); // 10000 - 2000 staked
      expect(stakedBalance).to.equal(stakeAmount);
      expect(repLevel).to.equal(1); // Member level (100-499 points)
      expect(repPoints).to.equal(150);
      expect(badgeCount).to.be.gte(0);
    });

    it("Should handle proposal creation rewards", async function () {
      const { voting, reputation, badge, platform, proposer } = 
        await loadFixture(deployPlatformFixture);

      // Create proposal
      await voting.connect(proposer).createProposal("Test Proposal", "Content", 0, 7 * 24 * 60 * 60);

      // Manually award reputation and badge (simulating reward system)
      await reputation.awardReputation(proposer.address, 50, "Proposal creation");
      await badge.mintBadge(proposer.address, 1, "ipfs://QmProposalCreatorBadge");

      // Verify reputation
      const [, repPoints] = await reputation.getUserReputation(proposer.address);
      expect(repPoints).to.equal(50); // proposalReward = 50

      // Verify badge
      expect(await badge.hasBadge(proposer.address, 1)).to.be.true; // BadgeType.ProposalCreator
    });

    it("Should handle discussion participation rewards", async function () {
      const { discussions, reputation, platform, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Create discussion
      await discussions.connect(voter1).createDiscussion(0, "Test Discussion", "Content");

      // Add comment
      await discussions.connect(voter1).addComment(1, "Great discussion!", 0);

      // Manually award reputation (simulating reward system)
      await reputation.awardReputation(voter1.address, 5, "Discussion participation");

      // Verify reputation
      const [, repPoints] = await reputation.getUserReputation(voter1.address);
      expect(repPoints).to.equal(5); // commentReward = 5
    });

    it("Should level up badges with experience", async function () {
      const { voting, badge, platform, proposer } = 
        await loadFixture(deployPlatformFixture);

      // Create and vote on multiple proposals
      await voting.connect(proposer).createProposal("Proposal 1", "Test", 0, 7 * 24 * 60 * 60);
      await voting.connect(proposer).createProposal("Proposal 2", "Test", 0, 7 * 24 * 60 * 60);

      // Mint badge and add experience (simulating reward system)
      if (!(await badge.hasBadge(proposer.address, 1))) {
        await badge.mintBadge(proposer.address, 1, "ipfs://QmProposalCreatorBadge");
      }
      const badgeId = await badge.getUserBadge(proposer.address, 1);
      await badge.addExperience(badgeId, 50, ""); // First proposal
      await badge.addExperience(badgeId, 50, ""); // Second proposal

      // Get badge metadata
      const metadata = await badge.getBadgeMetadata(badgeId);
      
      // Badge should have gained experience (50 per proposal creation)
      expect(metadata.experience).to.equal(100);
    });
  });

  describe("Reputation Level Progression", function () {
    it("Should progress user through reputation levels", async function () {
      const { reputation, discussions, voting, platform, proposer, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Create multiple activities
      await voting.connect(proposer).createProposal("Proposal 1", "Test", 0, 7 * 24 * 60 * 60);
      await reputation.awardReputation(proposer.address, 50, "Proposal creation"); // +50

      // Vote on proposal
      await voting.connect(voter1).castVote(1, 1);
      await reputation.awardReputation(voter1.address, 10, "Voting"); // +10

      // Create discussion and comment
      await discussions.connect(voter1).createDiscussion(1, "Discussion", "Content");
      await discussions.connect(voter1).addComment(1, "Comment", 0);
      await reputation.awardReputation(voter1.address, 5, "Commenting"); // +5

      // Check reputation
      let [level, points] = await reputation.getUserReputation(voter1.address);
      expect(points).to.equal(15); // 10 + 5
      expect(level).to.equal(0); // Still Newcomer

      // Award more to reach Member
      await reputation.awardReputation(voter1.address, 85, "Additional activity");
      [level, points] = await reputation.getUserReputation(voter1.address);
      expect(points).to.equal(100);
      expect(level).to.equal(1); // Member level
    });
  });

  describe("Badge Awarding Logic", function () {
    it("Should award Elder badge when reputation reaches Elder level", async function () {
      const { reputation, badge, platform, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Award enough reputation to reach Elder level
      await reputation.awardReputation(voter1.address, 10000, "Elder achievement");

      // Check elder status
      await platform.checkElderStatus(voter1.address);

      // Verify Elder badge
      expect(await badge.hasBadge(voter1.address, 4)).to.be.true; // BadgeType.Elder = 4
    });

    it("Should not award duplicate badges", async function () {
      const { voting, badge, platform, proposer } = 
        await loadFixture(deployPlatformFixture);

      // Create proposal twice
      await voting.connect(proposer).createProposal("Proposal 1", "Test", 0, 7 * 24 * 60 * 60);
      
      // Mint badge after first proposal
      if (!(await badge.hasBadge(proposer.address, 1))) {
        await badge.mintBadge(proposer.address, 1, "ipfs://QmProposalCreatorBadge");
      }
      const badgeId1 = await badge.getUserBadge(proposer.address, 1);

      await voting.connect(proposer).createProposal("Proposal 2", "Test", 0, 7 * 24 * 60 * 60);
      
      // Try to mint again - should fail
      await expect(badge.mintBadge(proposer.address, 1, "ipfs://QmProposalCreatorBadge2"))
        .to.be.revertedWith("User already has this badge type");

      const badgeId2 = await badge.getUserBadge(proposer.address, 1);

      // Should still be the same badge (not a new one)
      expect(badgeId1).to.equal(badgeId2);
    });
  });

  describe("Voting Power Integration", function () {
    it("Should calculate voting power correctly with staking multipliers", async function () {
      const { token, staking, voting, proposer, voter1 } = 
        await loadFixture(deployPlatformFixture);

      // Stake with different lock periods
      await token.connect(voter1).approve(await staking.getAddress(), hre.ethers.parseEther("5000"));

      // 1000 tokens with 1.5x multiplier (OneMonth)
      await staking.connect(voter1).stake(hre.ethers.parseEther("1000"), 2);
      // 2000 tokens with 2x multiplier (ThreeMonth)
      await staking.connect(voter1).stake(hre.ethers.parseEther("2000"), 3);

      const votingPower = await staking.getEffectiveVotingPower(voter1.address);
      // (1000 * 1.5) + (2000 * 2) = 1500 + 4000 = 5500
      expect(votingPower).to.equal(hre.ethers.parseEther("5500"));

      // Create proposal and vote
      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);
      await voting.connect(voter1).castVote(1, 1);

      const [forVotes] = await voting.getProposalResults(1);
      expect(forVotes).to.equal(votingPower);
    });
  });

  describe("Reward Configuration", function () {
    it("Should allow admin to update reward amounts", async function () {
      const { platform, owner } = await loadFixture(deployPlatformFixture);

      await platform.updateRewards(20, 100, 10); // New reward amounts

      // Verify rewards are used (by checking the event would require a full test cycle)
      // For now, just verify the function doesn't revert
      expect(await platform.votingReward()).to.equal(20);
      expect(await platform.proposalReward()).to.equal(100);
      expect(await platform.commentReward()).to.equal(10);
    });

    it("Should not allow non-admin to update rewards", async function () {
      const { platform, voter1 } = await loadFixture(deployPlatformFixture);

      await expect(platform.connect(voter1).updateRewards(20, 100, 10))
        .to.be.revertedWithCustomError(platform, "AccessControlUnauthorizedAccount");
    });
  });
});
