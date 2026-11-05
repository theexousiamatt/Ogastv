import { createHash, timingSafeEqual } from 'node:crypto';

// Only a SHA-256 digest of a high-entropy token is committed.
// The original token must ONLY be delivered to the owner of the inbox.
export const FIRST_ADMIN_EMAIL = 'ops@inspirarestudio.com';
const INVITE_TOKEN_DIGEST = 'eac379f779b3c82d8db42177fff01edd5fb70b8648c2b2b1521680230c76ef7d';
const EXPIRES_AT = Date.parse('2026-11-08T04:59:04Z');

export function isValidFirstAdminInvite(token: unknown): boolean {
  if (typeof token !== 'string' || token.length < 40 || token.length > 200 || Date.now() >= EXPIRES_AT) return false;
  const digest = createHash('sha256').update(token, 'utf8').digest();
  return timingSafeEqual(digest, Buffer.from(INVITE_TOKEN_DIGEST, 'hex'));
}
