/**
 * ContentAgents Demo Consumer Agent
 * Run: npm run demo
 *
 * Uses a viem local wallet (DEMO_PRIVATE_KEY) for on-chain operations.
 * Falls back to cached wallet address if key not set.
 *
 * 1. Derive consumer address from DEMO_PRIVATE_KEY
 * 2. Register on ERC-8004 via direct viem contract call
 * 3. Fetch articles, negotiate price
 * 4. Attempt x402 content access (shows 402 paywall in demo)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

type LogEntry = {
  timestamp: string;
  sessionId: string;
  event: string;
  data: Record<string, unknown>;
  decision: string;
  toolsCalled: string[];
  retries: number;
  success: boolean;
};

function appendLog(entry: LogEntry) {
  const path = join(process.cwd(), 'agent_log.json');
  let arr: LogEntry[] = [];
  if (existsSync(path)) {
    try { arr = JSON.parse(readFileSync(path, 'utf-8')); } catch { arr = []; }
  }
  arr.push(entry);
  writeFileSync(path, JSON.stringify(arr, null, 2));
  console.log(`[${entry.event}]`, entry.decision);
}

const REGISTER_ABI = parseAbi([
  'function register(string agentName) external',
  'function getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)',
]);

async function main() {
  loadEnvLocal();

  const contractAddress = process.env.AGENT_REGISTRY_CONTRACT as Address | undefined;
  if (!contractAddress) {
    console.error('AGENT_REGISTRY_CONTRACT must be set in .env.local');
    process.exit(1);
  }

  const sessionId = crypto.randomUUID();
  appendLog({
    timestamp: new Date().toISOString(),
    sessionId,
    event: 'negotiation_started',
    data: { baseUrl: BASE_URL },
    decision: 'Demo consumer started',
    toolsCalled: [],
    retries: 0,
    success: true,
  });

  // ── Step 1: Wallet setup ──────────────────────────────────────────────────
  console.log('1. Setting up consumer wallet...');
  const demoKey = process.env.DEMO_PRIVATE_KEY;
  let address: string;
  let walletClient: ReturnType<typeof createWalletClient> | null = null;

  if (demoKey) {
    const pk = (demoKey.startsWith('0x') ? demoKey : `0x${demoKey}`) as `0x${string}`;
    const account = privateKeyToAccount(pk);
    address = account.address;
    walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://sepolia.base.org'),
    });
    console.log('   Using DEMO_PRIVATE_KEY wallet:', address);
  } else {
    const cachePath = join(process.cwd(), '.wallet-cache.json');
    if (existsSync(cachePath)) {
      const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
      address = cached.address;
      console.log('   Using cached wallet address:', address);
    } else {
      console.error('   No DEMO_PRIVATE_KEY or .wallet-cache.json found. Set DEMO_PRIVATE_KEY in .env.local');
      process.exit(1);
    }
  }

  // ── Step 2: Register on ERC-8004 (viem direct call) ──────────────────────
  console.log('2. Registering on ERC-8004 as DemoConsumerAgent...');
  if (walletClient) {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC || 'https://sepolia.base.org'),
    });

    try {
      // Check if already registered
      const [, , exists] = await publicClient.readContract({
        address: contractAddress,
        abi: REGISTER_ABI,
        functionName: 'getReputation',
        args: [address as Address],
      });

      if (exists) {
        console.log('   Already registered on ERC-8004.');
      } else {
        const pk = (demoKey!.startsWith('0x') ? demoKey! : `0x${demoKey!}`) as `0x${string}`;
        const acct = privateKeyToAccount(pk);
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: REGISTER_ABI,
          functionName: 'register',
          args: ['DemoConsumerAgent'],
          chain: baseSepolia,
          account: acct,
        });
        console.log('   Registered on ERC-8004. Tx:', hash);
        appendLog({
          timestamp: new Date().toISOString(),
          sessionId,
          event: 'agent_registered',
          data: { txHash: hash, address },
          decision: 'Registered on ERC-8004 AgentRegistry',
          toolsCalled: ['register_on_chain'],
          retries: 0,
          success: true,
        });
        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        console.log('   Registration confirmed on-chain.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('   ERC-8004 registration skipped:', msg.slice(0, 80));
    }
  } else {
    console.warn('   Skipping on-chain registration (no signing key available).');
  }

  // ── Step 3: Fetch articles ────────────────────────────────────────────────
  console.log('3. Fetching articles from', BASE_URL + '/api/content');
  const articlesRes = await fetch(BASE_URL + '/api/content');
  if (!articlesRes.ok) {
    console.error('   Failed to fetch articles:', articlesRes.status);
    process.exit(1);
  }
  const articles = await articlesRes.json();
  if (!Array.isArray(articles) || articles.length === 0) {
    console.log('   No articles found. Upload content first at /publish');
    process.exit(0);
  }
  const article = articles[0];
  console.log('   Picked article:', article.title, `(id: ${article.id})`);
  console.log('   Base price: $' + article.basePrice);

  // ── Step 4: Negotiate ─────────────────────────────────────────────────────
  console.log('4. Negotiating price...');
  let sessionIdNeg: string | undefined;
  let agreedPrice = 0;
  let round = 0;
  const maxRounds = 5;
  let dealAccepted = false;

  while (round < maxRounds) {
    const offer = round === 0
      ? article.basePrice * 0.5
      : agreedPrice * 0.85;  // step up 85% each counter

    const res = await fetch(BASE_URL + '/api/agent/negotiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article.id,
        consumerAddress: address,
        offer: Math.round(offer * 1e6) / 1e6,
        sessionId: sessionIdNeg,
      }),
    });

    if (!res.ok) {
      console.error('   Negotiate failed:', res.status, await res.text());
      process.exit(1);
    }

    const result = await res.json();
    sessionIdNeg = result.sessionId;
    agreedPrice = result.price ?? result.counterOffer;
    round++;

    appendLog({
      timestamp: new Date().toISOString(),
      sessionId,
      event: result.decision === 'accept' ? 'deal_accepted' : 'counter_offered',
      data: {
        articleId: article.id,
        round,
        myOffer: offer,
        decision: result.decision,
        counterOffer: result.counterOffer,
      },
      decision: result.reasoning,
      toolsCalled: ['check_reputation', 'negotiate_price'],
      retries: 0,
      success: result.decision !== 'reject',
    });

    console.log(`   Round ${round} — offer $${offer.toFixed(5)} → ${result.decision.toUpperCase()} @ $${agreedPrice.toFixed(5)}`);
    console.log(`   Reasoning: ${result.reasoning}`);

    if (result.decision === 'accept') {
      dealAccepted = true;
      break;
    }
    if (result.decision === 'reject') {
      console.log('   Publisher rejected. Exiting.');
      process.exit(0);
    }
  }

  if (!dealAccepted) {
    console.log('   Max rounds reached without agreement.');
  }

  // ── Step 5: Access content (x402 gate) ────────────────────────────────────
  console.log('5. Requesting content (x402 gate)...');
  const contentRes = await fetch(BASE_URL + '/api/content/' + article.id, {
    headers: { 'x-agreed-price': String(agreedPrice) },
  });

  if (contentRes.status === 402) {
    const gate = await contentRes.json();
    console.log('   ↳ 402 Payment Required (expected in demo — no real USDC sent)');
    console.log('   Pay-to address:', gate.accepts?.[0]?.payTo);
    console.log('   Amount (USDC units):', gate.accepts?.[0]?.maxAmountRequired);
    console.log('   In production: consumer wallet would sign the x402 payment header');
    appendLog({
      timestamp: new Date().toISOString(),
      sessionId,
      event: 'payment_required',
      data: { articleId: article.id, payTo: gate.accepts?.[0]?.payTo, amount: gate.accepts?.[0]?.maxAmountRequired },
      decision: 'x402 paywall hit — production would send USDC via CDP wallet',
      toolsCalled: ['x402_pay'],
      retries: 0,
      success: false,
    });
  } else if (contentRes.ok) {
    const data = await contentRes.json();
    console.log('   Content received!');
    console.log('   Title:', data.title);
    console.log('   Preview:', (data.content || '').slice(0, 200) + '...');
    appendLog({
      timestamp: new Date().toISOString(),
      sessionId,
      event: 'content_served',
      data: { articleId: article.id, agreedPrice },
      decision: 'Content received successfully',
      toolsCalled: [],
      retries: 0,
      success: true,
    });
  } else {
    console.error('   Unexpected status:', contentRes.status, await contentRes.text());
  }

  console.log('\n✅ Demo complete. Logs written to agent_log.json');
  console.log(`   Session: ${sessionId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
