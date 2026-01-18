// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TokenStaking
 * @dev Time-locked token staking with enhanced voting power multipliers
 */
contract TokenStaking is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant VOTING_POWER_MANAGER_ROLE = keccak256("VOTING_POWER_MANAGER_ROLE");

    IERC20 public governanceToken;

    enum LockPeriod {
        None,       // 0 - No lock (1x multiplier)
        OneWeek,    // 1 - 1 week (1.2x multiplier)
        OneMonth,   // 2 - 1 month (1.5x multiplier)
        ThreeMonth, // 3 - 3 months (2x multiplier)
        SixMonth,   // 4 - 6 months (2.5x multiplier)
        OneYear     // 5 - 1 year (3x multiplier)
    }

    struct Stake {
        uint256 amount;
        LockPeriod lockPeriod;
        uint256 lockStartTime;
        uint256 unlockTime;
        bool isActive;
    }

    mapping(address => Stake[]) public userStakes;
    mapping(address => uint256) public totalStaked;
    mapping(LockPeriod => uint256) public lockPeriodDurations;
    mapping(LockPeriod => uint256) public votingPowerMultipliers;

    event TokensStaked(address indexed user, uint256 amount, LockPeriod lockPeriod, uint256 unlockTime);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 stakeIndex);
    event LockPeriodUpdated(LockPeriod period, uint256 duration, uint256 multiplier);

    constructor(address _governanceToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VOTING_POWER_MANAGER_ROLE, msg.sender);
        
        governanceToken = IERC20(_governanceToken);

        // Set lock period durations (in seconds)
        lockPeriodDurations[LockPeriod.OneWeek] = 7 days;
        lockPeriodDurations[LockPeriod.OneMonth] = 30 days;
        lockPeriodDurations[LockPeriod.ThreeMonth] = 90 days;
        lockPeriodDurations[LockPeriod.SixMonth] = 180 days;
        lockPeriodDurations[LockPeriod.OneYear] = 365 days;

        // Set voting power multipliers (in basis points, 10000 = 1x)
        votingPowerMultipliers[LockPeriod.None] = 10000; // 1x
        votingPowerMultipliers[LockPeriod.OneWeek] = 12000; // 1.2x
        votingPowerMultipliers[LockPeriod.OneMonth] = 15000; // 1.5x
        votingPowerMultipliers[LockPeriod.ThreeMonth] = 20000; // 2x
        votingPowerMultipliers[LockPeriod.SixMonth] = 25000; // 2.5x
        votingPowerMultipliers[LockPeriod.OneYear] = 30000; // 3x
    }

    /**
     * @dev Stake tokens with a specified lock period
     * @param amount Amount of tokens to stake
     * @param lockPeriod Lock period for the stake
     */
    function stake(uint256 amount, LockPeriod lockPeriod) external {
        require(amount > 0, "Amount must be greater than 0");
        require(lockPeriod != LockPeriod.None || amount == 0, "Invalid lock period");

        governanceToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 unlockTime = lockPeriod == LockPeriod.None 
            ? block.timestamp 
            : block.timestamp + lockPeriodDurations[lockPeriod];

        Stake memory newStake = Stake({
            amount: amount,
            lockPeriod: lockPeriod,
            lockStartTime: block.timestamp,
            unlockTime: unlockTime,
            isActive: true
        });

        userStakes[msg.sender].push(newStake);
        totalStaked[msg.sender] += amount;

        emit TokensStaked(msg.sender, amount, lockPeriod, unlockTime);
    }

    /**
     * @dev Unstake tokens (only if lock period has passed)
     * @param stakeIndex Index of the stake to unstake
     */
    function unstake(uint256 stakeIndex) external {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        Stake storage userStake = userStakes[msg.sender][stakeIndex];
        require(userStake.isActive, "Stake already unstaked");
        require(block.timestamp >= userStake.unlockTime, "Lock period not expired");

        uint256 amount = userStake.amount;
        userStake.isActive = false;
        totalStaked[msg.sender] -= amount;

        governanceToken.safeTransfer(msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount, stakeIndex);
    }

    /**
     * @dev Get total effective voting power for a user
     * @param user Address of the user
     * @return votingPower Total effective voting power (tokens * multiplier)
     */
    function getEffectiveVotingPower(address user) external view returns (uint256 votingPower) {
        Stake[] memory stakes = userStakes[user];
        uint256 totalPower = 0;

        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].isActive) {
                uint256 multiplier = votingPowerMultipliers[stakes[i].lockPeriod];
                totalPower += (stakes[i].amount * multiplier) / 10000;
            }
        }

        return totalPower;
    }

    /**
     * @dev Get user's staking information
     * @param user Address of the user
     * @return stakes Array of user's stakes
     * @return totalStakedAmount Total amount of tokens staked
     */
    function getUserStakes(address user) 
        external 
        view 
        returns (Stake[] memory stakes, uint256 totalStakedAmount) 
    {
        return (userStakes[user], totalStaked[user]);
    }

    /**
     * @dev Update lock period configuration (admin only)
     * @param period Lock period to update
     * @param duration New duration in seconds
     * @param multiplier New multiplier in basis points
     */
    function updateLockPeriod(LockPeriod period, uint256 duration, uint256 multiplier) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(period != LockPeriod.None, "Cannot update None period");
        lockPeriodDurations[period] = duration;
        votingPowerMultipliers[period] = multiplier;
        
        emit LockPeriodUpdated(period, duration, multiplier);
    }
}
