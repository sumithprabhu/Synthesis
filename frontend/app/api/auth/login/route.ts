import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    const publisher = await prisma.publisher.findUnique({ where: { email } });
    if (!publisher || !publisher.passwordHash) {
      console.log(`[auth/login] Failed login for ${email} — not found or no password`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, publisher.passwordHash);
    if (!valid) {
      console.log(`[auth/login] Wrong password for ${email}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      publisherId: publisher.id,
      email: publisher.email,
      name: publisher.name,
      walletAddress: publisher.walletAddress,
    });

    console.log(`[auth/login] ✓ ${publisher.name} (${publisher.id}) logged in via email`);

    const res = NextResponse.json({
      token,
      publisher: { id: publisher.id, name: publisher.name, email: publisher.email, walletAddress: publisher.walletAddress },
    });
    res.cookies.set('ca_session', token, { httpOnly: true, maxAge: 12 * 60 * 60, path: '/', sameSite: 'lax' });
    return res;
  } catch (e) {
    console.error('[auth/login] error:', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
