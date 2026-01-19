/**
 * Setup script to grant necessary roles to GovernancePlatform after deployment
 * Run this after deploying the platform to set up permissions
 */

import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting up roles with account:", deployer.address);

  // Get deployed contract addresses from deployment artifacts
  // These should match the addresses from your deployment
  const governanceTokenAddress = process.env.GOVERNANCE_TOKEN_ADDRESS;
  const reputationSystemAddress = process.env.REPUTATION_SYSTEM_ADDRESS;
  const badgeNFTAddress = process.env.BADGE_NFT_ADDRESS;
  const governancePlatformAddress = process.env.GOVERNANCE_PLATFORM_ADDRESS;

  if (!governanceTokenAddress || !reputationSystemAddress || !badgeNFTAddress || !governancePlatformAddress) {
    throw new Error("Please set all required environment variables: GOVERNANCE_TOKEN_ADDRESS, REPUTATION_SYSTEM_ADDRESS, BADGE_NFT_ADDRESS, GOVERNANCE_PLATFORM_ADDRESS");
  }

  // Get contract instances
  const GovernanceToken = await hre.ethers.getContractAt("GovernanceToken", governanceTokenAddress);
  const ReputationSystem = await hre.ethers.getContractAt("ReputationSystem", reputationSystemAddress);
  const GovernanceBadgeNFT = await hre.ethers.getContractAt("GovernanceBadgeNFT", badgeNFTAddress);

  console.log("Granting MINTER_ROLE to GovernancePlatform...");
  const MINTER_ROLE = await GovernanceToken.MINTER_ROLE();
  const tx1 = await GovernanceToken.grantRole(MINTER_ROLE, governancePlatformAddress);
  await tx1.wait();
  console.log("✓ MINTER_ROLE granted to GovernancePlatform");

  console.log("Granting REPUTATION_MANAGER_ROLE to GovernancePlatform...");
  const REPUTATION_MANAGER_ROLE = await ReputationSystem.REPUTATION_MANAGER_ROLE();
  const tx2 = await ReputationSystem.grantRole(REPUTATION_MANAGER_ROLE, governancePlatformAddress);
  await tx2.wait();
  console.log("✓ REPUTATION_MANAGER_ROLE granted to GovernancePlatform");

  console.log("Granting MINTER_ROLE to GovernancePlatform for badges...");
  const BADGE_MINTER_ROLE = await GovernanceBadgeNFT.MINTER_ROLE();
  const tx3 = await GovernanceBadgeNFT.grantRole(BADGE_MINTER_ROLE, governancePlatformAddress);
  await tx3.wait();
  console.log("✓ Badge MINTER_ROLE granted to GovernancePlatform");

  console.log("Granting LEVEL_MANAGER_ROLE to GovernancePlatform for badges...");
  const BADGE_LEVEL_MANAGER_ROLE = await GovernanceBadgeNFT.LEVEL_MANAGER_ROLE();
  const tx4 = await GovernanceBadgeNFT.grantRole(BADGE_LEVEL_MANAGER_ROLE, governancePlatformAddress);
  await tx4.wait();
  console.log("✓ Badge LEVEL_MANAGER_ROLE granted to GovernancePlatform");

  console.log("\n✅ All roles have been granted successfully!");
  console.log("GovernancePlatform address:", governancePlatformAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
