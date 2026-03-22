import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createWallet } from '@/lib/cdp/wallet';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Register a new publisher: create CDP wallet, then Publisher record.
 * Never stores private keys; only walletId and wallet address are stored.
 * Falls back to a mock wallet if CDP is not configured.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email required' },
        { status: 400 }
      );
    }
    const existing = await prisma.publisher.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    let walletId: string;
    let address: string;

    try {
      const cdpWallet = await createWallet();
      walletId = cdpWallet.walletId;
      address = cdpWallet.address;
    } catch (cdpErr) {
      // CDP not configured or unavailable — use a deterministic mock wallet for dev/testing
      console.warn('CDP wallet creation failed, using mock wallet for dev:', cdpErr);
      const mockBytes = randomBytes(20);
      address = `0x${mockBytes.toString('hex')}`;
      walletId = `mock-wallet-${Date.now()}`;
    }

    const pub = await prisma.publisher.create({
      data: {
        name,
        email,
        walletAddress: address,
        cdpWalletId: walletId,
        passwordHash: password
          ? await bcrypt.hash(password, 10)
          : null,
      },
    });

    return NextResponse.json({
      id: pub.id,
      email: pub.email,
      name: pub.name,
      walletAddress: pub.walletAddress,
      message: walletId.startsWith('mock-')
        ? 'Publisher registered with mock wallet (CDP not configured)'
        : 'Publisher registered with CDP managed wallet',
    });
  } catch (e) {
    const err = e as { apiMessage?: string; message?: string };
    const msg = err.apiMessage || err.message || String(e) || 'Registration failed';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
