import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'contentagents-dev-secret';
const TOKEN_EXPIRY = '12h';

export type SessionPayload = {
  publisherId: string;
  email: string;
  name: string;
  walletAddress: string;
};

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/** Extract and verify session from Authorization header or cookie */
export function getSession(request: NextRequest): SessionPayload | null {
  // Check Authorization: Bearer <token>
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    return verifyToken(token);
  }
  // Check cookie
  const cookie = request.cookies.get('ca_session')?.value;
  if (cookie) return verifyToken(cookie);
  return null;
}

/** Nonce store for wallet login (in-memory, fine for demo) */
const nonceStore = new Map<string, { nonce: string; expires: number }>();

export function createNonce(address: string): string {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  nonceStore.set(address.toLowerCase(), { nonce, expires: Date.now() + 5 * 60 * 1000 });
  return nonce;
}

export function consumeNonce(address: string): string | null {
  const entry = nonceStore.get(address.toLowerCase());
  if (!entry) return null;
  if (Date.now() > entry.expires) { nonceStore.delete(address.toLowerCase()); return null; }
  nonceStore.delete(address.toLowerCase());
  return entry.nonce;
}
