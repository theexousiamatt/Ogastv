import React from 'react';
import { headers as getHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getStaff } from '../../../cms/access';
import { StudioApp } from './StudioApp';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'OgasTV Studio — Your newsroom', robots: { index: false, follow: false } };

export default async function StudioPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  const actor = getStaff(user);
  if (!actor) redirect('/studio/login');
  return <StudioApp
    staffId={String(actor.id)}
    name={typeof user === 'object' && user && 'name' in user && typeof user.name === 'string' ? user.name : 'Newsroom team'}
    role={String(actor.role || 'journalist')}
  />;
}
