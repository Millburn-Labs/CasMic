# CasperMic - Next-Generation Governance Platform

A next-generation governance platform built on Base Network featuring sophisticated voting mechanisms, evolving NFT badges, and gamified participation rewards.

## Key Features

- **Advanced Voting Systems** - Quadratic voting, conviction voting, and batch operations
- **Hierarchical Reputation System** - Progress from Newcomer to Elder with unlock abilities
- **Evolving NFT Badges** - Collect and level up governance achievement badges with IPFS imagery
- **Token Staking** - Lock tokens with time periods for enhanced voting power
- **Liquid Democracy** - Delegate voting power to trusted community members
- **Onchain Discussions** - Fully decentralized governance debates

## Smart Contracts

- `GovernanceToken.sol` - ERC20 governance token
- `ReputationSystem.sol` - Hierarchical reputation system (Newcomer → Elder)
- `GovernanceBadgeNFT.sol` - Evolving NFT badges with IPFS support
- `TokenStaking.sol` - Time-locked staking with voting power multipliers
- `GovernanceVoting.sol` - Advanced voting (quadratic, conviction, delegation)
- `OnchainDiscussions.sol` - Onchain governance debates and discussions
- `GovernancePlatform.sol` - Main integration contract

## Installation

```bash
npm install
```

## Compilation

```bash
npx hardhat compile
```

## Testing

Run all tests:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/GovernanceToken.test.ts
```

## Deployment

### Prerequisites

1. Set up environment variables in `.env` file:
```env
PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
```

### Deploy to Base Sepolia (Testnet)

Using Hardhat Ignition:
```bash
npx hardhat ignition deploy ignition/modules/GovernancePlatform.ts --network baseSepolia
```

Using deployment script:
```bash
npx hardhat run scripts/deploy-and-setup.ts --network baseSepolia
```

### Deploy to Base Mainnet

```bash
npx hardhat ignition deploy ignition/modules/GovernancePlatform.ts --network base
```

Or:
```bash
npx hardhat run scripts/deploy-and-setup.ts --network base
```

### Verify Contracts on Basescan

After deployment, verify your contracts:

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

Example:
```bash
npx hardhat verify --network baseSepolia 0x123... "Governance Token" "GOV"
```

## Network Configuration

The project is configured for:
- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia** (Chain ID: 84532)
- **Hardhat Network** (Local development)

## Scripts

- `scripts/deploy-and-setup.ts` - Complete deployment and role setup
- `scripts/setup-roles.ts` - Setup roles after deployment (if needed separately)

## Test Coverage

✅ **92 passing tests** covering:
- Unit tests for all contracts
- Integration tests for full platform workflow
- Edge cases and error handling
- Security and access controls

## License

MIT
