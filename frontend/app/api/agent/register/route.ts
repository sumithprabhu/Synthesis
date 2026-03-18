import { NextRequest, NextResponse } from 'next/server';
import { registerAgent } from '@/lib/erc8004/registry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletId, agentName } = body;
    if (!walletId || !agentName) {
      return NextResponse.json(
        { error: 'walletId (CDP wallet ID) and agentName required' },
        { status: 400 }
      );
    }
    const txHash = await registerAgent(walletId, agentName);
    return NextResponse.json({ success: true, txHash });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
