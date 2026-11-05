import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { editorial, getStaff } from '../../../cms/access';
import { PhoneBroadcaster } from '../../../components/PhoneBroadcaster';

export const dynamic='force-dynamic';
export default async function BroadcastStudio() {
  const cms=await getPayload({config});
  const auth=await cms.auth({headers:await headers()});
  const actor=getStaff(auth.user);
  if(!actor || !editorial(actor)) return <main style={{maxWidth:720,margin:'70px auto',padding:24}}><h1>Newsroom access required</h1><p>Sign in to broadcast from OgasTV.</p><a href="/admin/login">Sign in to newsroom</a></main>;
  const events=await cms.find({collection:'live-events',overrideAccess:true,draft:true,depth:0,limit:10,sort:'-updatedAt'});
  return <main style={{maxWidth:860,margin:'24px auto 80px',padding:'0 18px',fontFamily:'system-ui'}}>
    <PhoneBroadcaster />
    <details style={{marginTop:30,borderTop:'1px solid #e5e5e3',paddingTop:20}}>
      <summary style={{cursor:'pointer',fontSize:15,fontWeight:700,color:'#454746'}}>Previous and scheduled broadcasts</summary>
      <p style={{color:'#777',fontSize:13}}>You don't need to schedule anything to go live. Use an existing event here only if needed.</p>
      <div style={{display:'grid',gap:9,marginTop:16}}>
        {events.docs.map(event=><a href={'/broadcast-studio/'+event.id} key={event.id}
          style={{display:'flex',justifyContent:'space-between',gap:12,border:'1px solid #e5e5e3',padding:'14px 16px',borderRadius:12,textDecoration:'none',background:'white',color:'#202222'}}>
          <span style={{fontWeight:650}}>{event.title}</span>
          <span style={{fontSize:12,color:event.broadcastStatus==='live'?'#b3212c':'#79817b'}}>{String(event.broadcastStatus||'scheduled').toUpperCase()}</span>
        </a>)}
      </div>
      <a href="/admin/collections/live-events/create" style={{display:'inline-block',marginTop:15,fontSize:13,color:'#a52227'}}>Schedule a broadcast for later ↗</a>
    </details>
  </main>;
}
