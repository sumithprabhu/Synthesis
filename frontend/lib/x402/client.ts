/**
 * Real x402 consumer client using @x402/fetch + @x402/evm.
 * Uses EIP-3009 TransferWithAuthorization — consumer signs, facilitator settles on-chain.
 */
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmSchemeV1 } from '@x402/evm/v1';
import { toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export type NegotiateResponse = {
  decision: 'accept' | 'counter' | 'reject';
  price: number;
  reasoning: string;
  sessionId: string;
  rounds: Array<{ role: string; offer: number; reasoning: string }>;
  agreed?: boolean;
};

/**
 * Negotiate content access price with the publisher's agent.
 */
export async function negotiateAccess(
  baseUrl: string,
  articleId: string,
  consumerAddress: string,
  offer: number,
  useCase?: string,
  sessionId?: string,
): Promise<NegotiateResponse> {
  const res = await fetch(`${baseUrl}/api/agent/negotiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId, consumerAddress, offer, sessionId, useCase }),
  });
  if (!res.ok) throw new Error(`Negotiate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Create a real x402-capable fetch for a given private key.
 * The returned fetch automatically:
 *   1. Makes the request
 *   2. On 402: reads payment requirements
 *   3. Creates EIP-3009 TransferWithAuthorization signature
 *   4. Retries with X-PAYMENT / PAYMENT-SIGNATURE header
 *   5. Facilitator at x402.org verifies + settles USDC on-chain
 */
export function createX402Fetch(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
  const signer = toClientEvmSigner(account, publicClient as Parameters<typeof toClientEvmSigner>[1]);
  const schemeV1 = new ExactEvmSchemeV1(signer);

  return wrapFetchWithPaymentFromConfig(fetch, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schemes: [{ network: 'base-sepolia' as any, client: schemeV1, x402Version: 1 as const }],
  });
}

/**
 * Fetch content using real x402 payment flow.
 * On a 402 response, automatically creates an EIP-3009 authorization signature
 * and retries — facilitator executes the USDC transfer on-chain.
 */
export async function fetchContentWithPayment(
  baseUrl: string,
  articleId: string,
  privateKey: `0x${string}`,
): Promise<{ content: string; title: string }> {
  const x402Fetch = createX402Fetch(privateKey);
  const res = await x402Fetch(`${baseUrl}/api/content/${articleId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Content fetch failed: ${res.status} ${JSON.stringify(body)}`);
  }
  const data = await res.json();
  return { content: data.content, title: data.title };
}
