import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";

describe("GovernanceToken", function () {
  async function deployTokenFixture() {
    const [owner, minter, user1, user2] = await hre.ethers.getSigners();

    const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy("Governance Token", "GOV");

    return { token, owner, minter, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      expect(await token.name()).to.equal("Governance Token");
      expect(await token.symbol()).to.equal("GOV");
    });

    it("Should grant admin role to deployer", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should grant minter role to deployer", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const MINTER_ROLE = await token.MINTER_ROLE();
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to a user", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("1000");

      await expect(token.mint(user1.address, amount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(amount);
    });

    it("Should not allow non-minter to mint", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("1000");

      await expect(token.connect(user1).mint(user2.address, amount))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should allow admin to grant minter role", async function () {
      const { token, owner, minter } = await loadFixture(deployTokenFixture);
      const MINTER_ROLE = await token.MINTER_ROLE();

      await token.grantRole(MINTER_ROLE, minter.address);
      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.be.true;

      // Verify minter can mint
      const amount = hre.ethers.parseEther("500");
      await token.connect(minter).mint(minter.address, amount);
      expect(await token.balanceOf(minter.address)).to.equal(amount);
    });
  });

  describe("Burning", function () {
    it("Should allow token holder to burn their own tokens", async function () {
      const { token, owner, user1 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("1000");

      await token.mint(user1.address, amount);
      
      const burnAmount = hre.ethers.parseEther("300");
      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount);

      expect(await token.balanceOf(user1.address)).to.equal(amount - burnAmount);
      expect(await token.totalSupply()).to.equal(amount - burnAmount);
    });

    it("Should allow approved spender to burn from owner", async function () {
      const { token, owner, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("1000");

      await token.mint(user1.address, amount);
      await token.connect(user1).approve(user2.address, amount);

      const burnAmount = hre.ethers.parseEther("200");
      await token.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await token.balanceOf(user1.address)).to.equal(amount - burnAmount);
    });

    it("Should not allow burning more than balance", async function () {
      const { token, user1 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("100");
      await token.mint(user1.address, amount);

      await expect(token.connect(user1).burn(amount + 1n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between users", async function () {
      const { token, user1, user2 } = await loadFixture(deployTokenFixture);
      const amount = hre.ethers.parseEther("1000");
      await token.mint(user1.address, amount);

      const transferAmount = hre.ethers.parseEther("300");
      await token.connect(user1).transfer(user2.address, transferAmount);

      expect(await token.balanceOf(user1.address)).to.equal(amount - transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
    });
  });
});
