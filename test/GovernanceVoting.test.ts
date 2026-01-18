import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("GovernanceVoting", function () {
  async function deployVotingFixture() {
    const [owner, proposer, voter1, voter2, voter3, delegate] = await hre.ethers.getSigners();

    // Deploy token
    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy("Governance Token", "GOV");

    // Deploy staking
    const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
    const staking = await TokenStaking.deploy(await token.getAddress());

    // Deploy voting
    const GovernanceVoting = await hre.ethers.getContractFactory("GovernanceVoting");
    const voting = await GovernanceVoting.deploy(await staking.getAddress());

    // Mint and stake tokens
    const amount = hre.ethers.parseEther("10000");
    await token.mint(voter1.address, amount);
    await token.mint(voter2.address, amount);
    await token.mint(voter3.address, amount);
    await token.mint(delegate.address, amount);

    // Grant roles
    const PROPOSAL_MANAGER_ROLE = await voting.PROPOSAL_MANAGER_ROLE();
    await voting.grantRole(PROPOSAL_MANAGER_ROLE, proposer.address);

    return { token, staking, voting, owner, proposer, voter1, voter2, voter3, delegate };
  }

  describe("Proposal Creation", function () {
    it("Should create a proposal", async function () {
      const { voting, proposer } = await loadFixture(deployVotingFixture);

      await expect(voting.connect(proposer).createProposal(
        "Test Proposal",
        "This is a test proposal",
        0, // Simple voting
        7 * 24 * 60 * 60 // 7 days
      ))
        .to.emit(voting, "ProposalCreated");

      const proposal = await voting.proposals(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.proposer).to.equal(proposer.address);
      expect(proposal.votingType).to.equal(0); // Simple
      expect(proposal.exists).to.be.true;
    });

    it("Should not allow non-manager to create proposal", async function () {
      const { voting, voter1 } = await loadFixture(deployVotingFixture);

      await expect(voting.connect(voter1).createProposal(
        "Test",
        "Test",
        0,
        7 * 24 * 60 * 60
      ))
        .to.be.revertedWithCustomError(voting, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Simple Voting", function () {
    it("Should allow users to vote with simple voting", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      // Stake tokens
      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1); // OneWeek lock (can't use 0)

      // Create proposal
      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      // Vote
      await expect(voting.connect(voter1).castVote(1, 1)) // VoteOption.For = 1
        .to.emit(voting, "VoteCast");

      const [forVotes] = await voting.getProposalResults(1);
      const votingPower = await staking.getEffectiveVotingPower(voter1.address);
      expect(forVotes).to.equal(votingPower); // Should equal effective voting power (with multiplier)
    });

    it("Should not allow voting after deadline", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(voting.connect(voter1).castVote(1, 1))
        .to.be.revertedWith("Voting period not active");
    });

    it("Should not allow voting twice", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      await voting.connect(voter1).castVote(1, 1);

      await expect(voting.connect(voter1).castVote(1, 0))
        .to.be.revertedWith("Already voted");
    });
  });

  describe("Quadratic Voting", function () {
    it("Should calculate voting power using square root for quadratic voting", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("10000"); // 10000 tokens
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 1, 7 * 24 * 60 * 60); // Quadratic

      await voting.connect(voter1).castVote(1, 1);

      const [forVotes] = await voting.getProposalResults(1);
      // Quadratic: sqrt(basePower * QUADRATIC_PRECISION) where basePower includes multiplier
      // With 1.2x multiplier: effective basePower = 10000 * 1.2 = 12000 tokens = 12e21 wei
      // sqrt(12e21 * 1e6) = sqrt(12e27) ≈ 109,544,511,501,033 wei ≈ 0.0001095 tokens
      // The quadratic voting reduces large stakes significantly
      expect(forVotes).to.be.gt(100000000000000n); // ~0.0001 tokens
      expect(forVotes).to.be.lt(200000000000000n); // ~0.0002 tokens
    });
  });

  describe("Delegation (Liquid Democracy)", function () {
    it("Should allow users to delegate voting power", async function () {
      const { token, staking, voting, proposer, voter1, delegate } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      await expect(voting.connect(voter1).delegateVote(1, delegate.address))
        .to.emit(voting, "VoteDelegated")
        .withArgs(voter1.address, delegate.address, 1);
    });

    it("Should prevent delegation loops", async function () {
      const { token, staking, voting, proposer, voter1, voter2 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await token.connect(voter2).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);
      await staking.connect(voter2).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      // Setup: voter1 delegates to voter2
      await voting.connect(voter1).delegateVote(1, voter2.address);

      // Try to create loop: voter2 delegates to voter1
      await expect(voting.connect(voter2).delegateVote(1, voter1.address))
        .to.be.revertedWith("Delegation loop detected");
    });

    it("Should not allow self-delegation", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      await expect(voting.connect(voter1).delegateVote(1, voter1.address))
        .to.be.revertedWith("Cannot delegate to self");
    });
  });

  describe("Batch Voting", function () {
    it("Should allow batch voting on multiple proposals", async function () {
      const { token, staking, voting, proposer, voter1 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(voter1).stake(stakeAmount, 1);

      // Create multiple proposals
      await voting.connect(proposer).createProposal("Proposal 1", "Test", 0, 7 * 24 * 60 * 60);
      await voting.connect(proposer).createProposal("Proposal 2", "Test", 0, 7 * 24 * 60 * 60);
      await voting.connect(proposer).createProposal("Proposal 3", "Test", 0, 7 * 24 * 60 * 60);

      // Batch vote
      await voting.connect(voter1).batchVote([1, 2, 3], [1, 1, 0]); // For, For, Against

      const [for1] = await voting.getProposalResults(1);
      const [for2] = await voting.getProposalResults(2);
      const [, against3] = await voting.getProposalResults(3);

      // With 1.2x multiplier (OneWeek lock)
      const expectedPower = hre.ethers.parseEther("1200"); // 1000 * 1.2
      expect(for1).to.equal(expectedPower);
      expect(for2).to.equal(expectedPower);
      expect(against3).to.equal(expectedPower);
    });

    it("Should enforce batch size limit", async function () {
      const { voting, voter1 } = await loadFixture(deployVotingFixture);

      const proposalIds = Array.from({ length: 11 }, (_, i) => i + 1);
      const options = Array(11).fill(1);

      await expect(voting.connect(voter1).batchVote(proposalIds, options))
        .to.be.revertedWith("Too many proposals in batch");
    });
  });

  describe("Proposal Results", function () {
    it("Should correctly calculate proposal results", async function () {
      const { token, staking, voting, proposer, voter1, voter2, voter3 } = await loadFixture(deployVotingFixture);

      const stakeAmount = hre.ethers.parseEther("1000");
      await token.connect(voter1).approve(await staking.getAddress(), stakeAmount);
      await token.connect(voter2).approve(await staking.getAddress(), stakeAmount);
      await token.connect(voter3).approve(await staking.getAddress(), stakeAmount);
      
      await staking.connect(voter1).stake(stakeAmount, 1);
      await staking.connect(voter2).stake(stakeAmount, 1);
      await staking.connect(voter3).stake(stakeAmount, 1);

      await voting.connect(proposer).createProposal("Test", "Test", 0, 7 * 24 * 60 * 60);

      await voting.connect(voter1).castVote(1, 1); // For
      await voting.connect(voter2).castVote(1, 1); // For
      await voting.connect(voter3).castVote(1, 0); // Against

      const [forVotes, againstVotes, abstainVotes, totalPower] = await voting.getProposalResults(1);

      // With 1.2x multiplier (OneWeek lock), each 1000 tokens = 1200 voting power
      expect(forVotes).to.equal(hre.ethers.parseEther("2400")); // 2000 * 1.2
      expect(againstVotes).to.equal(hre.ethers.parseEther("1200")); // 1000 * 1.2
      expect(abstainVotes).to.equal(0);
      expect(totalPower).to.equal(hre.ethers.parseEther("3600")); // 3000 * 1.2
    });
  });
});
