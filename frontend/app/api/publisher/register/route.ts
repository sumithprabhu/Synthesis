import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createWallet } from '@/lib/cdp/wallet';
import bcrypt from 'bcryptjs';

/**
 * Register a new publisher: create CDP wallet, then Publisher record.
 * Never stores private keys; only walletId and wallet address are stored.
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

    const { walletId, address } = await createWallet();

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
      message: 'Publisher registered with CDP managed wallet',
    });
  } catch (e) {
    const err = e as { apiMessage?: string; message?: string };
    const msg = err.apiMessage || err.message || String(e) || 'Registration failed';
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
