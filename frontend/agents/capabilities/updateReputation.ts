import { z } from 'zod';
import { updateReputation as updateReputationOnChain } from '@/lib/erc8004/registry';
import { prisma } from '@/lib/prisma';

export const updateReputationSchema = z.object({
  publisherId: z.string(),
  agentAddress: z.string(),
  dealSuccess: z.boolean(),
  amount: z.number().optional(),
  accessLogId: z.string().optional(),
});

export type UpdateReputationInput = z.infer<typeof updateReputationSchema>;

export async function updateReputation(
  input: UpdateReputationInput
): Promise<{ txHash: string }> {
  const txHash = await updateReputationOnChain(
    input.publisherId,
    input.agentAddress,
    input.dealSuccess
  );
  if (input.accessLogId) {
    await prisma.accessLog.update({
      where: { id: input.accessLogId },
      data: { txHash },
    });
  }
  return { txHash };
}
