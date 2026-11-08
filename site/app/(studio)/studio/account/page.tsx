import { headers as getHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getStaff } from '../../../../cms/access';
import StudioAccount from './StudioAccount';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account settings — OgasTV Studio', robots: { index: false, follow: false } };

export default async function StudioAccountPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });
  const staff = getStaff(user);
  if (!staff) redirect('/studio/login');
  return <StudioAccount
    staffId={String(staff.id)}
    name={user && 'name' in user && typeof user.name === 'string' ? user.name : ''}
    email={typeof user?.email === 'string' ? user.email : ''}
  />;
}
