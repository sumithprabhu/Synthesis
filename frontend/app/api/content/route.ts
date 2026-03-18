import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tier: z.enum(['free', 'standard', 'premium']).optional(),
  basePrice: z.number().min(0).optional(),
  publisherId: z.string().cuid(),
});

export async function GET() {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      summary: true,
      tier: true,
      basePrice: true,
      qualityScore: true,
      publisherId: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { title, content, tier = 'standard', basePrice = 0.002, publisherId } = parsed.data;
    const summary = content.slice(0, 120) + (content.length > 120 ? '…' : '');
    const article = await prisma.article.create({
      data: {
        title,
        content,
        summary,
        tier,
        basePrice,
        publisherId,
      },
    });
    return NextResponse.json(article);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}
