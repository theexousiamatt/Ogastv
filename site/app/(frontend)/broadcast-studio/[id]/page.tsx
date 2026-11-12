import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '../../../../payload.config';
import { editorial, getStaff } from '../../../../cms/access';
import { PhoneBroadcaster } from '../../../../components/PhoneBroadcaster';
import { YouTubeBroadcaster } from '../../../../components/YouTubeBroadcaster';
import styles from '../../../../components/PhoneBroadcaster.module.css';
export const dynamic='force-dynamic';
export default async function BroadcastPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^\d+$/.test(id))notFound();
  const cms=await getPayload({config});
  const auth=await cms.auth({headers:await headers()});
  const actor=getStaff(auth.user);
  if(!actor || !editorial(actor))return <main style={{padding:35,margin:'auto',maxWidth:650}}><h1>Newsroom sign-in required</h1><a href="/admin/login">Sign in</a></main>;
  const event=await cms.findByID({collection:'live-events',id:Number(id),overrideAccess:true,draft:false,depth:0}).catch(()=>null);
  if(!event)notFound();
  return <main className={styles.studioPage}>
    {event.sourceType==='youtube'?
      <YouTubeBroadcaster eventId={Number(id)} title={String(event.title||'')}
        videoId={typeof event.youtubeVideoId==='string'?event.youtubeVideoId:null}
        status={typeof event.broadcastStatus==='string'?event.broadcastStatus:'scheduled'}/>:
      <PhoneBroadcaster eventId={Number(id)} title={String(event.title||'')}/>}
  </main>;
}
