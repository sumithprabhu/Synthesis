import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'ContentAgents',
  projectId: 'contentagents_demo',
  chains: [baseSepolia],
  ssr: true,
});
