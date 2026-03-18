import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

export const evaluateContentSchema = z.object({
  articleId: z.string(),
});

export type EvaluateContentInput = z.infer<typeof evaluateContentSchema>;

export async function evaluateContent(
  input: EvaluateContentInput
): Promise<{ qualityScore: number }> {
  const article = await prisma.article.findUnique({
    where: { id: input.articleId },
  });
  if (!article) throw new Error('Article not found');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallback = 5.0;
    await prisma.article.update({
      where: { id: input.articleId },
      data: { qualityScore: fallback },
    });
    return { qualityScore: fallback };
  }

  const wordCount = article.content.split(/\s+/).length;
  const prompt = `Score this article on 1-10 scale for: topic depth, uniqueness, information density. Consider length (${wordCount} words). Reply with a single JSON: { "qualityScore": number } only.`;
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `Article title: ${article.title}\n\nExcerpt: ${article.content.slice(0, 1500)}\n\n${prompt}`,
      },
    ],
  });
  const text =
    msg.content?.find((c) => c.type === 'text')?.type === 'text'
      ? (msg.content.find((c) => c.type === 'text') as { type: 'text'; text: string }).text
      : '';
  let qualityScore = 5.0;
  const match = text.match(/"qualityScore"\s*:\s*(\d+(?:\.\d+)?)/);
  if (match) qualityScore = Math.min(10, Math.max(1, parseFloat(match[1])));

  await prisma.article.update({
    where: { id: input.articleId },
    data: { qualityScore },
  });
  return { qualityScore };
}
