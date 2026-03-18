import { NextRequest, NextResponse } from 'next/server';

// OpenServ agent webhook: receives events from OpenServ platform
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  console.log('[OpenServ webhook]', body);
  return NextResponse.json({ received: true });
}
