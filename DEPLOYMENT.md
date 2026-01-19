# Deployment Guide

This guide covers deploying the Governance Platform to Base Network.

## Prerequisites

1. **Node.js and npm** installed
2. **Base Sepolia ETH** for testnet deployment (get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
3. **Base ETH** for mainnet deployment
4. **Basescan API Key** (optional, for contract verification)

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your values:
```env
PRIVATE_KEY=your_private_key_without_0x
BASESCAN_API_KEY=your_api_key_here
```

⚠️ **Security Note**: Never commit your `.env` file to version control!

## Deployment Methods

### Method 1: Using Hardhat Ignition (Recommended)

Hardhat Ignition provides declarative deployment with dependency management.

#### Deploy to Base Sepolia:
```bash
npx hardhat ignition deploy ignition/modules/GovernancePlatform.ts --network baseSepolia
```

#### Deploy to Base Mainnet:
```bash
npx hardhat ignition deploy ignition/modules/GovernancePlatform.ts --network base
```

#### With Custom Parameters:
```bash
npx hardhat ignition deploy ignition/modules/GovernancePlatform.ts \
  --network baseSepolia \
  --parameters GovernancePlatformModule:tokenName "My Governance Token" \
  --parameters GovernancePlatformModule:tokenSymbol "MGT"
```

### Method 2: Using Deployment Script

The `deploy-and-setup.ts` script handles deployment and role setup in one go.

#### Deploy to Base Sepolia:
```bash
npx hardhat run scripts/deploy-and-setup.ts --network baseSepolia
```

#### Deploy to Base Mainnet:
```bash
npx hardhat run scripts/deploy-and-setup.ts --network base
```

## Deployment Steps

The deployment process includes:

1. **GovernanceToken** - ERC20 token for governance
2. **ReputationSystem** - Reputation tracking system
3. **GovernanceBadgeNFT** - NFT badges for achievements
4. **TokenStaking** - Staking contract with voting power multipliers
5. **GovernanceVoting** - Voting contract with advanced mechanisms
6. **OnchainDiscussions** - Discussion and debate platform
7. **GovernancePlatform** - Main integration contract
8. **Role Setup** - Grants necessary permissions to GovernancePlatform

## Post-Deployment

### 1. Save Contract Addresses

After deployment, save all contract addresses. The deployment script will output them in JSON format.

### 2. Verify Contracts on Basescan

Verify each contract for transparency:

```bash
# GovernanceToken
npx hardhat verify --network baseSepolia <TOKEN_ADDRESS> "Governance Token" "GOV"

# ReputationSystem
npx hardhat verify --network baseSepolia <REPUTATION_ADDRESS>

# GovernanceBadgeNFT
npx hardhat verify --network baseSepolia <BADGE_ADDRESS> "Governance Badges" "GBADGE"

# TokenStaking
npx hardhat verify --network baseSepolia <STAKING_ADDRESS> <TOKEN_ADDRESS>

# GovernanceVoting
npx hardhat verify --network baseSepolia <VOTING_ADDRESS> <STAKING_ADDRESS>

# OnchainDiscussions
npx hardhat verify --network baseSepolia <DISCUSSIONS_ADDRESS>

# GovernancePlatform
npx hardhat verify --network baseSepolia <PLATFORM_ADDRESS> \
  <TOKEN_ADDRESS> <REPUTATION_ADDRESS> <BADGE_ADDRESS> \
  <STAKING_ADDRESS> <VOTING_ADDRESS> <DISCUSSIONS_ADDRESS>
```

### 3. Setup Roles (if using Ignition)

If you used Hardhat Ignition and need to setup roles separately:

```bash
# Set environment variables
export GOVERNANCE_TOKEN_ADDRESS=<token_address>
export REPUTATION_SYSTEM_ADDRESS=<reputation_address>
export BADGE_NFT_ADDRESS=<badge_address>
export GOVERNANCE_PLATFORM_ADDRESS=<platform_address>

# Run setup script
npx hardhat run scripts/setup-roles.ts --network baseSepolia
```

## Network Information

### Base Sepolia (Testnet)
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Base Mainnet
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org

## Gas Optimization

The contracts are compiled with optimizer enabled (200 runs) for gas efficiency. Deployment costs:

- **GovernanceToken**: ~871k gas
- **ReputationSystem**: ~1.3M gas
- **GovernanceBadgeNFT**: ~2M gas
- **TokenStaking**: ~1.4M gas
- **GovernanceVoting**: ~2M gas
- **OnchainDiscussions**: ~1.7M gas
- **GovernancePlatform**: ~1.6M gas

**Total**: ~10.8M gas (approximately $10-20 on Base, depending on gas price)

## Troubleshooting

### "Insufficient funds"
- Ensure you have enough ETH/Base ETH in your deployer account
- Check gas prices: `npx hardhat run scripts/check-gas.ts --network baseSepolia`

### "Nonce too high"
- Wait a few seconds and retry
- Or manually set nonce in hardhat config

### "Contract verification failed"
- Ensure constructor arguments match exactly
- Check Basescan API key is correct
- Wait a few minutes after deployment before verifying

## Next Steps

After successful deployment:

1. ✅ Verify all contracts on Basescan
2. ✅ Test core functionality on testnet
3. ✅ Deploy to mainnet when ready
4. ✅ Initialize governance with first proposal
5. ✅ Distribute tokens to community
6. ✅ Set up frontend integration

## Support

For issues or questions:
- Check contract documentation in code comments
- Review test files for usage examples
- Base Network docs: https://docs.base.org
