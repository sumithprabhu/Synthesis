import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publishers = await prisma.publisher.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(
    publishers.map((p) => ({
      id: p.id,
      name: p.name,
      walletAddress: p.walletAddress,
      earnings: p.earnings,
      agentCreated: p.agentCreated,
      articleCount: p._count.articles,
      createdAt: p.createdAt,
    }))
  );
}
