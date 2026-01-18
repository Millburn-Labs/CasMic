import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("GovernanceBadgeNFT", function () {
  async function deployBadgeFixture() {
    const [owner, minter, manager, user1, user2] = await hre.ethers.getSigners();

    const GovernanceBadgeNFT = await hre.ethers.getContractFactory("GovernanceBadgeNFT");
    const badge = await GovernanceBadgeNFT.deploy("Governance Badges", "GBADGE");

    return { badge, owner, minter, manager, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set correct name and symbol", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);
      expect(await badge.name()).to.equal("Governance Badges");
      expect(await badge.symbol()).to.equal("GBADGE");
    });
  });

  describe("Minting", function () {
    it("Should mint a badge to a user", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);
      const ipfsURI = "ipfs://QmTestBadge";

      await expect(badge.mintBadge(user1.address, 0, ipfsURI)) // BadgeType.Participation = 0
        .to.emit(badge, "BadgeMinted")
        .withArgs(user1.address, 1, 0, ipfsURI);

      expect(await badge.ownerOf(1)).to.equal(user1.address);
      expect(await badge.tokenURI(1)).to.equal(ipfsURI);
      expect(await badge.balanceOf(user1.address)).to.equal(1);
    });

    it("Should prevent minting duplicate badge types to same user", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);
      const ipfsURI = "ipfs://QmTestBadge";

      await badge.mintBadge(user1.address, 0, ipfsURI);

      await expect(badge.mintBadge(user1.address, 0, ipfsURI))
        .to.be.revertedWith("User already has this badge type");
    });

    it("Should allow minting different badge types to same user", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge1"); // Participation
      await badge.mintBadge(user1.address, 1, "ipfs://QmBadge2"); // ProposalCreator

      expect(await badge.balanceOf(user1.address)).to.equal(2);
      expect(await badge.hasBadge(user1.address, 0)).to.be.true;
      expect(await badge.hasBadge(user1.address, 1)).to.be.true;
    });

    it("Should not allow non-minter to mint", async function () {
      const { badge, user1, user2 } = await loadFixture(deployBadgeFixture);

      await expect(badge.connect(user1).mintBadge(user2.address, 0, "ipfs://QmBadge"))
        .to.be.revertedWithCustomError(badge, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Experience and Leveling", function () {
    it("Should add experience to a badge", async function () {
      const { badge, owner, manager, user1 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge");

      const tokenId = await badge.getUserBadge(user1.address, 0);
      
      await expect(badge.addExperience(tokenId, 500, ""))
        .to.emit(badge, "BadgeExperienceAdded")
        .withArgs(tokenId, 500, 500);

      const metadata = await badge.getBadgeMetadata(tokenId);
      expect(metadata.experience).to.equal(500);
      expect(metadata.level).to.equal(1); // Still level 1 (< 1000 exp)
    });

    it("Should level up badge when experience threshold is met", async function () {
      const { badge, owner, manager, user1 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge");
      const tokenId = await badge.getUserBadge(user1.address, 0);

      const newIpfsURI = "ipfs://QmLevel2Badge";

      await expect(badge.addExperience(tokenId, 1000, newIpfsURI))
        .to.emit(badge, "BadgeLeveledUp")
        .withArgs(tokenId, 1, 2, newIpfsURI);

      const metadata = await badge.getBadgeMetadata(tokenId);
      expect(metadata.level).to.equal(2);
      expect(metadata.ipfsURI).to.equal(newIpfsURI);
      expect(await badge.tokenURI(tokenId)).to.equal(newIpfsURI);
    });

    it("Should not allow non-manager to add experience", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge");
      const tokenId = await badge.getUserBadge(user1.address, 0);

      await expect(badge.connect(user1).addExperience(tokenId, 100, ""))
        .to.be.revertedWithCustomError(badge, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Badge Metadata", function () {
    it("Should return correct badge metadata", async function () {
      const { badge, owner, manager, user1 } = await loadFixture(deployBadgeFixture);
      const ipfsURI = "ipfs://QmTestBadge";

      await badge.mintBadge(user1.address, 2, ipfsURI); // BadgeType.Voter = 2
      const tokenId = await badge.getUserBadge(user1.address, 2);

      const metadata = await badge.getBadgeMetadata(tokenId);
      expect(metadata.badgeType).to.equal(2);
      expect(metadata.level).to.equal(1);
      expect(metadata.experience).to.equal(0);
      expect(metadata.ipfsURI).to.equal(ipfsURI);
    });
  });

  describe("Badge Queries", function () {
    it("Should correctly check if user has a badge", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);

      expect(await badge.hasBadge(user1.address, 0)).to.be.false;

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge");

      expect(await badge.hasBadge(user1.address, 0)).to.be.true;
      expect(await badge.hasBadge(user1.address, 1)).to.be.false;
    });

    it("Should return correct token ID for user badge", async function () {
      const { badge, owner, user1 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 1, "ipfs://QmBadge");
      
      const tokenId = await badge.getUserBadge(user1.address, 1);
      expect(tokenId).to.equal(1);
      expect(await badge.ownerOf(tokenId)).to.equal(user1.address);
    });
  });

  describe("NFT Standard Functions", function () {
    it("Should support ERC721 interface", async function () {
      const { badge } = await loadFixture(deployBadgeFixture);
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await badge.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("Should allow transferring badges", async function () {
      const { badge, owner, user1, user2 } = await loadFixture(deployBadgeFixture);

      await badge.mintBadge(user1.address, 0, "ipfs://QmBadge");
      const tokenId = 1;

      await badge.connect(user1).transferFrom(user1.address, user2.address, tokenId);

      expect(await badge.ownerOf(tokenId)).to.equal(user2.address);
      expect(await badge.balanceOf(user1.address)).to.equal(0);
      expect(await badge.balanceOf(user2.address)).to.equal(1);
    });
  });
});
