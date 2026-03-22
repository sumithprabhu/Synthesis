import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:7378';

/** Check if the local agent server is running */
async function checkAgentHealth(): Promise<{ running: boolean; port?: number }> {
  try {
    const res = await fetch(`${AGENT_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return { running: true, port: 7378 };
    return { running: false };
  } catch {
    return { running: false };
  }
}

/** Try to get the real OpenServ agent ID from the platform API */
async function fetchOpenServAgentId(): Promise<string | null> {
  const apiKey = process.env.OPENSERV_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.openserv.ai/agents', {
      headers: { 'x-openserv-key': apiKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return String(data.items[0].id);
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    const publisher = session
      ? await prisma.publisher.findUnique({ where: { id: session.publisherId } })
      : await prisma.publisher.findFirst();

    if (!publisher) {
      return NextResponse.json({ error: 'No publisher found' }, { status: 404 });
    }

    console.log(`[agent/create] Request for publisher: ${publisher.name} (${publisher.id})`);

    if (publisher.agentCreated && publisher.openservAgentId) {
      console.log(`[agent/create] Agent already exists: ${publisher.openservAgentId}`);
      return NextResponse.json({
        message: 'Agent already created',
        openservAgentId: publisher.openservAgentId,
        agentCreated: true,
      });
    }

    // 1. Check if local agent server is running
    const health = await checkAgentHealth();
    console.log(`[agent/create] Agent server health: ${health.running ? 'running' : 'not running'}`);

    // 2. Try to get real OpenServ agent ID
    const realAgentId = await fetchOpenServAgentId();
    if (realAgentId) {
      console.log(`[agent/create] ✓ Found real OpenServ agent: ${realAgentId}`);
    }

    // 3. Determine agent ID to use
    let openservAgentId: string;
    let connectionStatus: string;

    if (realAgentId) {
      openservAgentId = realAgentId;
      connectionStatus = 'connected';
    } else if (health.running) {
      openservAgentId = `local-agent-${publisher.id}`;
      connectionStatus = 'local';
    } else {
      // Neither OpenServ nor local agent running — still mark as created
      // The agent server can be started later with: npm run agent
      openservAgentId = `agent-${publisher.id}`;
      connectionStatus = 'offline';
    }

    const updated = await prisma.publisher.update({
      where: { id: publisher.id },
      data: { agentCreated: true, openservAgentId },
    });

    console.log(`[agent/create] ✓ Publisher ${publisher.id} agentCreated=true agentId=${openservAgentId} status=${connectionStatus}`);

    return NextResponse.json({
      message: 'Agent created successfully',
      openservAgentId: updated.openservAgentId,
      agentCreated: true,
      connectionStatus,
      agentServerRunning: health.running,
      openservConnected: !!realAgentId,
      setupGuide: realAgentId ? null : {
        step1: 'Go to platform.openserv.ai → Developer → Add Agent',
        step2: 'Fill in: Name="ContentAgents Publisher Agent", Capabilities="Negotiate content access prices, evaluate content quality, manage publisher earnings"',
        step3: 'Copy the generated agent API key',
        step4: 'Update OPENSERV_API_KEY in .env.local with the agent API key (not the developer key)',
        step5: 'Run: npm run agent (in a separate terminal) to start the agent server',
      },
    });
  } catch (e) {
    console.error('[agent/create] error:', e);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
