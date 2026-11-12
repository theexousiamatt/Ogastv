import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { LiveBroadcastStage } from '../../../components/LiveBroadcastStage';
import { YouTubeLiveStage } from '../../../components/YouTubeLiveStage';
import { isYouTubeLiveVideoId } from '../../../lib/youtube-live';
import './live.css';

export const metadata:Metadata={title:'Live Broadcasts',description:'Watch OgasTV Nigeria live coverage and events.'};
export const dynamic='force-dynamic';

export default async function LivePage(){
  const cms=await getPayload({config});
  const events=await cms.find({
    collection:'live-events',overrideAccess:true,draft:false,depth:0,limit:25,sort:'-updatedAt',
    where:{and:[{_status:{equals:'published'}},{broadcastStatus:{equals:'live'}}]},
  });
  const now=Date.now();
  // Show only event-backed broadcasts. A static environment-video fallback could
  // incorrectly display LIVE after every newsroom event has ended.
  const live=events.docs.find(event=>{
    if(event.sourceType==='youtube')return isYouTubeLiveVideoId(event.youtubeVideoId);
    if(event.sourceType!=='cloudflare'||!event.publisherSessionId)return false;
    const started=Date.parse(event.actualStart||event.updatedAt||'');
    return Number.isFinite(started)&&started<=now&&now-started<24*60*60*1000;
  });
  return <div className="ogas-live-page">
    <section className="ogas-live-page__heading wrap" aria-labelledby="ogas-live-title">
      <span className="ogas-live-page__eyebrow">
        <span className="ogas-live-page__signal" aria-hidden="true"/>
        OgasTV / On Air
      </span>
      <h1 id="ogas-live-title">Live from the story.</h1>
      <p>Follow live events, important conversations and breaking developments with OgasTV Nigeria.</p>
    </section>
    <section className="ogas-live-page__stage wrap"
      aria-label={live?'Live broadcast player':'Broadcast status'}>
      {live?.sourceType==='youtube'&&isYouTubeLiveVideoId(live.youtubeVideoId)?
        <YouTubeLiveStage eventId={Number(live.id)} videoId={live.youtubeVideoId}
          title={String(live.title||'Live coverage')}
          description={typeof live.description==='string'?live.description:null}/>:
        live?<LiveBroadcastStage eventId={Number(live.id)}
          title={String(live.title||'Live coverage')}
          description={typeof live.description==='string'?live.description:null}/>:
          <div className="live-player ogas-live-page__player">
            <div className="live-placeholder ogas-live-page__offline">
              <span className="ogas-live-page__offline-symbol" aria-hidden="true">◉</span>
              <h2>Off air for now.</h2>
              <p>Our next broadcast will appear here when we go live.</p>
            </div>
          </div>}
    </section>
  </div>;
}
