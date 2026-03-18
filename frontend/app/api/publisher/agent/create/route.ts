import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/publisher/agent/create
 * Registers an OpenServ agent for the first publisher.
 * If the OpenServ API is unavailable or not configured, falls back to a
 * deterministic mock agentId so the flow is never blocked.
 */
export async function POST() {
  try {
    const publisher = await prisma.publisher.findFirst();
    if (!publisher) {
      return NextResponse.json({ error: 'No publisher found' }, { status: 404 });
    }

    if (publisher.agentCreated && publisher.openservAgentId) {
      return NextResponse.json({
        message: 'Agent already created',
        openservAgentId: publisher.openservAgentId,
      });
    }

    let openservAgentId: string;

    // Attempt to register with OpenServ API if a key is present
    const openservApiKey = process.env.OPENSERV_API_KEY;
    if (openservApiKey) {
      try {
        const res = await fetch('https://api.openserv.ai/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openservApiKey}`,
          },
          body: JSON.stringify({
            name: `ContentAgent-${publisher.name}`,
            description: 'AI publisher agent for ContentAgents platform',
            walletAddress: publisher.walletAddress,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          openservAgentId = data.id ?? data.agentId ?? `openserv-agent-${publisher.id}`;
        } else {
          // TODO: handle non-200 from OpenServ when API is fully live
          console.warn('OpenServ agent creation returned non-OK:', res.status, await res.text());
          openservAgentId = `openserv-agent-${publisher.id}`;
        }
      } catch (err) {
        console.warn('OpenServ API call failed, using mock agentId:', err);
        openservAgentId = `openserv-agent-${publisher.id}`;
      }
    } else {
      // TODO: set OPENSERV_API_KEY to call real OpenServ API
      console.warn('OPENSERV_API_KEY not set — using mock agentId');
      openservAgentId = `openserv-agent-${publisher.id}`;
    }

    const updated = await prisma.publisher.update({
      where: { id: publisher.id },
      data: { agentCreated: true, openservAgentId },
    });

    return NextResponse.json({
      message: 'Agent created successfully',
      openservAgentId: updated.openservAgentId,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
