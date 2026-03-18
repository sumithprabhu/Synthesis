/**
 * ContentAgents Publisher Agent — OpenServ entry point.
 * Run: npm run agent (or tsx agents/index.ts)
 * Requires OPENSERV_API_KEY in env for tunnel.
 */
import { run } from '@openserv-labs/sdk';
import { createPublisherAgent } from './publisherAgent';

if (!process.env.OPENSERV_API_KEY) {
  console.error('OPENSERV_API_KEY is required to start the OpenServ tunnel');
  process.exit(1);
}

const agent = createPublisherAgent();

run(agent)
  .then(({ stop }) => {
    console.log('Publisher agent running. Press Ctrl+C to stop.');
    process.on('SIGINT', () => {
      stop?.();
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('Agent failed to start:', err);
    process.exit(1);
  });
