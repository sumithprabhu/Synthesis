/**
 * ContentAgents Consumer Agent — OpenServ entry point.
 * Run: npm run agent:consumer
 *
 * This is a SEPARATE agent from the Publisher Agent.
 * Register it on platform.openserv.ai with:
 *   Name: "ContentAgents Consumer Agent"
 *   Capabilities: "Autonomously browse, negotiate, and purchase content via x402 micropayments on ContentAgents marketplace"
 * Then set OPENSERV_CONSUMER_API_KEY to the agent's API key.
 */
import { run } from '@openserv-labs/sdk';
import { createConsumerAgent } from './consumerAgent';

async function startConsumerAgent() {
  const agent = createConsumerAgent();

  if (process.env.DISABLE_TUNNEL === 'true' || !process.env.OPENSERV_CONSUMER_API_KEY) {
    console.log('[consumer-agent] Starting in LOCAL mode (no OpenServ tunnel)');
    if (!process.env.OPENSERV_CONSUMER_API_KEY) {
      console.log('[consumer-agent] Set OPENSERV_CONSUMER_API_KEY to an agent key from platform.openserv.ai');
    }
    await agent.start();
    console.log(`[consumer-agent] Consumer agent running on http://localhost:${agent.port}`);
    console.log('[consumer-agent] Press Ctrl+C to stop.');

    process.on('SIGINT', async () => {
      await agent.stop();
      process.exit(0);
    });
    return;
  }

  console.log('[consumer-agent] Connecting to OpenServ via tunnel...');
  try {
    const { stop } = await run(agent);
    console.log(`[consumer-agent] Consumer agent connected to OpenServ (port ${agent.port})`);
    process.on('SIGINT', async () => { await stop(); process.exit(0); });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Invalid API key') || msg.includes('Authentication failed')) {
      console.warn('[consumer-agent] ⚠ OpenServ tunnel auth failed. Check OPENSERV_CONSUMER_API_KEY');
      console.warn('[consumer-agent] Falling back to local mode...');
      process.env.DISABLE_TUNNEL = 'true';
      const localAgent = createConsumerAgent();
      await localAgent.start();
      console.log(`[consumer-agent] Running locally on http://localhost:${localAgent.port}`);
      process.on('SIGINT', async () => { await localAgent.stop(); process.exit(0); });
    } else {
      console.error('[consumer-agent] Failed to start:', msg);
      process.exit(1);
    }
  }
}

startConsumerAgent().catch((err) => {
  console.error('[consumer-agent] Startup error:', err);
  process.exit(1);
});
