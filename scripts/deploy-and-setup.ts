/**
 * Complete deployment and setup script for Governance Platform
 * This script handles deployment and role setup in one go
 */

import hre from "hardhat";

/**
 * Helper function to verify contracts on block explorer
 */
async function verifyContract(
  contractAddress: string,
  contractName: string,
  constructorArguments: any[] = []
) {
  // Skip verification for local networks
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log(`⏭️  Skipping verification for ${contractName} on local network`);
    return;
  }

  // Skip if no API key is set
  const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.log(`⚠️  Skipping verification for ${contractName} - no API key found`);
    return;
  }

  try {
    console.log(`\n🔍 Verifying ${contractName} at ${contractAddress}...`);
    
    // Wait a bit for the contract to be indexed by the block explorer
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    
    console.log(`✓ ${contractName} verified successfully`);
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log(`✓ ${contractName} already verified`);
    } else {
      console.error(`⚠️  Failed to verify ${contractName}:`, error.message);
      // Don't throw - continue with deployment even if verification fails
    }
  }
}

async function main() {
  const signers = await hre.ethers.getSigners();
  
  if (signers.length === 0) {
    throw new Error(
      "No deployer account found. Please set PRIVATE_KEY in your .env file.\n" +
      "Example: PRIVATE_KEY=0x1234567890abcdef..."
    );
  }
  
  const [deployer] = signers;
  const networkName = hre.network.name;

  console.log("=".repeat(60));
  console.log(`Deploying Governance Platform to: ${networkName}`);
  console.log("Deployer address:", deployer.address);
  console.log("=".repeat(60));

  const tokenName = "Governance Token";
  const tokenSymbol = "GOV";
  const badgeName = "Governance Badges";
  const badgeSymbol = "GBADGE";

  // Step 1: Deploy GovernanceToken
  console.log("\n[1/7] Deploying GovernanceToken...");
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(tokenName, tokenSymbol);
  await governanceToken.waitForDeployment();
  const tokenAddress = await governanceToken.getAddress();
  console.log(`✓ GovernanceToken deployed at: ${tokenAddress}`);
  await verifyContract(tokenAddress, "GovernanceToken", [tokenName, tokenSymbol]);

  // Step 2: Deploy ReputationSystem
  console.log("\n[2/7] Deploying ReputationSystem...");
  const ReputationSystem = await hre.ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy();
  await reputationSystem.waitForDeployment();
  const reputationAddress = await reputationSystem.getAddress();
  console.log(`✓ ReputationSystem deployed at: ${reputationAddress}`);
  await verifyContract(reputationAddress, "ReputationSystem", []);

  // Step 3: Deploy GovernanceBadgeNFT
  console.log("\n[3/7] Deploying GovernanceBadgeNFT...");
  const GovernanceBadgeNFT = await hre.ethers.getContractFactory("GovernanceBadgeNFT");
  const badgeNFT = await GovernanceBadgeNFT.deploy(badgeName, badgeSymbol);
  await badgeNFT.waitForDeployment();
  const badgeAddress = await badgeNFT.getAddress();
  console.log(`✓ GovernanceBadgeNFT deployed at: ${badgeAddress}`);
  await verifyContract(badgeAddress, "GovernanceBadgeNFT", [badgeName, badgeSymbol]);

  // Step 4: Deploy TokenStaking
  console.log("\n[4/7] Deploying TokenStaking...");
  const TokenStaking = await hre.ethers.getContractFactory("TokenStaking");
  const tokenStaking = await TokenStaking.deploy(tokenAddress);
  await tokenStaking.waitForDeployment();
  const stakingAddress = await tokenStaking.getAddress();
  console.log(`✓ TokenStaking deployed at: ${stakingAddress}`);
  await verifyContract(stakingAddress, "TokenStaking", [tokenAddress]);

  // Step 5: Deploy GovernanceVoting
  console.log("\n[5/7] Deploying GovernanceVoting...");
  const GovernanceVoting = await hre.ethers.getContractFactory("GovernanceVoting");
  const governanceVoting = await GovernanceVoting.deploy(stakingAddress);
  await governanceVoting.waitForDeployment();
  const votingAddress = await governanceVoting.getAddress();
  console.log(`✓ GovernanceVoting deployed at: ${votingAddress}`);
  await verifyContract(votingAddress, "GovernanceVoting", [stakingAddress]);

  // Step 6: Deploy OnchainDiscussions
  console.log("\n[6/7] Deploying OnchainDiscussions...");
  const OnchainDiscussions = await hre.ethers.getContractFactory("OnchainDiscussions");
  const discussions = await OnchainDiscussions.deploy();
  await discussions.waitForDeployment();
  const discussionsAddress = await discussions.getAddress();
  console.log(`✓ OnchainDiscussions deployed at: ${discussionsAddress}`);
  await verifyContract(discussionsAddress, "OnchainDiscussions", []);

  // Step 7: Deploy GovernancePlatform
  console.log("\n[7/7] Deploying GovernancePlatform...");
  const GovernancePlatform = await hre.ethers.getContractFactory("GovernancePlatform");
  const governancePlatform = await GovernancePlatform.deploy(
    tokenAddress,
    reputationAddress,
    badgeAddress,
    stakingAddress,
    votingAddress,
    discussionsAddress
  );
  await governancePlatform.waitForDeployment();
  const platformAddress = await governancePlatform.getAddress();
  console.log(`✓ GovernancePlatform deployed at: ${platformAddress}`);
  await verifyContract(
    platformAddress,
    "GovernancePlatform",
    [
      tokenAddress,
      reputationAddress,
      badgeAddress,
      stakingAddress,
      votingAddress,
      discussionsAddress,
    ]
  );

  // Step 8: Setup roles
  console.log("\n" + "=".repeat(60));
  console.log("Setting up roles and permissions...");
  console.log("=".repeat(60));

  // Grant MINTER_ROLE to GovernancePlatform for tokens
  console.log("\n[1/4] Granting MINTER_ROLE to GovernancePlatform...");
  const MINTER_ROLE = await governanceToken.MINTER_ROLE();
  const tx1 = await governanceToken.grantRole(MINTER_ROLE, platformAddress);
  await tx1.wait();
  console.log("✓ MINTER_ROLE granted");

  // Grant REPUTATION_MANAGER_ROLE to GovernancePlatform
  console.log("\n[2/4] Granting REPUTATION_MANAGER_ROLE to GovernancePlatform...");
  const REPUTATION_MANAGER_ROLE = await reputationSystem.REPUTATION_MANAGER_ROLE();
  const tx2 = await reputationSystem.grantRole(REPUTATION_MANAGER_ROLE, platformAddress);
  await tx2.wait();
  console.log("✓ REPUTATION_MANAGER_ROLE granted");

  // Grant MINTER_ROLE to GovernancePlatform for badges
  console.log("\n[3/4] Granting Badge MINTER_ROLE to GovernancePlatform...");
  const BADGE_MINTER_ROLE = await badgeNFT.MINTER_ROLE();
  const tx3 = await badgeNFT.grantRole(BADGE_MINTER_ROLE, platformAddress);
  await tx3.wait();
  console.log("✓ Badge MINTER_ROLE granted");

  // Grant LEVEL_MANAGER_ROLE to GovernancePlatform for badges
  console.log("\n[4/4] Granting Badge LEVEL_MANAGER_ROLE to GovernancePlatform...");
  const BADGE_LEVEL_MANAGER_ROLE = await badgeNFT.LEVEL_MANAGER_ROLE();
  const tx4 = await badgeNFT.grantRole(BADGE_LEVEL_MANAGER_ROLE, platformAddress);
  await tx4.wait();
  console.log("✓ Badge LEVEL_MANAGER_ROLE granted");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log(`  GovernanceToken:      ${tokenAddress}`);
  console.log(`  ReputationSystem:     ${reputationAddress}`);
  console.log(`  GovernanceBadgeNFT:   ${badgeAddress}`);
  console.log(`  TokenStaking:         ${stakingAddress}`);
  console.log(`  GovernanceVoting:     ${votingAddress}`);
  console.log(`  OnchainDiscussions:   ${discussionsAddress}`);
  console.log(`  GovernancePlatform:   ${platformAddress}`);
  console.log("\n" + "=".repeat(60));

  // Export addresses for verification
  const addresses = {
    network: networkName,
    deployer: deployer.address,
    contracts: {
      governanceToken: tokenAddress,
      reputationSystem: reputationAddress,
      badgeNFT: badgeAddress,
      tokenStaking: stakingAddress,
      governanceVoting: votingAddress,
      discussions: discussionsAddress,
      governancePlatform: platformAddress,
    },
  };

  console.log("\n📝 Save these addresses:");
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
