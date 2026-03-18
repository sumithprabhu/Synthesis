import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getReputation } from '@/lib/erc8004/registry';

export async function GET() {
  const publisher = await prisma.publisher.findFirst({
    include: { articles: { select: { id: true } } },
  });
  if (!publisher) {
    return NextResponse.json({
      publisher: null,
      negotiations: [],
      reputation: null,
    });
  }
  let reputation: { score: number; totalDeals: number } | null = null;
  try {
    const rep = await getReputation(publisher.walletAddress);
    reputation = { score: rep.score, totalDeals: rep.totalDeals };
  } catch {
    reputation = { score: 50, totalDeals: 0 };
  }
  const articleIds = publisher.articles.map((a) => a.id);
  const negotiations = await prisma.negotiationSession.findMany({
    where: { articleId: { in: articleIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const accessLogs = await prisma.accessLog.findMany({
    where: { articleId: { in: articleIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { article: { select: { title: true } } },
  });

  const totalEarnings = accessLogs.reduce((sum, l) => sum + l.pricePaid, 0);

  return NextResponse.json({
    publisher: {
      ...publisher,
      articles: publisher.articles,
      earnings: totalEarnings,
    },
    negotiations,
    accessLogs,
    reputation,
    stats: {
      totalNegotiations: negotiations.length,
      acceptedDeals: negotiations.filter((n) => n.status === 'accepted').length,
      totalApiCalls: accessLogs.length,
      totalEarnings,
    },
  });
}
