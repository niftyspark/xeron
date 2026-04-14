import { SignJWT, jwtVerify } from 'jose';

// Stable secret - same across all serverless function instances
// In production, set JWT_SECRET env var for security
const JWT_SECRET_VALUE = process.env.JWT_SECRET || 'xeron-platform-jwt-secret-2024-stable-key';
const secret = new TextEncoder().encode(JWT_SECRET_VALUE);

export async function signToken(payload: { userId: string; walletAddress: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; walletAddress: string };
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
