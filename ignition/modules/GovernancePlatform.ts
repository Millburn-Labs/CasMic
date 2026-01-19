// SPDX-License-Identifier: MIT
// Hardhat Ignition deployment module for Governance Platform
// Learn more at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GovernancePlatformModule = buildModule("GovernancePlatformModule", (m) => {
  // Parameters with defaults
  const tokenName = m.getParameter("tokenName", "Governance Token");
  const tokenSymbol = m.getParameter("tokenSymbol", "GOV");
  const badgeName = m.getParameter("badgeName", "Governance Badges");
  const badgeSymbol = m.getParameter("badgeSymbol", "GBADGE");

  // Deploy GovernanceToken
  const governanceToken = m.contract("GovernanceToken", [tokenName, tokenSymbol]);

  // Deploy ReputationSystem
  const reputationSystem = m.contract("ReputationSystem", []);

  // Deploy GovernanceBadgeNFT
  const badgeNFT = m.contract("GovernanceBadgeNFT", [badgeName, badgeSymbol]);

  // Deploy TokenStaking (depends on GovernanceToken)
  const tokenStaking = m.contract("TokenStaking", [governanceToken]);

  // Deploy GovernanceVoting (depends on TokenStaking)
  const governanceVoting = m.contract("GovernanceVoting", [tokenStaking]);

  // Deploy OnchainDiscussions
  const discussions = m.contract("OnchainDiscussions", []);

  // Deploy GovernancePlatform (depends on all contracts)
  const governancePlatform = m.contract("GovernancePlatform", [
    governanceToken,
    reputationSystem,
    badgeNFT,
    tokenStaking,
    governanceVoting,
    discussions,
  ]);

  return {
    governanceToken,
    reputationSystem,
    badgeNFT,
    tokenStaking,
    governanceVoting,
    discussions,
    governancePlatform,
  };
});

export default GovernancePlatformModule;
