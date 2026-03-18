import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    'base-sepolia': {
      url: 'https://sepolia.base.org',
      chainId: 84532,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },
  },
};

export default config;
