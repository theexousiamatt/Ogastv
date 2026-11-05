import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { FIRST_ADMIN_EMAIL, isValidFirstAdminInvite } from '@/cms/first-admin-invite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
  );
}

export async function POST(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  const expectedOrigin = new URL(configuredOrigin === 'https://ogastv-cms.inspirarestudio.com'
    ? 'https://ogastvafrica.ng' : configuredOrigin).origin;
  if (request.headers.get('origin') !== expectedOrigin) {
    return reply('This request must come from the OgasTV activation page.', 403);
  }
  const size = Number(request.headers.get('content-length') || '0');
  if (size > 4096 || !request.headers.get('content-type')?.startsWith('application/json')) {
    return reply('Invalid request.', 400);
  }

  const input = await request.json().catch(() => null) as
    { token?: unknown; password?: unknown } | null;

  if (!isValidFirstAdminInvite(input?.token)) {
    return reply('This invitation is invalid, has expired or is no longer active.', 403);
  }
  const password = input?.password;
  if (typeof password !== 'string' || password.length < 16 || password.length > 128) {
    return reply('Choose a password with 16–128 characters.', 400);
  }

  try {
    const payload = await getPayload({ config });
    const count = await payload.count({ collection: 'staff-users', overrideAccess: true });
    if (count.totalDocs !== 0) return reply('The first administrator is already activated.', 410);

    // The user has proven control of the destination email by following the
    // high-entropy link delivered to that inbox. No password is emailed or logged.
    const user = await payload.create({
      collection: 'staff-users',
      data: {
        email: FIRST_ADMIN_EMAIL,
        name: 'OgasTV Administrator',
        password,
        role: 'administrator',
      },
      overrideAccess: true,
      disableVerificationEmail: true,
      context: { verifiedFirstAdminInvite: true },
    });

    // Verify using Payload's own auth operation so the user can log in with
    // email verification enabled, without the console-only email adapter.
    const fullUser = await payload.findByID({
      collection: 'staff-users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    }) as typeof user & { _verificationToken?: string };
    if (!fullUser._verificationToken) {
      // Do not claim success when account verification did not complete.
      console.error('First administrator created but has no verification token');
      return reply('Account created, but verification requires administrator support.', 500);
    }
    await payload.verifyEmail({ collection: 'staff-users', token: fullUser._verificationToken });

    return NextResponse.json(
      { success: true, loginPath: '/admin/login' },
      { status: 201, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } },
    );
  } catch (error) {
    // Avoid logging request bodies, passwords, invitation tokens or auth data.
    console.error('OgasTV administrator invitation could not be completed', error instanceof Error ? error.message : 'unknown');
    return reply('Activation could not be completed. Please contact the studio.', 500);
  }
}
