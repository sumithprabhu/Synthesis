import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the Parley Protocol publisher assistant. Help publishers craft better articles, improve their negotiation settings, and understand how the x402 micropayment system and ERC-8004 reputation work. Be concise and practical. When suggesting content strategy, focus on quality score, pricing strategy, and free-access policies.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
