import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getSession(request);
  const publisher = session
    ? await prisma.publisher.findUnique({ where: { id: session.publisherId } })
    : await prisma.publisher.findFirst();

  if (!publisher) return NextResponse.json([]);

  console.log(`[content/all] Fetching all articles for publisher: ${publisher.name} (${publisher.id})`);

  const articles = await prisma.article.findMany({
    where: { publisherId: publisher.id },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`[content/all] Found ${articles.length} articles (${articles.filter(a => a.isDraft).length} drafts)`);

  return NextResponse.json(
    articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      tier: a.tier,
      basePrice: a.basePrice,
      qualityScore: a.qualityScore,
      isFree: a.isFree,
      isDraft: a.isDraft,
      thumbnail: a.thumbnail,
      previewLength: a.previewLength,
      createdAt: a.createdAt,
    }))
  );
}
