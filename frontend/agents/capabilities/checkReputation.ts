import { z } from 'zod';
import { getReputation } from '@/lib/erc8004/registry';

export const checkReputationSchema = z.object({
  walletAddress: z.string(),
});

export type CheckReputationInput = z.infer<typeof checkReputationSchema>;

export async function checkReputation(
  input: CheckReputationInput
): Promise<{ score: number; totalDeals: number; exists: boolean }> {
  return getReputation(input.walletAddress);
}
