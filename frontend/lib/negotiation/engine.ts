import { prisma } from '@/lib/prisma';
import { getReputation } from '@/lib/erc8004/registry';

const MAX_ROUNDS = 5;

export type NegotiationRound = {
  role: 'publisher' | 'consumer';
  offer: number;
  reasoning: string;
};

export type NegotiateInput = {
  articleId: string;
  consumerAddress: string;
  offer: number;
  sessionId?: string;
  useCase?: string;
};

export type NegotiateResult = {
  decision: 'accept' | 'counter' | 'reject';
  price: number;
  reasoning: string;
  sessionId: string;
  rounds: NegotiationRound[];
  agreed?: boolean;
};

// ERC-8004 score is 0-100
function reputationMultiplier(score: number | null, exists: boolean): number {
  if (!exists || score === null) return 1.2;
  if (score > 70) return 0.8;
  if (score >= 40 && score <= 70) return 1.0;
  return 1.5;
}

export async function negotiate(input: NegotiateInput): Promise<NegotiateResult> {
  const { articleId, consumerAddress, offer, sessionId: existingSessionId, useCase } = input;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { publisher: true },
  });
  if (!article) throw new Error('Article not found');

  const { score, exists } = await getReputation(consumerAddress);

  // Free access: high-reputation consumer
  if (article.publisher.freeForHighReputation && exists && score !== null && score > 70) {
    const sessionId = (
      await prisma.negotiationSession.create({
        data: {
          articleId,
          consumerAddress,
          status: 'accepted',
          initialPrice: 0,
          finalPrice: 0,
          rounds: [
            { role: 'publisher', offer: 0, reasoning: 'Free access granted based on high reputation score.' },
          ] as object[],
        },
      })
    ).id;
    return {
      decision: 'accept',
      price: 0,
      reasoning: 'Free access granted based on high reputation score.',
      sessionId,
      rounds: [{ role: 'publisher', offer: 0, reasoning: 'Free access granted based on high reputation score.' }],
      agreed: true,
    };
  }

  // Free access: qualifying use case
  if (article.publisher.allowFreeByUseCase && useCase) {
    const keywords = article.publisher.freeCaseKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const useCaseLower = useCase.toLowerCase();
    const matched = keywords.some((kw) => useCaseLower.includes(kw));
    if (matched) {
      const reasoning = `Free access granted based on your stated use case: ${useCase}`;
      const sessionId = (
        await prisma.negotiationSession.create({
          data: {
            articleId,
            consumerAddress,
            status: 'accepted',
            initialPrice: 0,
            finalPrice: 0,
            rounds: [{ role: 'publisher', offer: 0, reasoning }] as object[],
          },
        })
      ).id;
      return {
        decision: 'accept',
        price: 0,
        reasoning,
        sessionId,
        rounds: [{ role: 'publisher', offer: 0, reasoning }],
        agreed: true,
      };
    }
  }
  const repMult = reputationMultiplier(score, exists);
  const fairPrice =
    article.basePrice *
    (article.qualityScore / 5) *
    (1 - article.publisher.generosity / 20) *
    repMult;
  const minAcceptable = fairPrice * 0.6;

  let session = existingSessionId
    ? await prisma.negotiationSession.findUnique({
        where: { id: existingSessionId },
      })
    : null;

  const rounds: NegotiationRound[] = Array.isArray(session?.rounds)
    ? (session.rounds as NegotiationRound[])
    : [];

  const newRound: NegotiationRound = {
    role: 'consumer',
    offer,
    reasoning: 'Consumer offer',
  };
  rounds.push(newRound);

  let decision: 'accept' | 'counter' | 'reject' = 'counter';
  let price = fairPrice;
  let reasoning = '';

  if (offer >= fairPrice) {
    decision = 'accept';
    price = offer;
    reasoning = 'Offer meets or exceeds fair price. Accepted.';
  } else if (offer >= minAcceptable) {
    decision = 'counter';
    price = fairPrice;
    reasoning = `Fair price based on quality ${article.qualityScore}/10, reputation multiplier ${repMult.toFixed(2)}. Counter at $${fairPrice.toFixed(4)}.`;
  } else {
    if (rounds.length >= MAX_ROUNDS) {
      decision = 'reject';
      reasoning = 'Offer too low and max rounds reached.';
    } else {
      decision = 'counter';
      price = fairPrice;
      reasoning = `Offer below minimum. Counter at $${fairPrice.toFixed(4)}.`;
    }
  }

  if (decision === 'counter') {
    rounds.push({
      role: 'publisher',
      offer: price,
      reasoning,
    });
  }

  const sessionId =
    session?.id ??
    (
      await prisma.negotiationSession.create({
        data: {
          articleId,
          consumerAddress,
          status: decision === 'accept' ? 'accepted' : 'pending',
          initialPrice: fairPrice,
          finalPrice: decision === 'accept' ? price : null,
          rounds: rounds as object[],
        },
      })
    ).id;

  if (session && (decision === 'accept' || decision === 'reject')) {
    await prisma.negotiationSession.update({
      where: { id: sessionId },
      data: {
        status: decision === 'accept' ? 'accepted' : 'rejected',
        finalPrice: decision === 'accept' ? price : null,
        rounds: rounds as object[],
      },
    });
  } else if (session) {
    await prisma.negotiationSession.update({
      where: { id: sessionId },
      data: { rounds: JSON.stringify(rounds) },
    });
  }

  return {
    decision,
    price,
    reasoning,
    sessionId,
    rounds,
    agreed: decision === 'accept',
  };
}
