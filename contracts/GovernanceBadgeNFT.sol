// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernanceBadgeNFT
 * @dev Evolving NFT badges for governance achievements with IPFS imagery
 */
contract GovernanceBadgeNFT is ERC721, ERC721URIStorage, ERC721Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant LEVEL_MANAGER_ROLE = keccak256("LEVEL_MANAGER_ROLE");

    uint256 private _tokenIdCounter;

    enum BadgeType {
        Participation,
        ProposalCreator,
        Voter,
        Delegator,
        Elder
    }

    struct BadgeMetadata {
        BadgeType badgeType;
        uint256 level;
        uint256 experience;
        string ipfsURI; // Base IPFS URI
        uint256 createdAt;
        uint256 lastUpgrade;
    }

    mapping(uint256 => BadgeMetadata) public badgeMetadata;
    mapping(address => mapping(BadgeType => uint256)) public userBadges; // user => badgeType => tokenId

    event BadgeMinted(address indexed to, uint256 tokenId, BadgeType badgeType, string ipfsURI);
    event BadgeLeveledUp(uint256 indexed tokenId, uint256 oldLevel, uint256 newLevel, string newIpfsURI);
    event BadgeExperienceAdded(uint256 indexed tokenId, uint256 experience, uint256 newTotal);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(LEVEL_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new badge to a user
     * @param to Address to mint the badge to
     * @param badgeType Type of badge being minted
     * @param ipfsURI IPFS URI for the badge image/metadata
     * @return tokenId The newly minted token ID
     */
    function mintBadge(address to, BadgeType badgeType, string memory ipfsURI) 
        external 
        onlyRole(MINTER_ROLE) 
        returns (uint256 tokenId) 
    {
        // Check if user already has this badge type
        require(userBadges[to][badgeType] == 0, "User already has this badge type");

        _tokenIdCounter++;
        tokenId = _tokenIdCounter;

        badgeMetadata[tokenId] = BadgeMetadata({
            badgeType: badgeType,
            level: 1,
            experience: 0,
            ipfsURI: ipfsURI,
            createdAt: block.timestamp,
            lastUpgrade: block.timestamp
        });

        userBadges[to][badgeType] = tokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsURI);

        emit BadgeMinted(to, tokenId, badgeType, ipfsURI);
        return tokenId;
    }

    /**
     * @dev Add experience to a badge and level it up if threshold is met
     * @param tokenId The badge token ID
     * @param experience Amount of experience to add
     * @param newIpfsURI New IPFS URI if level up occurs
     */
    function addExperience(uint256 tokenId, uint256 experience, string memory newIpfsURI) 
        external 
        onlyRole(LEVEL_MANAGER_ROLE) 
    {
        require(_ownerOf(tokenId) != address(0), "Badge does not exist");
        
        BadgeMetadata storage badge = badgeMetadata[tokenId];
        uint256 oldLevel = badge.level;
        
        badge.experience += experience;
        
        // Calculate new level (every 1000 experience = 1 level)
        uint256 newLevel = (badge.experience / 1000) + 1;
        
        if (newLevel > oldLevel) {
            badge.level = newLevel;
            badge.lastUpgrade = block.timestamp;
            badge.ipfsURI = newIpfsURI;
            _setTokenURI(tokenId, newIpfsURI);
            emit BadgeLeveledUp(tokenId, oldLevel, newLevel, newIpfsURI);
        }
        
        emit BadgeExperienceAdded(tokenId, experience, badge.experience);
    }

    /**
     * @dev Get badge metadata
     * @param tokenId The badge token ID
     * @return metadata Badge metadata structure
     */
    function getBadgeMetadata(uint256 tokenId) 
        external 
        view 
        returns (BadgeMetadata memory metadata) 
    {
        return badgeMetadata[tokenId];
    }

    /**
     * @dev Get user's badge by type
     * @param user Address of the user
     * @param badgeType Type of badge
     * @return tokenId The badge token ID (0 if not found)
     */
    function getUserBadge(address user, BadgeType badgeType) 
        external 
        view 
        returns (uint256 tokenId) 
    {
        return userBadges[user][badgeType];
    }

    /**
     * @dev Check if user has a specific badge type
     * @param user Address of the user
     * @param badgeType Type of badge
     * @return userHasBadge True if user has the badge
     */
    function hasBadge(address user, BadgeType badgeType) 
        external 
        view 
        returns (bool userHasBadge) 
    {
        return userBadges[user][badgeType] != 0;
    }

    /**
     * @dev Override required by Solidity
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override required by Solidity
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override required by Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}


