import { z } from 'zod';
import { negotiate } from '@/lib/negotiation/engine';

export const negotiateAccessSchema = z.object({
  articleId: z.string(),
  consumerAddress: z.string(),
  offer: z.number(),
  sessionId: z.string().optional(),
});

export type NegotiateAccessInput = z.infer<typeof negotiateAccessSchema>;

export async function negotiateAccess(
  input: NegotiateAccessInput
): Promise<{
  decision: 'accept' | 'counter' | 'reject';
  price: number;
  reasoning: string;
  sessionId: string;
  rounds: Array<{ role: string; offer: number; reasoning: string }>;
  agreed?: boolean;
}> {
  return negotiate({
    articleId: input.articleId,
    consumerAddress: input.consumerAddress,
    offer: input.offer,
    sessionId: input.sessionId,
  });
}
