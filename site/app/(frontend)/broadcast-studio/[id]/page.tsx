import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '../../../../payload.config';
import { editorial, getStaff } from '../../../../cms/access';
import { PhoneBroadcaster } from '../../../../components/PhoneBroadcaster';
export const dynamic='force-dynamic';
export default async function BroadcastPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^\d+$/.test(id))notFound();
  const cms=await getPayload({config});
  const auth=await cms.auth({headers:await headers()});
  const actor=getStaff(auth.user);
  if(!actor || !editorial(actor))return <main style={{padding:35,margin:'auto',maxWidth:650}}><h1>Newsroom sign-in required</h1><a href="/admin/login">Sign in</a></main>;
  const event=await cms.findByID({collection:'live-events',id:Number(id),overrideAccess:true,draft:true,depth:0}).catch(()=>null);
  if(!event)notFound();
  return <PhoneBroadcaster eventId={Number(id)} title={event.title}/>;
}
