import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:7378';

export async function GET() {
  // Check local agent server
  let agentRunning = false;
  try {
    const res = await fetch(`${AGENT_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    agentRunning = res.ok;
  } catch {
    agentRunning = false;
  }

  // Check OpenServ connection
  let openservConnected = false;
  let openservAgentId: string | null = null;
  const apiKey = process.env.OPENSERV_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.openserv.ai/agents', {
        headers: { 'x-openserv-key': apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          openservConnected = true;
          openservAgentId = String(data.items[0].id);
        }
      }
    } catch {
      // OpenServ unreachable
    }
  }

  return NextResponse.json({
    agentRunning,
    openservConnected,
    openservAgentId,
    agentServerUrl: AGENT_SERVER_URL,
    hasApiKey: !!apiKey,
  });
}
