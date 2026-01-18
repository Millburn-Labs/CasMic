// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ReputationSystem
 * @dev Hierarchical reputation system with levels from Newcomer to Elder
 */
contract ReputationSystem is AccessControl {
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");

    enum ReputationLevel {
        Newcomer,      // 0 - Starting level
        Member,        // 1 - Basic participation
        Contributor,  // 2 - Active contribution
        Veteran,       // 3 - Long-term member
        Elder          // 4 - Highest level with special privileges
    }

    struct UserReputation {
        ReputationLevel level;
        uint256 reputationPoints;
        uint256 participationCount;
        uint256 lastUpdate;
    }

    mapping(address => UserReputation) public userReputations;
    mapping(ReputationLevel => uint256) public levelThresholds;

    event ReputationUpdated(address indexed user, ReputationLevel oldLevel, ReputationLevel newLevel, uint256 points);
    event ReputationPointsAwarded(address indexed user, uint256 points, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPUTATION_MANAGER_ROLE, msg.sender);

        // Set reputation thresholds for each level
        levelThresholds[ReputationLevel.Newcomer] = 0;
        levelThresholds[ReputationLevel.Member] = 100;
        levelThresholds[ReputationLevel.Contributor] = 500;
        levelThresholds[ReputationLevel.Veteran] = 2000;
        levelThresholds[ReputationLevel.Elder] = 10000;
    }

    /**
     * @dev Award reputation points to a user
     * @param user Address of the user
     * @param points Amount of points to award
     * @param reason Reason for awarding points
     */
    function awardReputation(address user, uint256 points, string memory reason) 
        external 
        onlyRole(REPUTATION_MANAGER_ROLE) 
    {
        UserReputation storage rep = userReputations[user];
        ReputationLevel oldLevel = rep.level;

        rep.reputationPoints += points;
        rep.participationCount += 1;
        rep.lastUpdate = block.timestamp;

        // Check for level up
        ReputationLevel newLevel = _calculateLevel(rep.reputationPoints);
        if (newLevel > oldLevel) {
            rep.level = newLevel;
            emit ReputationUpdated(user, oldLevel, newLevel, rep.reputationPoints);
        }

        emit ReputationPointsAwarded(user, points, reason);
    }

    /**
     * @dev Get user's current reputation level
     * @param user Address of the user
     * @return level Current reputation level
     * @return points Current reputation points
     * @return participationCount Total participation count
     */
    function getUserReputation(address user) 
        external 
        view 
        returns (ReputationLevel level, uint256 points, uint256 participationCount) 
    {
        UserReputation memory rep = userReputations[user];
        return (rep.level, rep.reputationPoints, rep.participationCount);
    }

    /**
     * @dev Check if user has required level for an action
     * @param user Address of the user
     * @param requiredLevel Minimum required level
     * @return hasAccess True if user meets the requirement
     */
    function hasRequiredLevel(address user, ReputationLevel requiredLevel) 
        external 
        view 
        returns (bool hasAccess) 
    {
        return uint8(userReputations[user].level) >= uint8(requiredLevel);
    }

    /**
     * @dev Get abilities unlocked for a specific level
     * @param level Reputation level
     * @return abilities Array of ability strings
     */
    function getUnlockedAbilities(ReputationLevel level) 
        external 
        pure 
        returns (string[] memory abilities) 
    {
        if (level == ReputationLevel.Newcomer) {
            abilities = new string[](2);
            abilities[0] = "Basic Voting";
            abilities[1] = "View Proposals";
        } else if (level == ReputationLevel.Member) {
            abilities = new string[](3);
            abilities[0] = "Basic Voting";
            abilities[1] = "View Proposals";
            abilities[2] = "Create Comments";
        } else if (level == ReputationLevel.Contributor) {
            abilities = new string[](4);
            abilities[0] = "Basic Voting";
            abilities[1] = "View Proposals";
            abilities[2] = "Create Comments";
            abilities[3] = "Create Proposals";
        } else if (level == ReputationLevel.Veteran) {
            abilities = new string[](5);
            abilities[0] = "Basic Voting";
            abilities[1] = "View Proposals";
            abilities[2] = "Create Comments";
            abilities[3] = "Create Proposals";
            abilities[4] = "Delegate Voting";
        } else if (level == ReputationLevel.Elder) {
            abilities = new string[](7);
            abilities[0] = "Basic Voting";
            abilities[1] = "View Proposals";
            abilities[2] = "Create Comments";
            abilities[3] = "Create Proposals";
            abilities[4] = "Delegate Voting";
            abilities[5] = "Moderate Proposals";
            abilities[6] = "Elder Governance Powers";
        }
        return abilities;
    }

    /**
     * @dev Calculate reputation level based on points
     * @param points Total reputation points
     * @return level Calculated reputation level
     */
    function _calculateLevel(uint256 points) internal view returns (ReputationLevel level) {
        if (points >= levelThresholds[ReputationLevel.Elder]) {
            return ReputationLevel.Elder;
        } else if (points >= levelThresholds[ReputationLevel.Veteran]) {
            return ReputationLevel.Veteran;
        } else if (points >= levelThresholds[ReputationLevel.Contributor]) {
            return ReputationLevel.Contributor;
        } else if (points >= levelThresholds[ReputationLevel.Member]) {
            return ReputationLevel.Member;
        } else {
            return ReputationLevel.Newcomer;
        }
    }

    /**
     * @dev Update level threshold (admin only)
     * @param level Reputation level
     * @param threshold New threshold value
     */
    function setLevelThreshold(ReputationLevel level, uint256 threshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        levelThresholds[level] = threshold;
    }
}
