/**
 * AES-256-GCM encryption for sensitive at-rest data (OAuth tokens,
 * user-supplied API keys).
 *
 * Audit findings addressed:
 *  - Removed hardcoded fallback 'xeron-secret-key-32-chars!'.
 *  - Decoupled from JWT_SECRET — uses a dedicated ENCRYPTION_KEY env var so a
 *    JWT-secret rotation does not invalidate stored ciphertext (and vice-versa).
 *  - Replaced the static 'salt' literal with a per-record random salt that is
 *    stored in the ciphertext envelope: `salt:iv:authTag:ciphertext`.
 *
 * ENCRYPTION_KEY format: 64 hex chars (32 bytes) or 44 base64 chars.
 * Generate with: `openssl rand -hex 32`
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { CriticalConfigError } from './errors';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM-recommended.
const SALT_LEN = 16;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;

function loadMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new CriticalConfigError(
      'ENCRYPTION_KEY must be set (64 hex chars). Generate with: openssl rand -hex 32',
    );
  }

  // Accept hex (64) or base64 (44) for operator convenience.
  let bytes: Buffer | null = null;
  if (/^[0-9a-f]{64}$/i.test(raw)) bytes = Buffer.from(raw, 'hex');
  else if (raw.length === 44 || raw.length === 43) {
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === KEY_LEN) bytes = b;
    } catch {
      /* fall through */
    }
  }

  if (!bytes || bytes.length !== KEY_LEN) {
    throw new CriticalConfigError(
      'ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex chars).',
    );
  }
  return bytes;
}

const MASTER_KEY = loadMasterKey();

/**
 * Encrypts a UTF-8 string. Returns `salt:iv:authTag:ciphertext` (all hex).
 * The per-record salt ensures two encryptions of the same plaintext produce
 * different ciphertexts, and limits cross-record key reuse exposure.
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('encrypt() requires a string');
  }
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const derivedKey = scryptSync(MASTER_KEY, salt, KEY_LEN);

  const cipher = createCipheriv(ALGO, derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [salt, iv, authTag, ciphertext].map((b) => b.toString('hex')).join(':');
}

/**
 * Decrypts a ciphertext produced by encrypt().
 * Returns null on any integrity failure — callers must handle null rather than
 * receiving an empty string (which would mask bugs).
 */
export function decrypt(envelope: string): string | null {
  if (typeof envelope !== 'string') return null;
  const parts = envelope.split(':');
  if (parts.length !== 4) return null;

  try {
    const [saltHex, ivHex, tagHex, ctHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ctHex, 'hex');

    if (
      salt.length !== SALT_LEN ||
      iv.length !== IV_LEN ||
      authTag.length !== AUTH_TAG_LEN
    ) {
      return null;
    }

    const derivedKey = scryptSync(MASTER_KEY, salt, KEY_LEN);
    const decipher = createDecipheriv(ALGO, derivedKey, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    // GCM auth-tag mismatch, malformed input, key change, etc.
    return null;
  }
}

/** Safe hash comparison for non-secret tokens where we want constant time. */
export function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
