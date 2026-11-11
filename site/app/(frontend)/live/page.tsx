import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { LiveBroadcastStage } from '../../../components/LiveBroadcastStage';
import './live.css';

export const metadata:Metadata={title:'Live Broadcasts',description:'Watch OgasTV Nigeria live coverage and events.'};
export const dynamic='force-dynamic';

export default async function LivePage() {
  const cms = await getPayload({config});
  const events = await cms.find({
    collection:'live-events',overrideAccess:true,depth:0,limit:15,sort:'-updatedAt',
    where:{and:[{_status:{equals:'published'}},{broadcastStatus:{equals:'live'}}]},
  });
  const youtubeFallback=process.env.NEXT_PUBLIC_OGASTV_LIVE_YOUTUBE_ID||'';
  const live=events.docs[0];
  const youtube=live?.sourceType==='youtube'?live.youtubeVideoId:!live?youtubeFallback:'';
  const youtubeId=typeof youtube==='string'&&/^[\\w-]{11}$/.test(youtube)?youtube:'';
  const isOnAir=Boolean(live||youtubeId);

  return (
    <div className="ogas-live-page">
      <section className="ogas-live-page__heading wrap" aria-labelledby="ogas-live-title">
        <span className="ogas-live-page__eyebrow">
          <span className="ogas-live-page__signal" aria-hidden="true"/>
          OgasTV / On Air
        </span>
        <h1 id="ogas-live-title">Live from the story.</h1>
        <p>Follow live events, important conversations and breaking developments with OgasTV Nigeria.</p>
      </section>
      <section className="ogas-live-page__stage wrap" aria-label={isOnAir?'Live broadcast player':'Broadcast status'}>
        {live&&live.sourceType!=='youtube'?
          <LiveBroadcastStage eventId={Number(live.id)} title={String(live.title||'Live coverage')}
            description={typeof live.description==='string'?live.description:null}/>:
          <>
            <div className="live-player ogas-live-page__player">
              {youtubeId?
                <div className="ogas-live-page__youtube">
                  <iframe title="OgasTV live broadcast"
                    src={'https://www.youtube-nocookie.com/embed/'+youtubeId}
                    allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>
                  <span className="ogas-live-page__youtube-badge">LIVE</span>
                </div>:
                <div className="live-placeholder ogas-live-page__offline">
                  <span className="ogas-live-page__offline-symbol" aria-hidden="true">◉</span>
                  <h2>Off air for now.</h2>
                  <p>Our next broadcast will appear here when we go live.</p>
                </div>}
            </div>
            {live&&<div className="ogas-live-page__details">
              <span className="ogas-live-page__status"><span aria-hidden="true"/> Live now</span>
              <h2>{live.title}</h2>
              {live.description&&<p>{live.description}</p>}
            </div>}
          </>}
      </section>
    </div>
  );
}
