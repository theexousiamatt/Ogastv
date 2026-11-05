import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { LiveViewer } from '../../../components/LiveViewer';

export const metadata:Metadata={title:'Live Broadcasts',description:'Watch OgasTV Africa live coverage and events.'};
export const dynamic='force-dynamic';
export default async function LivePage(){
  const cms=await getPayload({config});
  const events=await cms.find({collection:'live-events',overrideAccess:true,depth:0,limit:15,sort:'-updatedAt',
    where:{and:[{_status:{equals:'published'}},{broadcastStatus:{equals:'live'}}]}});
  const youtubeFallback=process.env.NEXT_PUBLIC_OGASTV_LIVE_YOUTUBE_ID||'';
  const live=events.docs[0];
  const youtube=live?.sourceType==='youtube'?live.youtubeVideoId:!live?youtubeFallback:'';
  const youtubeId=typeof youtube==='string'&&/^[\w-]{11}$/.test(youtube)?youtube:'';
  return <>
    <section className="live-heading wrap"><span className="eyebrow">OgasTV / On Air</span>
      <h1>Live from the story.</h1>
      <p>Follow live events, important conversations and breaking developments with OgasTV Africa.</p>
    </section>
    <section className="wrap"><div className="live-player">
      {live&&live.sourceType!=='youtube'?<LiveViewer eventId={Number(live.id)}/>:
        youtubeId?<iframe title="OgasTV live broadcast" src={'https://www.youtube-nocookie.com/embed/'+youtubeId}
          allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:
        <div className="live-placeholder"><span aria-hidden="true">◉</span>
          <h2>Off air for now.</h2><p>Our next broadcast will appear here when we go live.</p></div>}
    </div>
    {live&&<div style={{marginTop:20,marginBottom:30}}>
      <span style={{fontWeight:800,color:'#ac2225',fontSize:12}}>● LIVE NOW</span>
      <h2 style={{fontSize:23,margin:'8px 0'}}>{live.title}</h2>
      {live.description&&<p style={{color:'#727574'}}>{live.description}</p>}
    </div>}
    </section>
  </>;
}
