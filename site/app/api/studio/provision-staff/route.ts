import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { hasRole, staffRoles, type StaffRole } from '@/cms/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' };
function reply(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers });
}

// SMTP-independent provisioning is restricted to authenticated administrators.
// Only a randomly generated temporary password is returned, exactly once.
export async function POST(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  const origin = new URL(configured === 'https://ogastv-cms.inspirarestudio.com'
    ? 'https://ogastvafrica.ng' : configured).origin;
  if (request.headers.get('origin') !== origin) return reply('Request blocked.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')
    || Number(request.headers.get('content-length') || 0) > 4096) return reply('Invalid request.', 400);

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!hasRole(user, 'administrator')) return reply('Administrator access required.', 403);

  const input = await request.json().catch(() => null) as
    { email?: unknown; name?: unknown; role?: unknown } | null;
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const role = input?.role as StaffRole;
  if (name.length < 2 || name.length > 100 || email.length > 200
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !staffRoles.includes(role)) return reply('Enter a valid name, email and role.', 400);

  const temporaryPassword = randomBytes(36).toString('base64url');
  let newId: string | number | undefined;
  try {
    const created = await payload.create({
      collection: 'staff-users', user, overrideAccess: false,
      disableVerificationEmail: true,
      data: { email, name, role, password: temporaryPassword },
    });
    newId = created.id;
    const full = await payload.findByID({
      collection: 'staff-users', id: newId,
      overrideAccess: true, showHiddenFields: true,
    }) as typeof created & { _verificationToken?: string; _verified?: boolean };
    if (!full._verified) {
      if (!full._verificationToken) throw new Error('Verification token unavailable');
      await payload.verifyEmail({ collection: 'staff-users', token: full._verificationToken });
    }
    return NextResponse.json({
      id: newId, email, name, role, temporaryPassword,
      message: 'Account created. Copy the temporary password now; it will not appear again.',
    }, { status: 201, headers });
  } catch (error) {
    // Avoid leaving an inaccessible half-created staff account behind.
    if (newId !== undefined) {
      try { await payload.delete({ collection: 'staff-users', id: newId, overrideAccess: true }); }
      catch { console.error('[OgasTV] Staff provisioning rollback failed'); }
    }
    console.error('[OgasTV] Staff provisioning failed', error instanceof Error ? error.name : 'unknown');
    return reply('Account could not be created. Confirm the email is not already registered.', 422);
  }
}
