import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getSession } from '@/lib/auth';

const settingsSchema = z.object({
  generosity: z.number().int().min(1).max(10).optional(),
  minPrice: z.number().min(0).optional(),
  reputationThreshold: z.number().min(0).optional(),
  freeForHighReputation: z.boolean().optional(),
  allowFreeByUseCase: z.boolean().optional(),
  freeCaseKeywords: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const session = getSession(request);
    const publisher = session
      ? await prisma.publisher.findUnique({ where: { id: session.publisherId } })
      : await prisma.publisher.findFirst();
    if (!publisher) {
      return NextResponse.json({ error: 'No publisher found' }, { status: 404 });
    }
    console.log(`[settings] Updating publisher: ${publisher.name} (${publisher.id})`);

    const updated = await prisma.publisher.update({
      where: { id: publisher.id },
      data: parsed.data,
    });

    return NextResponse.json({
      id: updated.id,
      generosity: updated.generosity,
      minPrice: updated.minPrice,
      reputationThreshold: updated.reputationThreshold,
      freeForHighReputation: updated.freeForHighReputation,
      allowFreeByUseCase: updated.allowFreeByUseCase,
      freeCaseKeywords: updated.freeCaseKeywords,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
