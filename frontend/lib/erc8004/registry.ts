import { createPublicClient, http, getContract, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { AGENT_REGISTRY_ABI } from './abi';
import { loadWallet, getPublisherWallet } from '@/lib/cdp/wallet';

const rpc = process.env.NEXT_PUBLIC_BASE_RPC || 'https://sepolia.base.org';
const contractAddress = process.env.AGENT_REGISTRY_CONTRACT as Address | undefined;

const transport = http(rpc);
const publicClient = createPublicClient({ chain: baseSepolia, transport });

function getContractAddress(): Address {
  if (!contractAddress) throw new Error('AGENT_REGISTRY_CONTRACT not set');
  return contractAddress;
}

export async function getReputation(walletAddress: string): Promise<{
  score: number;
  totalDeals: number;
  exists: boolean;
}> {
  const address = getContractAddress();
  const contract = getContract({
    address,
    abi: AGENT_REGISTRY_ABI,
    client: publicClient,
  });
  const [score, totalDeals, exists] = await contract.read.getReputation([
    walletAddress as Address,
  ]);
  return {
    score: Number(score),
    totalDeals: Number(totalDeals),
    exists,
  };
}

/**
 * Register an agent on ERC-8004 using a CDP wallet (walletId).
 * The wallet's address becomes the registered agent.
 */
export async function registerAgent(
  walletId: string,
  agentName: string
): Promise<string> {
  const { wallet } = await loadWallet(walletId);
  const address = getContractAddress();
  const invocation = await wallet.invokeContract({
    contractAddress: address,
    method: 'register',
    args: [agentName],
    abi: AGENT_REGISTRY_ABI as unknown as object[],
  });
  const result = await invocation.wait();
  return result.getTransactionHash?.() ?? '';
}

/**
 * Update reputation for an agent. Signed by the publisher's CDP wallet.
 */
export async function updateReputation(
  publisherId: string,
  agentAddress: string,
  dealSuccess: boolean
): Promise<string> {
  const { wallet } = await getPublisherWallet(publisherId);
  const address = getContractAddress();
  const invocation = await wallet.invokeContract({
    contractAddress: address,
    method: 'updateReputation',
    args: [agentAddress, dealSuccess],
    abi: AGENT_REGISTRY_ABI as unknown as object[],
  });
  const result = await invocation.wait();
  return result.getTransactionHash?.() ?? '';
}
