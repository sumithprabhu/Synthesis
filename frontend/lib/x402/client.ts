/**
 * Demo consumer agent client using x402 fetch.
 * Flow: negotiate -> pay at agreed price -> receive content
 */
export type NegotiateResponse = {
  decision: 'accept' | 'counter' | 'reject';
  price: number;
  reasoning: string;
  sessionId: string;
  rounds: Array<{ role: string; offer: number; reasoning: string }>;
  agreed?: boolean;
};

export async function negotiateAccess(
  baseUrl: string,
  articleId: string,
  consumerAddress: string,
  offer: number,
  sessionId?: string
): Promise<NegotiateResponse> {
  const res = await fetch(`${baseUrl}/api/agent/negotiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      articleId,
      consumerAddress,
      offer,
      sessionId,
    }),
  });
  if (!res.ok) throw new Error(`Negotiate failed: ${res.status}`);
  return res.json();
}

// x402 pay and fetch content - use @x402/fetch when available
export async function fetchContentWithPayment(
  baseUrl: string,
  articleId: string,
  agreedPriceUsd: number,
  paymentParams: { walletPrivateKey: string; facilitatorUrl?: string }
): Promise<{ content: string; title: string }> {
  const url = `${baseUrl}/api/content/${articleId}`;
  // When using @x402/fetch, wrap fetch with x402 payment at agreedPriceUsd
  const res = await fetch(url, {
    headers: {
      'X-Agreed-Price': agreedPriceUsd.toString(),
      // x402 client would attach payment here
    },
  });
  if (!res.ok) throw new Error(`Content fetch failed: ${res.status}`);
  const data = await res.json();
  return { content: data.content, title: data.title };
}
