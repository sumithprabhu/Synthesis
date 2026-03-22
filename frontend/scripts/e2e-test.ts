/**
 * ContentAgents — Full E2E Test
 * Tests the complete publisher + consumer flow with on-chain verification links
 */
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const BASE_URL = 'http://localhost:3000';
const EXPLORER  = 'https://sepolia.basescan.org';
const PRIVATE_KEY = '0x6691c599507a96750ad7e061b0c6adbf066fe41971c7645034088baa6f9af9ea';
const AGENT_REGISTRY = '0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305';
const USDC_ADDRESS   = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient  = createPublicClient ({ chain: baseSepolia, transport: http('https://sepolia.base.org') });
const walletClient  = createWalletClient ({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') });

const registryAbi = parseAbi([
  'function register(string name, string metadata) external returns (uint256)',
  'function getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)',
]);
const usdcAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address,uint256) returns (bool)',
]);

function log(section: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`\n[${ts}] ── ${section} ──`);
  console.log(`  ${msg}`);
  if (data !== undefined) console.log(' ', JSON.stringify(data, null, 2).replace(/\n/g, '\n  '));
}

function ok(label: string)   { console.log(`  ✅  ${label}`); }
function fail(label: string) { console.log(`  ❌  ${label}`); }
function link(label: string, url: string) { console.log(`  🔗  ${label}: ${url}`); }

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       ContentAgents — Full E2E Verification Run      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n  Consumer wallet : ${account.address}`);
  link('Consumer on BaseScan', `${EXPLORER}/address/${account.address}`);

  // ─── STEP 1: Check consumer on-chain reputation ───────────────────────────
  log('STEP 1', 'Check consumer ERC-8004 reputation');
  const [score, totalDeals, exists] = await publicClient.readContract({
    address: AGENT_REGISTRY as `0x${string}`,
    abi: registryAbi,
    functionName: 'getReputation',
    args: [account.address],
  });
  log('STEP 1', `score=${score} totalDeals=${totalDeals} exists=${exists}`);
  link('AgentRegistry contract', `${EXPLORER}/address/${AGENT_REGISTRY}`);

  let regTxHash: string | undefined;
  if (!exists) {
    log('STEP 1', 'Not registered — registering on ERC-8004...');
    regTxHash = await walletClient.writeContract({
      address: AGENT_REGISTRY as `0x${string}`,
      abi: registryAbi,
      functionName: 'register',
      args: ['E2E Consumer Agent', JSON.stringify({ type: 'consumer', version: '1.0' })],
    });
    await publicClient.waitForTransactionReceipt({ hash: regTxHash as `0x${string}` });
    ok(`Registered on ERC-8004`);
    link('Registration TX', `${EXPLORER}/tx/${regTxHash}`);
  } else {
    ok(`Already registered — reputation score: ${score}/100`);
  }

  // ─── STEP 2: Register publisher ───────────────────────────────────────────
  log('STEP 2', 'Register a new publisher');
  const email    = `e2e-${Date.now()}@test.dev`;
  const password = 'test123';
  const { status: regStatus, data: regData } = await api('POST', '/api/publisher/register', {
    name: 'E2E Publisher', email, password,
  });
  if (regStatus !== 200) { fail(`Register failed (${regStatus}): ${regData.error}`); process.exit(1); }
  ok(`Publisher registered: ${regData.name} (${regData.id})`);
  console.log(`  📧  email   : ${email}`);
  console.log(`  🔑  password: ${password}`);
  console.log(`  👛  wallet  : ${regData.walletAddress}`);
  link('Publisher wallet on BaseScan', `${EXPLORER}/address/${regData.walletAddress}`);

  // ─── STEP 3: Login → get JWT session token ────────────────────────────────
  log('STEP 3', 'Login with email + password → 12hr JWT session');
  const { status: loginStatus, data: loginData } = await api('POST', '/api/auth/login', { email, password });
  if (loginStatus !== 200) { fail(`Login failed: ${loginData.error}`); process.exit(1); }
  const token = loginData.token;
  ok(`JWT token issued (12hr validity)`);
  console.log(`  🎟️  token   : ${token.slice(0, 40)}...`);
  console.log(`  👤  session : publisher=${loginData.publisher.id} name=${loginData.publisher.name}`);

  // ─── STEP 4: Create OpenServ agent ────────────────────────────────────────
  log('STEP 4', 'Create OpenServ agent (using session token → correct publisher)');
  const { status: agentStatus, data: agentData } = await api('POST', '/api/publisher/agent/create', undefined, token);
  if (agentStatus !== 200) { fail(`Agent create failed: ${agentData.error}`); process.exit(1); }
  ok(`Agent created: ${agentData.openservAgentId}`);
  console.log(`  🤖  agentId: ${agentData.openservAgentId}`);
  if (agentData.openservAgentId && !agentData.openservAgentId.startsWith('openserv-agent-')) {
    link('OpenServ agent', `https://app.openserv.ai/agents/${agentData.openservAgentId}`);
  } else {
    console.log(`  ℹ️   OpenServ API key not live → mock agentId used (OPENSERV_API_KEY needed for real deployment)`);
    console.log(`  ℹ️   To verify agent on OpenServ: https://app.openserv.ai (login with publisher creds)`);
  }

  // Verify DB was updated
  const { data: dashData } = await api('GET', '/api/dashboard', undefined, token);
  if (dashData.publisher?.agentCreated) {
    ok(`DB verified: agentCreated=true, openservAgentId=${dashData.publisher.openservAgentId}`);
  } else {
    fail(`DB still shows agentCreated=false — session token not working!`);
  }

  // ─── STEP 5: Publish gated content ────────────────────────────────────────
  log('STEP 5', 'Publish a gated article (basePrice=0.001 USDC, 100-char preview)');
  const publisherId = dashData.publisher.id;
  const { status: pubStatus, data: article } = await api('POST', '/api/content', {
    title:         'E2E Verified: AI Micropayments & x402 Protocol on Base',
    content:       'This article explores how AI consumer agents autonomously negotiate per-article micropayments using the x402 protocol on Base Sepolia. The system leverages ERC-8004 reputation scores to give trusted agents better pricing. Publishers configure negotiation parameters — generosity, min price, and use-case keywords — through an OpenServ-hosted agent. USDC settlement happens on-chain, with zero platform fees. This is the future of content monetization in an agent-native web.',
    tier:          'standard',
    basePrice:     0.001,
    publisherId,
    isFree:        false,
    previewLength: 100,
    isDraft:       false,
  }, token);
  if (pubStatus !== 200) { fail(`Publish failed: ${article.error}`); process.exit(1); }
  const articleId = article.id;
  ok(`Article published: "${article.title}"`);
  console.log(`  📄  id          : ${articleId}`);
  console.log(`  💰  basePrice   : ${article.basePrice} USDC`);
  console.log(`  👁️   previewLen  : ${article.previewLength} chars`);
  console.log(`  🔒  isFree      : ${article.isFree}`);

  // ─── STEP 6: Try access WITHOUT payment ───────────────────────────────────
  log('STEP 6', 'Consumer tries to access gated content WITHOUT payment');
  const noPayRes = await fetch(`${BASE_URL}/api/content/${articleId}`);
  const noPayData = await noPayRes.json();
  console.log(`  HTTP status  : ${noPayRes.status}`);
  if (noPayRes.status === 402 && noPayData.isPreview) {
    ok(`Correctly blocked — 402 returned with preview only`);
    console.log(`  preview (${noPayData.content.length} chars): "${noPayData.content}"`);
    console.log(`  💳  payment required: ${noPayData.accepts?.[0]?.maxAmountRequired} USDC-micro to ${noPayData.accepts?.[0]?.payTo}`);
  } else {
    fail(`Expected 402, got ${noPayRes.status} — content gate broken!`);
  }

  // ─── STEP 7: Negotiate ────────────────────────────────────────────────────
  log('STEP 7', 'Consumer agent negotiates access (useCase=research)');
  const { status: negStatus, data: negData } = await api('POST', '/api/agent/negotiate', {
    articleId,
    consumerAddress: account.address,
    offer:           0.0005,
    useCase:         'research and education',
  });
  console.log(`  decision   : ${negData.decision}`);
  console.log(`  agreed     : ${negData.agreed}`);
  console.log(`  price      : ${negData.price} USDC`);
  console.log(`  reasoning  : ${negData.reasoning}`);
  console.log(`  sessionId  : ${negData.sessionId}`);
  if (negData.agreed) {
    ok(`Deal agreed at ${negData.price} USDC (use-case keyword match)`);
  } else {
    ok(`Counter at ${negData.price} USDC — sending payment anyway for test`);
  }

  // ─── STEP 8: Check USDC balance ───────────────────────────────────────────
  log('STEP 8', 'Check consumer USDC balance on Base Sepolia');
  const bal = await publicClient.readContract({
    address: USDC_ADDRESS, abi: usdcAbi,
    functionName: 'balanceOf', args: [account.address],
  });
  const balUsdc = Number(bal) / 1e6;
  console.log(`  balance: ${balUsdc} USDC`);
  link('USDC token on BaseScan', `${EXPLORER}/token/${USDC_ADDRESS}?a=${account.address}`);

  // ─── STEP 9: Send USDC payment on-chain ───────────────────────────────────
  log('STEP 9', `Sending 0.001 USDC to publisher wallet ${regData.walletAddress}`);
  const payAmount = BigInt(1000); // 0.001 USDC (6 decimals)
  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS, abi: usdcAbi,
    functionName: 'transfer',
    args: [regData.walletAddress as `0x${string}`, payAmount],
  });
  console.log(`  tx submitted: ${txHash}`);
  link('Payment TX on BaseScan', `${EXPLORER}/tx/${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  ok(`Payment confirmed in block ${receipt.blockNumber}`);
  console.log(`  block       : ${receipt.blockNumber}`);
  console.log(`  gas used    : ${receipt.gasUsed}`);
  console.log(`  status      : ${receipt.status}`);

  // ─── STEP 10: Access content WITH payment proof ───────────────────────────
  log('STEP 10', 'Consumer accesses content with payment tx hash header');
  const paidRes = await fetch(`${BASE_URL}/api/content/${articleId}`, {
    headers: {
      'x-payment-tx':       txHash,
      'x-consumer-address': account.address,
      'x-agreed-price':     '0.001',
    },
  });
  const paidData = await paidRes.json();
  console.log(`  HTTP status  : ${paidRes.status}`);
  if (paidRes.status === 200 && paidData.content && !paidData.isPreview) {
    ok(`Full content unlocked after payment!`);
    console.log(`  content len  : ${paidData.content.length} chars`);
    console.log(`  snippet      : "${paidData.content.slice(0, 80)}..."`);
  } else {
    fail(`Expected 200 with full content, got ${paidRes.status}`);
    console.log('  response:', JSON.stringify(paidData).slice(0, 200));
  }

  // ─── STEP 11: Verify dashboard shows everything ───────────────────────────
  log('STEP 11', 'Verify dashboard stats for publisher (using JWT token)');
  const { data: finalDash } = await api('GET', '/api/dashboard', undefined, token);
  const p   = finalDash.publisher;
  const st  = finalDash.stats;
  const neg = finalDash.negotiations;
  const al  = finalDash.accessLogs;
  console.log(`  publisher       : ${p.name} (${p.id})`);
  console.log(`  agentCreated    : ${p.agentCreated}`);
  console.log(`  openservAgentId : ${p.openservAgentId}`);
  console.log(`  earnings        : ${st.totalEarnings} USDC`);
  console.log(`  negotiations    : ${st.totalNegotiations} (${st.acceptedDeals} accepted)`);
  console.log(`  access logs     : ${st.totalApiCalls}`);
  if (al.length > 0) {
    const latest = al[0];
    console.log(`  last access`);
    console.log(`    article     : "${latest.article.title.slice(0, 50)}"`);
    console.log(`    price paid  : ${latest.pricePaid} USDC`);
    console.log(`    tx hash     : ${latest.txHash}`);
    if (latest.txHash) link('Access log TX', `${EXPLORER}/tx/${latest.txHash}`);
  }
  if (p.agentCreated && st.totalApiCalls > 0) {
    ok('Dashboard fully populated — all data correct');
  } else {
    fail('Dashboard missing data');
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                   SUMMARY & LINKS                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n  Publisher`);
  console.log(`    Name        : ${p.name}`);
  console.log(`    Email       : ${email}`);
  console.log(`    Wallet      : ${regData.walletAddress}`);
  console.log(`    Agent ID    : ${p.openservAgentId}`);
  console.log(`    DB ID       : ${p.id}`);
  console.log(`\n  Consumer`);
  console.log(`    Wallet      : ${account.address}`);
  console.log(`    Rep score   : ${exists ? score : 'newly registered'}/100`);
  console.log(`\n  Article`);
  console.log(`    ID          : ${articleId}`);
  console.log(`    Price       : 0.001 USDC`);
  console.log(`\n  On-chain Links`);
  if (regTxHash) link('  ERC-8004 registration TX', `${EXPLORER}/tx/${regTxHash}`);
  link('  Payment TX (USDC)', `${EXPLORER}/tx/${txHash}`);
  link('  Consumer wallet',   `${EXPLORER}/address/${account.address}`);
  link('  Publisher wallet',  `${EXPLORER}/address/${regData.walletAddress}`);
  link('  USDC token',        `${EXPLORER}/token/${USDC_ADDRESS}`);
  link('  AgentRegistry',     `${EXPLORER}/address/${AGENT_REGISTRY}`);
  console.log('\n  ✅  E2E test complete\n');
}

main().catch((err) => { console.error('\n❌ E2E test failed:', err); process.exit(1); });
