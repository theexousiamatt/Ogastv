import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { editorial, getStaff } from '../../../cms/access';

export const dynamic='force-dynamic';
export default async function BroadcastStudio() {
  const cms=await getPayload({config});
  const auth=await cms.auth({headers:await headers()});
  const actor=getStaff(auth.user);
  if(!actor || !editorial(actor)) return <main style={{maxWidth:720,margin:'70px auto',padding:24}}><h1>Newsroom access required</h1><p>Please sign in to the OgasTV admin with an authorized newsroom account.</p><a href="/admin/login">Sign in to newsroom</a></main>;
  const events=await cms.find({collection:'live-events',overrideAccess:true,draft:true,depth:0,limit:50,sort:'-updatedAt'});
  return <main style={{maxWidth:1080,margin:'45px auto 80px',padding:'0 20px',fontFamily:'system-ui'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,flexWrap:'wrap'}}>
      <div><p style={{textTransform:'uppercase',color:'#9a2630',fontSize:11,fontWeight:800,letterSpacing:'.12em'}}>OgasTV Newsroom</p>
      <h1 style={{fontSize:'clamp(32px,5vw,52px)',letterSpacing:'-.06em',margin:'8px 0'}}>Broadcast studio</h1><p style={{color:'#777'}}>Go live from your phone, without YouTube.</p></div>
      <a href="/admin/collections/live-events/create" style={{background:'#a52227',color:'white',borderRadius:99,padding:'13px 21px',textDecoration:'none',fontWeight:700}}>+ Schedule a broadcast</a>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,290px),1fr))',gap:16,marginTop:28}}>
      {events.docs.map(event=><a href={'/broadcast-studio/'+event.id} key={event.id} style={{border:'1px solid #e5e5e3',padding:22,borderRadius:17,textDecoration:'none',background:'white',color:'#202222'}}>
        <span style={{display:'inline-block',fontSize:11,fontWeight:800,color:event.broadcastStatus==='live'?'#b3212c':'#79817b'}}>{event.broadcastStatus==='live'?'● LIVE':String(event.broadcastStatus||'scheduled').toUpperCase()}</span>
        <h2 style={{fontSize:19,lineHeight:1.3,margin:'12px 0'}}>{event.title}</h2>
        <span style={{fontSize:12,color:'#8e2226',fontWeight:700}}>Open broadcast →</span>
      </a>)}
    </div>
    {!events.docs.length&&<p style={{padding:35,background:'#fff',borderRadius:17,marginTop:22}}>No broadcasts yet. Schedule one in the newsroom, then return here to go live.</p>}
  </main>;
}
