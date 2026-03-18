import { getReputation } from '@/lib/erc8004/registry';

/**
 * Map ERC-8004 raw score (0-100) to a simple tier for display.
 */
export async function getReputationTier(walletAddress: string): Promise<{
  score: number;
  tier: 'unknown' | 'new' | 'fair' | 'trusted';
  totalDeals: number;
}> {
  const { score, totalDeals, exists } = await getReputation(walletAddress);
  if (!exists) {
    return { score: 0, tier: 'unknown', totalDeals: 0 };
  }
  let tier: 'new' | 'fair' | 'trusted' = 'new';
  if (totalDeals >= 10 && score >= 70) tier = 'trusted';
  else if (totalDeals >= 1 || score >= 40) tier = 'fair';
  return { score, tier, totalDeals };
}
