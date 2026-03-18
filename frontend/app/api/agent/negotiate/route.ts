import { NextRequest, NextResponse } from 'next/server';
import { negotiateAccess } from '@/agents/capabilities/negotiatePrice';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, consumerAddress, offer, sessionId } = body;
    if (!articleId || !consumerAddress || typeof offer !== 'number') {
      return NextResponse.json(
        { error: 'articleId, consumerAddress, and offer required' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { publisher: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const result = await negotiateAccess({
      articleId,
      consumerAddress,
      offer,
      sessionId,
    });

    return NextResponse.json({
      decision: result.decision,
      counterOffer: result.price,
      reasoning: result.reasoning,
      sessionId: result.sessionId,
      rounds: result.rounds,
      agreed: result.agreed,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Negotiation failed' }, { status: 500 });
  }
}
