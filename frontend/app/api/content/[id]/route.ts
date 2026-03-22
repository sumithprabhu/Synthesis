import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { useFacilitator } from 'x402/verify';

const facilitatorUrl = (process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator') as `${string}://${string}`;
const { verify, settle } = useFacilitator({ url: facilitatorUrl });

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

/**
 * Build the 402 Payment Required response using x402 v1 format.
 * v1 body format (x402Version: 1) is required by @x402/fetch's getPaymentRequiredResponse.
 * Includes EIP-712 domain extras (name/version) required by ExactEvmSchemeV1.
 */
function paymentRequiredResponse(priceUsd: number, payTo: string, description: string) {
  const microUsdc = String(Math.ceil(priceUsd * 1e6));
  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: 'base-sepolia',
          maxAmountRequired: microUsdc,
          asset: USDC_ADDRESS,
          payTo,
          description,
          maxTimeoutSeconds: 300,
          extra: { name: 'USDC', version: '2' },
        },
      ],
      error: 'Payment required',
    },
    {
      status: 402,
      headers: { 'WWW-Authenticate': 'x402' },
    },
  );
}

/** Decode the base64url-encoded payment payload from X-PAYMENT or PAYMENT-SIGNATURE headers */
function extractPaymentPayload(request: NextRequest): unknown | null {
  const xPayment = request.headers.get('x-payment') ?? request.headers.get('X-PAYMENT');
  const paymentSig = request.headers.get('payment-signature') ?? request.headers.get('PAYMENT-SIGNATURE');
  const raw = xPayment ?? paymentSig;
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { publisher: true },
  });
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  // Free articles — no payment needed
  if (article.isFree) {
    return NextResponse.json({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      tier: article.tier,
      isFree: true,
    });
  }

  const payTo = article.publisher.walletAddress as `0x${string}`;
  const agreedPriceHeader = request.headers.get('x-agreed-price');
  const priceUsd = agreedPriceHeader ? parseFloat(agreedPriceHeader) : article.basePrice;
  const microUsdc = String(Math.ceil(priceUsd * 1e6));
  const description = `Access: ${article.title}`;

  // ── TEST / DEMO PATH ─────────────────────────────────────────────────────────
  // Accepts a raw on-chain tx hash for E2E testing without going through x402 facilitator.
  // Remove this block in production.
  const paymentTxHeader = request.headers.get('x-payment-tx');
  const consumerAddress = request.headers.get('x-consumer-address');
  if (paymentTxHeader?.trim()) {
    const lastSession = await prisma.negotiationSession.findFirst({
      where: { articleId: id, consumerAddress: consumerAddress ?? '' },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null);
    await prisma.accessLog.create({
      data: {
        articleId: id,
        consumerAgent: consumerAddress ?? 'unknown',
        pricePaid: priceUsd,
        negotiationRounds: Array.isArray(lastSession?.rounds) ? (lastSession!.rounds as unknown[]).length : 0,
        txHash: paymentTxHeader,
      },
    }).catch((e) => console.error('[content] AccessLog create failed:', e));

    return NextResponse.json({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      tier: article.tier,
    });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── REAL x402 PAYMENT FLOW ───────────────────────────────────────────────────
  const paymentPayload = extractPaymentPayload(request);

  if (!paymentPayload) {
    // No payment — return preview + 402 with payment requirements (x402 v1 format)
    return NextResponse.json(
      {
        id: article.id,
        title: article.title,
        content: article.content.slice(0, article.previewLength),
        summary: article.summary,
        tier: article.tier,
        isPreview: true,
        previewLength: article.previewLength,
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: 'base-sepolia',
            maxAmountRequired: microUsdc,
            asset: USDC_ADDRESS,
            payTo,
            description,
            maxTimeoutSeconds: 300,
            extra: { name: 'USDC', version: '2' },
          },
        ],
        error: 'Payment required',
      },
      { status: 402, headers: { 'WWW-Authenticate': 'x402' } },
    );
  }

  // Payment payload present — verify with x402.org facilitator
  const paymentRequirements = {
    scheme: 'exact' as const,
    network: 'base-sepolia' as const,
    maxAmountRequired: microUsdc,
    asset: USDC_ADDRESS,
    payTo,
    description,
    maxTimeoutSeconds: 300,
    extra: { name: 'USDC', version: '2' },
  };

  let verifyResult: { isValid: boolean; invalidReason?: string };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verifyResult = await verify(paymentPayload as any, paymentRequirements as any);
  } catch (e) {
    console.error('[x402] verify error:', e);
    return paymentRequiredResponse(priceUsd, payTo, description);
  }

  if (!verifyResult.isValid) {
    console.warn('[x402] verify invalid:', verifyResult.invalidReason);
    return paymentRequiredResponse(priceUsd, payTo, description);
  }

  // Settle — facilitator executes the USDC transferWithAuthorization on-chain
  let settleResult: { success: boolean; transaction?: string; errorReason?: string };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settleResult = await settle(paymentPayload as any, paymentRequirements as any);
  } catch (e) {
    console.error('[x402] settle error:', e);
    return paymentRequiredResponse(priceUsd, payTo, description);
  }

  if (!settleResult.success) {
    console.warn('[x402] settle failed:', settleResult.errorReason);
    return paymentRequiredResponse(priceUsd, payTo, description);
  }

  console.log(`[x402] ✓ Payment settled — tx: ${settleResult.transaction}`);

  // Log the access with on-chain tx hash
  await prisma.accessLog.create({
    data: {
      articleId: id,
      consumerAgent: 'x402-verified',
      pricePaid: priceUsd,
      negotiationRounds: 0,
      txHash: settleResult.transaction ?? null,
    },
  }).catch((e) => console.error('[content] AccessLog create failed:', e));

  return NextResponse.json({
    id: article.id,
    title: article.title,
    content: article.content,
    summary: article.summary,
    tier: article.tier,
    txHash: settleResult.transaction,
  });
}
