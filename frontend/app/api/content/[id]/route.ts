import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const X402_FACILITATOR = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
function paymentRequiredResponse(priceUsd: number, payTo: string, description: string) {
  const body = {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: String(Math.ceil(priceUsd * 1e6)), // USDC 6 decimals
        asset: 'USDC',
        payTo,
        description: description || 'Article content access',
      },
    ],
    error: 'Payment required',
  };
  return NextResponse.json(body, {
    status: 402,
    headers: {
      'WWW-Authenticate': 'x402',
      'Content-Type': 'application/json',
    },
  });
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
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Free articles bypass the x402 payment gate entirely
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

  const payTo = article.publisher.walletAddress;
  const agreedPriceHeader = request.headers.get('x-agreed-price');
  const priceUsd = agreedPriceHeader ? parseFloat(agreedPriceHeader) : article.basePrice;
  const paymentSignature = request.headers.get('payment-signature');

  if (!paymentSignature || paymentSignature.trim() === '') {
    return paymentRequiredResponse(
      priceUsd,
      payTo,
      `Access: ${article.title}`
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(paymentSignature, 'base64url').toString('utf-8'));
  } catch {
    return paymentRequiredResponse(priceUsd, payTo, `Access: ${article.title}`);
  }

  const paymentRequirements = {
    scheme: 'exact',
    network: 'base-sepolia',
    maxAmountRequired: String(Math.ceil(priceUsd * 1e6)),
    asset: 'USDC',
    payTo,
  };

  try {
    const verifyRes = await fetch(`${X402_FACILITATOR}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentPayload: payload,
        paymentRequirements,
      }),
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error('x402 verify failed:', verifyRes.status, errText);
      return paymentRequiredResponse(priceUsd, payTo, `Access: ${article.title}`);
    }

    const verifyResult = await verifyRes.json();
    if (!verifyResult?.verified && verifyResult?.valid !== true) {
      return paymentRequiredResponse(priceUsd, payTo, `Access: ${article.title}`);
    }
  } catch (e) {
    console.error('x402 verify error:', e);
    return paymentRequiredResponse(priceUsd, payTo, `Access: ${article.title}`);
  }

  return NextResponse.json({
    id: article.id,
    title: article.title,
    content: article.content,
    summary: article.summary,
    tier: article.tier,
  });
}
