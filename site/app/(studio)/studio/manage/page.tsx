import { headers as getHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getStaff } from '../../../../cms/access';
import StudioManage from './StudioManage';
import '../studio-auth.css';
import './studio-manage.css';

export const dynamic='force-dynamic';
export const metadata={title:'Manage newsroom — OgasTV Studio',robots:{index:false,follow:false}};

export default async function StudioManagePage(){
  const payload=await getPayload({config});
  const {user}=await payload.auth({headers:await getHeaders()});
  const actor=getStaff(user);
  if(!actor)redirect('/studio/login');
  const role=String(actor.role);
  if(!['administrator','editor_in_chief','editor','moderator','journalist','advertising_manager'].includes(role))redirect('/studio');
  const emailReady=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.SMTP_FROM_ADDRESS);
  return <StudioManage role={role} staffId={String(actor.id)} emailReady={emailReady}/>;
}
