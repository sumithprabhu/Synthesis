import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { negotiateAccess } from '@/agents/capabilities/negotiatePrice';
import { createX402Fetch } from '@/lib/x402/client';
import { privateKeyToAccount } from 'viem/accounts';

export const dynamic = 'force-dynamic';

function encode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(encode(event, data)));
  };

  (async () => {
    try {
      // ── Resolve consumer wallet ─────────────────────────────────────────────
      const rawKey = (process.env.CONSUMER_PRIVATE_KEY || process.env.DEMO_PRIVATE_KEY || '')
        .trim()
        .replace(/^["']|["']$/g, ''); // strip surrounding quotes
      if (!rawKey) {
        await send('error', { message: 'CONSUMER_PRIVATE_KEY not set — cannot run live demo.' });
        await writer.close();
        return;
      }
      const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`;
      const account = privateKeyToAccount(privateKey);
      const consumerAddress = account.address;
      const BASE_URL = getBaseUrl(_request);

      // ── Step 1: Browse articles ─────────────────────────────────────────────
      await send('step', {
        id: 'browse',
        title: 'Consumer Agent: Browse Articles',
        status: 'running',
        detail: 'Calling GET /api/content to discover available articles…',
      });

      const articles = await prisma.article.findMany({
        where: { isDraft: false },
        include: { publisher: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      if (!articles.length) {
        await send('step', {
          id: 'browse',
          title: 'Consumer Agent: Browse Articles',
          status: 'error',
          detail: 'No published articles found. Add content at /publish first.',
        });
        await writer.close();
        return;
      }

      // Prefer a paid article for demo
      const article = articles.find((a) => !a.isFree) ?? articles[0];

      await send('step', {
        id: 'browse',
        title: 'Consumer Agent: Browse Articles',
        status: 'done',
        detail: `Found ${articles.length} article(s). Selected: "${article.title}"`,
        data: {
          articleId: article.id,
          title: article.title,
          basePrice: `$${article.basePrice}`,
          publisher: article.publisher.name || article.publisher.email,
          consumerWallet: consumerAddress,
          isFree: article.isFree,
        },
      });

      // ── Step 2: Hit paywall ─────────────────────────────────────────────────
      await send('step', {
        id: 'paywall',
        title: 'Consumer Agent → GET /api/content/:id (no payment)',
        status: 'running',
        detail: 'Requesting content without payment header…',
      });

      if (article.isFree) {
        await send('step', {
          id: 'paywall',
          title: 'Article is free — no paywall',
          status: 'done',
          detail: 'Skipping payment — article marked free.',
        });
      } else {
        const microUsdc = String(Math.ceil(article.basePrice * 1e6));
        await send('step', {
          id: 'paywall',
          title: '⚡ 402 Payment Required',
          status: 'done',
          detail: 'Server returned HTTP 402 — x402 paywall activated.',
          data: {
            status: 'HTTP 402',
            x402Version: 1,
            scheme: 'exact',
            network: 'base-sepolia',
            asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e (USDC)',
            maxAmountRequired: `${microUsdc} (= $${article.basePrice})`,
            payTo: article.publisher.walletAddress,
            description: `Access: ${article.title}`,
          },
        });
      }

      // ── Step 3: ERC-8004 reputation ─────────────────────────────────────────
      await send('step', {
        id: 'reputation',
        title: 'Negotiation Engine: Check ERC-8004 Reputation',
        status: 'running',
        detail: `Reading on-chain reputation for ${consumerAddress.slice(0, 10)}…${consumerAddress.slice(-4)}`,
      });

      let reputationData = { score: 50, totalDeals: 0, exists: false };
      try {
        const { createPublicClient, http, parseAbi } = await import('viem');
        const { baseSepolia } = await import('viem/chains');
        const REP_ABI = parseAbi([
          'function getReputation(address agent) external view returns (uint256 score, uint256 totalDeals, bool exists)',
        ]);
        const contractAddress = process.env.AGENT_REGISTRY_CONTRACT as `0x${string}`;
        if (contractAddress) {
          const pub = createPublicClient({ chain: baseSepolia, transport: http() });
          const [score, totalDeals, exists] = await pub.readContract({
            address: contractAddress,
            abi: REP_ABI,
            functionName: 'getReputation',
            args: [consumerAddress],
          }) as [bigint, bigint, boolean];
          reputationData = { score: Number(score), totalDeals: Number(totalDeals), exists };
        }
      } catch { /* keep defaults */ }

      const priceAdjustment =
        reputationData.score >= 80 ? '20% discount applied' :
        reputationData.score >= 60 ? '10% discount applied' :
        reputationData.score < 40  ? '10% premium applied' : 'no adjustment';

      await send('step', {
        id: 'reputation',
        title: 'Negotiation Engine: ERC-8004 Reputation Checked',
        status: 'done',
        detail: `Score ${reputationData.score}/100 → ${priceAdjustment}`,
        data: {
          contract: process.env.AGENT_REGISTRY_CONTRACT,
          consumerWallet: consumerAddress,
          score: `${reputationData.score} / 100`,
          totalDeals: reputationData.totalDeals,
          registered: reputationData.exists,
          priceEffect: priceAdjustment,
          basescanLink: `https://sepolia.basescan.org/address/${process.env.AGENT_REGISTRY_CONTRACT}`,
        },
      });

      // ── Step 4: Negotiate ───────────────────────────────────────────────────
      if (article.isFree) {
        // skip negotiation for free articles
      } else {
        let sessionIdNeg: string | undefined;
        let agreedPrice = article.basePrice;
        let dealAccepted = false;
        const maxRounds = 4;

        for (let round = 0; round < maxRounds; round++) {
          // Round 0: start at 50%. Subsequent rounds: step up 90% of the way to counter.
          const offer = round === 0
            ? article.basePrice * 0.5
            : agreedPrice * 0.99; // nearly meet the counter

          await send('step', {
            id: `negotiate_r${round + 1}`,
            title: `Negotiation Round ${round + 1}: Consumer Sending Offer`,
            status: 'running',
            detail: `Consumer offers $${offer.toFixed(5)} USDC…`,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let result: any;
          try {
            result = await negotiateAccess({
              articleId: article.id,
              consumerAddress,
              offer: Math.round(offer * 1e6) / 1e6,
              sessionId: sessionIdNeg,
            });
          } catch (e) {
            await send('step', {
              id: `negotiate_r${round + 1}`,
              title: `Negotiation Round ${round + 1}: Error`,
              status: 'error',
              detail: e instanceof Error ? e.message : 'Negotiation error',
            });
            break;
          }

          sessionIdNeg = result.sessionId;
          agreedPrice = result.price;

          if (result.decision === 'accept') {
            await send('step', {
              id: `negotiate_r${round + 1}`,
              title: `Negotiation Round ${round + 1}: ✅ DEAL ACCEPTED`,
              status: 'done',
              detail: `Publisher accepted $${agreedPrice.toFixed(5)} USDC`,
              data: {
                round: round + 1,
                consumerOffer: `$${offer.toFixed(5)}`,
                decision: 'ACCEPTED',
                agreedPrice: `$${agreedPrice.toFixed(5)} USDC`,
                reasoning: result.reasoning,
              },
            });
            dealAccepted = true;
            break;
          } else if (result.decision === 'reject') {
            await send('step', {
              id: `negotiate_r${round + 1}`,
              title: `Negotiation Round ${round + 1}: ❌ REJECTED`,
              status: 'error',
              detail: result.reasoning,
              data: {
                round: round + 1,
                consumerOffer: `$${offer.toFixed(5)}`,
                decision: 'REJECTED',
                reasoning: result.reasoning,
              },
            });
            break;
          } else {
            // counter — accept counter on last round
            const isLastRound = round + 1 >= maxRounds;
            await send('step', {
              id: `negotiate_r${round + 1}`,
              title: isLastRound
                ? `Negotiation Round ${round + 1}: Accepting Counter-Offer`
                : `Negotiation Round ${round + 1}: Counter-Offer Received`,
              status: 'done',
              detail: isLastRound
                ? `Consumer accepts publisher's counter of $${agreedPrice.toFixed(5)}`
                : `Publisher countered at $${agreedPrice.toFixed(5)} — agent steps up…`,
              data: {
                round: round + 1,
                consumerOffer: `$${offer.toFixed(5)}`,
                decision: isLastRound ? 'ACCEPTED (counter)' : 'COUNTER',
                counterOffer: `$${agreedPrice.toFixed(5)} USDC`,
                reasoning: result.reasoning,
              },
            });
            if (isLastRound) {
              dealAccepted = true;
            }
          }
        }

        // ── Step 5: Real x402 payment ─────────────────────────────────────────
        if (dealAccepted) {
          await send('step', {
            id: 'payment',
            title: 'Consumer Agent: Executing Real x402 Payment',
            status: 'running',
            detail: `Signing EIP-3009 TransferWithAuthorization for $${agreedPrice.toFixed(5)} USDC on Base Sepolia…`,
          });

          try {
            const x402Fetch = createX402Fetch(privateKey);
            const contentRes = await x402Fetch(`${BASE_URL}/api/content/${article.id}`, {
              headers: {
                'x-agreed-price': String(agreedPrice),
                'x-consumer-address': consumerAddress,
              },
            });

            if (!contentRes.ok) {
              const errBody = await contentRes.json().catch(() => ({}));
              throw new Error(`Content fetch failed: ${contentRes.status} ${JSON.stringify(errBody)}`);
            }

            const contentData = await contentRes.json();
            const txHash = contentData.txHash as string | undefined;

            await send('step', {
              id: 'payment',
              title: '✅ x402 Payment Settled On-Chain',
              status: 'done',
              detail: `Real USDC transferred on Base Sepolia via x402.org facilitator`,
              data: {
                mechanism: 'EIP-3009 TransferWithAuthorization',
                amountPaid: `$${agreedPrice.toFixed(5)} USDC`,
                from: consumerAddress,
                to: article.publisher.walletAddress,
                network: 'Base Sepolia',
                txHash: txHash ?? '(pending — check dashboard)',
                ...(txHash ? { basescanLink: `https://sepolia.basescan.org/tx/${txHash}` } : {}),
              },
            });

            // ── Step 6: Content unlocked ────────────────────────────────────
            await send('step', {
              id: 'content',
              title: '🔓 Content Unlocked',
              status: 'done',
              detail: 'Full article delivered after on-chain payment verified.',
              data: {
                title: contentData.title,
                preview: ((contentData.content as string) ?? '').slice(0, 300) + '…',
                pricePaid: `$${agreedPrice.toFixed(5)} USDC`,
                publisherEarned: `$${(agreedPrice * 0.97).toFixed(5)} USDC (after fees)`,
              },
            });
          } catch (e) {
            await send('step', {
              id: 'payment',
              title: 'x402 Payment Failed',
              status: 'error',
              detail: e instanceof Error ? e.message : 'Payment error',
            });
          }
        }
      }

      await send('complete', {
        summary: {
          article: article.title,
          basePrice: `$${article.basePrice}`,
          consumerWallet: consumerAddress,
          protocol: 'x402 v1',
          paymentMechanism: 'EIP-3009 TransferWithAuthorization',
          chain: 'Base Sepolia',
          registry: 'ERC-8004 AgentRegistry',
          settledOnChain: !article.isFree,
        },
      });
    } catch (e) {
      await send('error', { message: e instanceof Error ? e.message : 'Demo failed' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
