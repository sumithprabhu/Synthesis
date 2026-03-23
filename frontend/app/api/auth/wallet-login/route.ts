import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { prisma } from '@/lib/prisma';
import { signToken, consumeNonce } from '@/lib/auth';
import { createWallet } from '@/lib/cdp/wallet';

export async function POST(request: NextRequest) {
  try {
    const { address, signature, nonce } = await request.json();
    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: 'address, signature, and nonce required' }, { status: 400 });
    }

    // Verify nonce was issued for this address
    const storedNonce = consumeNonce(address);
    if (!storedNonce || storedNonce !== nonce) {
      console.log(`[auth/wallet-login] Invalid or expired nonce for ${address}`);
      return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
    }

    // Verify signature
    const message = `Sign this message to login to Parley Protocol.\n\nNonce: ${nonce}`;
    const valid = await verifyMessage({ address: address as `0x${string}`, message, signature });
    if (!valid) {
      console.log(`[auth/wallet-login] Invalid signature for ${address}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Find or auto-create publisher by wallet address
    let publisher = await prisma.publisher.findUnique({ where: { walletAddress: address } });
    if (!publisher) {
      console.log(`[auth/wallet-login] No publisher found for ${address} — auto-creating`);
      let walletId: string;
      try {
        const cdpWallet = await createWallet();
        walletId = cdpWallet.walletId;
      } catch {
        walletId = `mock-wallet-${Date.now()}`;
      }
      publisher = await prisma.publisher.create({
        data: {
          name: `${address.slice(0, 6)}…${address.slice(-4)}`,
          email: `${address.toLowerCase()}@wallet.local`,
          walletAddress: address,
          cdpWalletId: walletId,
        },
      });
      console.log(`[auth/wallet-login] ✓ Auto-created publisher for ${address}`);
    }

    const token = signToken({
      publisherId: publisher.id,
      email: publisher.email,
      name: publisher.name,
      walletAddress: publisher.walletAddress,
    });

    console.log(`[auth/wallet-login] ✓ ${publisher.name} (${publisher.id}) logged in via wallet ${address}`);

    const res = NextResponse.json({
      token,
      publisher: { id: publisher.id, name: publisher.name, email: publisher.email, walletAddress: publisher.walletAddress },
    });
    res.cookies.set('ca_session', token, { httpOnly: true, maxAge: 12 * 60 * 60, path: '/', sameSite: 'lax' });
    return res;
  } catch (e) {
    console.error('[auth/wallet-login] error:', e);
    return NextResponse.json({ error: 'Wallet login failed' }, { status: 500 });
  }
}
