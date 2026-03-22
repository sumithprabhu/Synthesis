/**
 * ContentAgents Publisher Agent — OpenServ entry point.
 * Run: npm run agent (or tsx agents/index.ts)
 *
 * Two modes:
 *   1. OPENSERV_API_KEY set → tries tunnel to OpenServ cloud, falls back to local if invalid key
 *   2. DISABLE_TUNNEL=true → always runs as local HTTP server on port 7378
 */
import { Agent, run } from '@openserv-labs/sdk';
import { createPublisherAgent } from './publisherAgent';

const PORT = Number(process.env.PORT) || 7378;

async function startAgent() {
  const agent = createPublisherAgent();

  if (process.env.DISABLE_TUNNEL === 'true' || !process.env.OPENSERV_API_KEY) {
    console.log('[agent] Starting in LOCAL mode (no OpenServ tunnel)');
    console.log('[agent] Set OPENSERV_API_KEY to an agent key from platform.openserv.ai for cloud connection');
    await agent.start();
    console.log(`[agent] Publisher agent server running on http://localhost:${agent.port}`);
    console.log('[agent] Press Ctrl+C to stop.');

    process.on('SIGINT', async () => {
      await agent.stop();
      process.exit(0);
    });
    return;
  }

  // Try with tunnel
  console.log('[agent] Starting with OpenServ tunnel...');
  console.log('[agent] Connecting to agents-proxy.openserv.ai ...');

  try {
    const { stop } = await run(agent);
    console.log(`[agent] Publisher agent running (port ${agent.port}) — OpenServ tunnel connected`);
    console.log('[agent] Press Ctrl+C to stop.');

    process.on('SIGINT', async () => {
      await stop();
      process.exit(0);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes('Invalid API key') || msg.includes('Authentication failed')) {
      console.warn('[agent] ⚠  OpenServ tunnel authentication failed — key is not a valid agent key');
      console.warn('[agent]    To fix: go to platform.openserv.ai → Developer → Add Agent');
      console.warn('[agent]    Copy the generated agent API key and set it as OPENSERV_API_KEY');
      console.warn('[agent]    Falling back to local HTTP mode...\n');

      // Restart without tunnel
      const localAgent = createPublisherAgent();
      process.env.DISABLE_TUNNEL = 'true';
      await localAgent.start();
      console.log(`[agent] Publisher agent server running locally on http://localhost:${localAgent.port}`);

      process.on('SIGINT', async () => {
        await localAgent.stop();
        process.exit(0);
      });
    } else {
      console.error('[agent] Failed to start:', msg);
      process.exit(1);
    }
  }
}

startAgent().catch((err) => {
  console.error('[agent] Startup error:', err);
  process.exit(1);
});
