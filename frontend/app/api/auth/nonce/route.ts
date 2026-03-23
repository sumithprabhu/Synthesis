import { NextRequest, NextResponse } from 'next/server';
import { createNonce } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  const nonce = createNonce(address);
  console.log(`[auth/nonce] Generated nonce for ${address}`);
  return NextResponse.json({ nonce, message: `Sign this message to login to Parley Protocol.\n\nNonce: ${nonce}` });
}
