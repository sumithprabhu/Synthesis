import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getReputation } from '@/lib/erc8004/registry';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getSession(request);

  // Fall back to first publisher for backwards compat when no session (dashboard page auto-loads)
  const publisher = session
    ? await prisma.publisher.findUnique({
        where: { id: session.publisherId },
        include: { articles: { select: { id: true } } },
      })
    : await prisma.publisher.findFirst({
        include: { articles: { select: { id: true } } },
      });

  if (!publisher) {
    console.log('[dashboard] No publisher found');
    return NextResponse.json({ publisher: null, negotiations: [], reputation: null });
  }

  console.log(`[dashboard] Loading for publisher: ${publisher.name} (${publisher.id})`);

  let reputation: { score: number; totalDeals: number } | null = null;
  try {
    const rep = await getReputation(publisher.walletAddress);
    reputation = { score: rep.score, totalDeals: rep.totalDeals };
    console.log(`[dashboard] ERC-8004 reputation: score=${rep.score} deals=${rep.totalDeals}`);
  } catch {
    reputation = { score: 50, totalDeals: 0 };
    console.warn('[dashboard] ERC-8004 lookup failed, using default reputation');
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

  console.log(`[dashboard] stats: negotiations=${negotiations.length} accessLogs=${accessLogs.length} earnings=${totalEarnings}`);

  return NextResponse.json({
    publisher: { ...publisher, earnings: totalEarnings },
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
