import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tier: z.enum(['free', 'standard', 'premium']).optional(),
  basePrice: z.number().min(0).optional(),
  publisherId: z.string(),
  isFree: z.boolean().optional(),
  previewLength: z.number().int().min(0).optional(),
  thumbnail: z.string().optional(),
  isDraft: z.boolean().optional(),
});

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { isDraft: false },
    include: {
      publisher: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    tier: a.tier,
    basePrice: a.basePrice,
    qualityScore: a.qualityScore,
    publisherId: a.publisherId,
    isFree: a.isFree,
    previewLength: a.previewLength,
    publisher: a.publisher,
    thumbnail: a.thumbnail,
    isDraft: a.isDraft,
    preview: a.content.slice(0, a.previewLength) + (a.content.length > a.previewLength ? '…' : ''),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const {
      title,
      content,
      tier = 'standard',
      basePrice = 0.002,
      publisherId,
      isFree = false,
      previewLength = 300,
      thumbnail,
      isDraft = false,
    } = parsed.data;
    const summary = content.slice(0, 120) + (content.length > 120 ? '…' : '');
    const article = await prisma.article.create({
      data: {
        title,
        content,
        summary,
        tier,
        basePrice,
        publisherId,
        isFree,
        previewLength,
        ...(thumbnail !== undefined && { thumbnail }),
        isDraft,
      },
    });
    return NextResponse.json(article);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, title, content, tier, basePrice, isFree, previewLength, isDraft, thumbnail } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const summary = content ? content.slice(0, 120) + (content.length > 120 ? '…' : '') : undefined;
  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content, summary }),
      ...(tier !== undefined && { tier }),
      ...(basePrice !== undefined && { basePrice }),
      ...(isFree !== undefined && { isFree }),
      ...(previewLength !== undefined && { previewLength }),
      ...(isDraft !== undefined && { isDraft }),
      ...(thumbnail !== undefined && { thumbnail }),
    },
  });
  return NextResponse.json(updated);
}
