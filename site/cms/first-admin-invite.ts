import { createHash, timingSafeEqual } from 'node:crypto';

// Only a SHA-256 digest of a high-entropy token is committed.
// The original token must ONLY be delivered to the owner of the inbox.
export const FIRST_ADMIN_EMAIL = 'ops@inspirarestudio.com';
const INVITE_TOKEN_DIGEST = '3d69a2d0af70911d7cebc4a33bce487a11896a3b1b25095d0bab585f77c15eed';
const EXPIRES_AT = Date.parse('2026-11-12T23:59:00Z');

export function isValidFirstAdminInvite(token: unknown): boolean {
  if (typeof token !== 'string' || token.length < 40 || token.length > 200 || Date.now() >= EXPIRES_AT) return false;
  const digest = createHash('sha256').update(token, 'utf8').digest();
  return timingSafeEqual(digest, Buffer.from(INVITE_TOKEN_DIGEST, 'hex'));
}
