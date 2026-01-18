// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./GovernanceToken.sol";
import "./ReputationSystem.sol";
import "./GovernanceBadgeNFT.sol";
import "./TokenStaking.sol";
import "./GovernanceVoting.sol";
import "./OnchainDiscussions.sol";

/**
 * @title GovernancePlatform
 * @dev Main governance platform contract integrating all components
 */
contract GovernancePlatform is AccessControl {
    bytes32 public constant PLATFORM_MANAGER_ROLE = keccak256("PLATFORM_MANAGER_ROLE");

    GovernanceToken public governanceToken;
    ReputationSystem public reputationSystem;
    GovernanceBadgeNFT public badgeNFT;
    TokenStaking public tokenStaking;
    GovernanceVoting public governanceVoting;
    OnchainDiscussions public discussions;

    // Reward configurations
    uint256 public votingReward = 10; // Reputation points for voting
    uint256 public proposalReward = 50; // Reputation points for creating proposal
    uint256 public commentReward = 5; // Reputation points for commenting
    uint256 public stakingRewardMultiplier = 100; // Basis points for staking rewards

    event PlatformInitialized(
        address governanceToken,
        address reputationSystem,
        address badgeNFT,
        address tokenStaking,
        address governanceVoting,
        address discussions
    );
    event RewardsDistributed(address indexed user, string action, uint256 reputationPoints);
    event BadgeAwarded(address indexed user, GovernanceBadgeNFT.BadgeType badgeType, uint256 tokenId);

    constructor(
        address _governanceToken,
        address _reputationSystem,
        address _badgeNFT,
        address _tokenStaking,
        address _governanceVoting,
        address _discussions
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_MANAGER_ROLE, msg.sender);

        governanceToken = GovernanceToken(_governanceToken);
        reputationSystem = ReputationSystem(_reputationSystem);
        badgeNFT = GovernanceBadgeNFT(_badgeNFT);
        tokenStaking = TokenStaking(_tokenStaking);
        governanceVoting = GovernanceVoting(_governanceVoting);
        discussions = OnchainDiscussions(_discussions);

        emit PlatformInitialized(
            _governanceToken,
            _reputationSystem,
            _badgeNFT,
            _tokenStaking,
            _governanceVoting,
            _discussions
        );
    }

    /**
     * @dev Award reputation and badges for voting
     * @param voter Address of the voter
     */
    function handleVotingReward(address voter, uint256 /* proposalId */) external {
        require(msg.sender == address(governanceVoting), "Only voting contract can call");

        // Award reputation points
        reputationSystem.awardReputation(voter, votingReward, "Voting participation");

        // Check and award voting badge
        if (!badgeNFT.hasBadge(voter, GovernanceBadgeNFT.BadgeType.Voter)) {
            _mintBadge(voter, GovernanceBadgeNFT.BadgeType.Voter);
        } else {
            // Add experience to existing badge
            uint256 badgeId = badgeNFT.getUserBadge(voter, GovernanceBadgeNFT.BadgeType.Voter);
            badgeNFT.addExperience(badgeId, 10, ""); // Experience added, URI unchanged if no level up
        }

        emit RewardsDistributed(voter, "Voting", votingReward);
    }

    /**
     * @dev Award reputation and badges for creating proposal
     * @param proposer Address of the proposer
     */
    function handleProposalReward(address proposer, uint256 /* proposalId */) external {
        require(msg.sender == address(governanceVoting), "Only voting contract can call");

        // Award reputation points
        reputationSystem.awardReputation(proposer, proposalReward, "Proposal creation");

        // Check and award proposal creator badge
        if (!badgeNFT.hasBadge(proposer, GovernanceBadgeNFT.BadgeType.ProposalCreator)) {
            _mintBadge(proposer, GovernanceBadgeNFT.BadgeType.ProposalCreator);
        } else {
            uint256 badgeId = badgeNFT.getUserBadge(proposer, GovernanceBadgeNFT.BadgeType.ProposalCreator);
            badgeNFT.addExperience(badgeId, 50, "");
        }

        emit RewardsDistributed(proposer, "Proposal Creation", proposalReward);
    }

    /**
     * @dev Award reputation for commenting
     * @param commenter Address of the commenter
     */
    function handleCommentReward(address commenter) external {
        require(msg.sender == address(discussions), "Only discussions contract can call");

        // Award reputation points
        reputationSystem.awardReputation(commenter, commentReward, "Discussion participation");

        emit RewardsDistributed(commenter, "Commenting", commentReward);
    }

    /**
     * @dev Award badge for participation milestones
     * @param participant Address of the participant
     */
    function awardParticipationBadge(address participant) external onlyRole(PLATFORM_MANAGER_ROLE) {
        if (!badgeNFT.hasBadge(participant, GovernanceBadgeNFT.BadgeType.Participation)) {
            _mintBadge(participant, GovernanceBadgeNFT.BadgeType.Participation);
        }
    }

    /**
     * @dev Check reputation level and award Elder badge if applicable
     * @param user Address of the user
     */
    function checkElderStatus(address user) external {
        (ReputationSystem.ReputationLevel level, , ) = reputationSystem.getUserReputation(user);
        
        if (level == ReputationSystem.ReputationLevel.Elder) {
            if (!badgeNFT.hasBadge(user, GovernanceBadgeNFT.BadgeType.Elder)) {
                _mintBadge(user, GovernanceBadgeNFT.BadgeType.Elder);
            }
        }
    }

    /**
     * @dev Mint a badge to a user
     * @param to Address to mint badge to
     * @param badgeType Type of badge to mint
     */
    function _mintBadge(address to, GovernanceBadgeNFT.BadgeType badgeType) internal {
        string memory ipfsURI = _getDefaultBadgeURI(badgeType);
        uint256 tokenId = badgeNFT.mintBadge(to, badgeType, ipfsURI);
        emit BadgeAwarded(to, badgeType, tokenId);
    }

    /**
     * @dev Get default IPFS URI for badge type (placeholder)
     * @param badgeType Type of badge
     * @return uri IPFS URI string
     */
    function _getDefaultBadgeURI(GovernanceBadgeNFT.BadgeType badgeType) internal pure returns (string memory uri) {
        if (badgeType == GovernanceBadgeNFT.BadgeType.Participation) {
            return "ipfs://QmParticipationBadgeURI";
        } else if (badgeType == GovernanceBadgeNFT.BadgeType.ProposalCreator) {
            return "ipfs://QmProposalCreatorBadgeURI";
        } else if (badgeType == GovernanceBadgeNFT.BadgeType.Voter) {
            return "ipfs://QmVoterBadgeURI";
        } else if (badgeType == GovernanceBadgeNFT.BadgeType.Delegator) {
            return "ipfs://QmDelegatorBadgeURI";
        } else if (badgeType == GovernanceBadgeNFT.BadgeType.Elder) {
            return "ipfs://QmElderBadgeURI";
        }
        return "ipfs://QmDefaultBadgeURI";
    }

    /**
     * @dev Update reward configurations (admin only)
     * @param _votingReward New voting reward
     * @param _proposalReward New proposal reward
     * @param _commentReward New comment reward
     */
    function updateRewards(
        uint256 _votingReward,
        uint256 _proposalReward,
        uint256 _commentReward
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingReward = _votingReward;
        proposalReward = _proposalReward;
        commentReward = _commentReward;
    }

    /**
     * @dev Get platform statistics for a user
     * @param user Address of the user
     * @return tokenBalance Governance token balance
     * @return stakedBalance Total staked tokens
     * @return reputationLevel Current reputation level
     * @return reputationPoints Current reputation points
     * @return badgeCount Number of badges owned
     */
    function getUserStats(address user)
        external
        view
        returns (
            uint256 tokenBalance,
            uint256 stakedBalance,
            ReputationSystem.ReputationLevel reputationLevel,
            uint256 reputationPoints,
            uint256 badgeCount
        )
    {
        tokenBalance = governanceToken.balanceOf(user);
        stakedBalance = tokenStaking.totalStaked(user);
        (reputationLevel, reputationPoints, ) = reputationSystem.getUserReputation(user);
        
        // Count badges (simplified - check each type)
        badgeCount = 0;
        for (uint8 i = 0; i < 5; i++) {
            if (badgeNFT.hasBadge(user, GovernanceBadgeNFT.BadgeType(i))) {
                badgeCount++;
            }
        }
        
        return (tokenBalance, stakedBalance, reputationLevel, reputationPoints, badgeCount);
    }
}
