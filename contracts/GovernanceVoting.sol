// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TokenStaking.sol";

/**
 * @title GovernanceVoting
 * @dev Advanced voting system with quadratic voting, conviction voting, and delegation
 */
contract GovernanceVoting is AccessControl, ReentrancyGuard {
    bytes32 public constant PROPOSAL_MANAGER_ROLE = keccak256("PROPOSAL_MANAGER_ROLE");

    TokenStaking public tokenStaking;

    enum VotingType {
        Simple,        // 0 - One token = one vote
        Quadratic,     // 1 - Square root of tokens
        Conviction     // 2 - Voting power increases over time
    }

    enum VoteOption {
        Against,
        For,
        Abstain
    }

    struct Proposal {
        uint256 proposalId;
        address proposer;
        string title;
        string description;
        VotingType votingType;
        uint256 startTime;
        uint256 endTime;
        uint256 snapshotBlock;
        bool executed;
        bool exists;
    }

    struct Vote {
        address voter;
        VoteOption option;
        uint256 votingPower;
        uint256 timestamp;
        bool delegated;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes; // proposalId => voter => vote
    mapping(uint256 => uint256) public voteCounts; // proposalId => option => count
    mapping(uint256 => uint256) public totalVotingPower; // proposalId => total power
    mapping(address => address) public delegations; // delegator => delegate
    mapping(address => uint256[]) public delegatedProposals; // delegate => proposalIds
    mapping(uint256 => mapping(address => uint256)) public convictionStakes; // proposalId => voter => stake time

    uint256 public proposalCounter;
    uint256 public constant CONVICTION_DECAY_RATE = 1; // Per day decay
    uint256 public constant QUADRATIC_PRECISION = 1000000; // For sqrt calculations

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        VotingType votingType,
        uint256 endTime
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteOption option,
        uint256 votingPower,
        VotingType votingType
    );
    event VoteDelegated(address indexed delegator, address indexed delegate, uint256 proposalId);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _tokenStaking) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSAL_MANAGER_ROLE, msg.sender);
        tokenStaking = TokenStaking(_tokenStaking);
    }

    /**
     * @dev Create a new proposal
     * @param title Proposal title
     * @param description Proposal description
     * @param votingType Type of voting to use
     * @param duration Voting duration in seconds
     * @return proposalId The created proposal ID
     */
    function createProposal(
        string memory title,
        string memory description,
        VotingType votingType,
        uint256 duration
    ) external onlyRole(PROPOSAL_MANAGER_ROLE) returns (uint256 proposalId) {
        proposalCounter++;
        proposalId = proposalCounter;

        Proposal memory newProposal = Proposal({
            proposalId: proposalId,
            proposer: msg.sender,
            title: title,
            description: description,
            votingType: votingType,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            snapshotBlock: block.number - 1, // Use previous block for fairness
            executed: false,
            exists: true
        });

        proposals[proposalId] = newProposal;

        emit ProposalCreated(proposalId, msg.sender, title, votingType, newProposal.endTime);
        return proposalId;
    }

    /**
     * @dev Cast a vote on a proposal
     * @param proposalId The proposal ID
     * @param option Vote option (For/Against/Abstain)
     */
    function castVote(uint256 proposalId, VoteOption option) public nonReentrant {
        Proposal memory proposal = proposals[proposalId];
        require(proposal.exists, "Proposal does not exist");
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Voting period not active");
        require(!proposal.executed, "Proposal already executed");
        require(votes[proposalId][msg.sender].votingPower == 0, "Already voted");

        uint256 votingPower = _calculateVotingPower(msg.sender, proposal, proposalId);
        require(votingPower > 0, "No voting power");

        // Handle conviction voting - stake increases over time
        if (proposal.votingType == VotingType.Conviction) {
            convictionStakes[proposalId][msg.sender] = block.timestamp;
        }

        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            option: option,
            votingPower: votingPower,
            timestamp: block.timestamp,
            delegated: false
        });

        if (option == VoteOption.For) {
            voteCounts[proposalId * 3] += votingPower; // For votes
        } else if (option == VoteOption.Against) {
            voteCounts[proposalId * 3 + 1] += votingPower; // Against votes
        } else {
            voteCounts[proposalId * 3 + 2] += votingPower; // Abstain votes
        }

        totalVotingPower[proposalId] += votingPower;

        emit VoteCast(proposalId, msg.sender, option, votingPower, proposal.votingType);
    }

    /**
     * @dev Delegate voting power to another address (liquid democracy)
     * @param proposalId The proposal ID
     * @param delegate Address to delegate to
     */
    function delegateVote(uint256 proposalId, address delegate) external {
        require(delegate != msg.sender, "Cannot delegate to self");
        require(delegate != address(0), "Invalid delegate address");
        
        Proposal memory proposal = proposals[proposalId];
        require(proposal.exists, "Proposal does not exist");
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Voting period not active");
        require(!proposal.executed, "Proposal already executed");
        require(votes[proposalId][msg.sender].votingPower == 0, "Already voted");

        // Prevent delegation loops
        address current = delegate;
        for (uint256 i = 0; i < 10; i++) {
            if (current == msg.sender) {
                revert("Delegation loop detected");
            }
            address nextDelegate = delegations[current];
            if (nextDelegate == address(0)) break;
            current = nextDelegate;
        }

        uint256 votingPower = _calculateVotingPower(msg.sender, proposal, proposalId);
        require(votingPower > 0, "No voting power");

        delegations[msg.sender] = delegate;
        delegatedProposals[delegate].push(proposalId);

        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            option: VoteOption.For, // Delegate's vote determines this
            votingPower: votingPower,
            timestamp: block.timestamp,
            delegated: true
        });

        totalVotingPower[proposalId] += votingPower;

        emit VoteDelegated(msg.sender, delegate, proposalId);
    }

    /**
     * @dev Batch vote on multiple proposals
     * @param proposalIds Array of proposal IDs
     * @param options Array of vote options
     */
    function batchVote(uint256[] memory proposalIds, VoteOption[] memory options) external {
        require(proposalIds.length == options.length, "Arrays length mismatch");
        require(proposalIds.length <= 10, "Too many proposals in batch");

        for (uint256 i = 0; i < proposalIds.length; i++) {
            castVote(proposalIds[i], options[i]);
        }
    }

    /**
     * @dev Get proposal results
     * @param proposalId The proposal ID
     * @return forVotes Votes for the proposal
     * @return againstVotes Votes against the proposal
     * @return abstainVotes Abstain votes
     * @return totalPower Total voting power used
     */
    function getProposalResults(uint256 proposalId)
        external
        view
        returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 totalPower)
    {
        return (
            voteCounts[proposalId * 3],
            voteCounts[proposalId * 3 + 1],
            voteCounts[proposalId * 3 + 2],
            totalVotingPower[proposalId]
        );
    }

    /**
     * @dev Calculate voting power based on voting type
     * @param voter Address of the voter
     * @param proposal Proposal structure
     * @param proposalId Proposal ID for conviction voting
     * @return power Calculated voting power
     */
    function _calculateVotingPower(address voter, Proposal memory proposal, uint256 proposalId) 
        internal 
        view 
        returns (uint256 power) 
    {
        uint256 basePower = tokenStaking.getEffectiveVotingPower(voter);

        if (proposal.votingType == VotingType.Simple) {
            return basePower;
        } else if (proposal.votingType == VotingType.Quadratic) {
            // Quadratic: sqrt(basePower) * QUADRATIC_PRECISION
            return _sqrt(basePower * QUADRATIC_PRECISION);
        } else if (proposal.votingType == VotingType.Conviction) {
            // Conviction: power increases with time since stake
            uint256 stakeTime = convictionStakes[proposalId][voter];
            if (stakeTime == 0) {
                return basePower;
            }
            uint256 daysStaked = (block.timestamp - stakeTime) / 1 days;
            // Linear increase: 1x base + (days * 0.1x)
            return basePower + (basePower * daysStaked * 10) / 100;
        }

        return basePower;
    }

    /**
     * @dev Calculate square root (Babylonian method)
     * @param x Input value
     * @return sqrt Square root result
     */
    function _sqrt(uint256 x) internal pure returns (uint256 sqrt) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Execute a proposal (after voting period ends)
     * @param proposalId The proposal ID
     */
    function executeProposal(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.exists, "Proposal does not exist");
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }
}
