import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { editorial, getStaff } from '../../../cms/access';
import { BroadcastSourceSelector } from '../../../components/BroadcastSourceSelector';
import { studioBroadcastStatus } from '../../../lib/broadcast-status';
import { formatBroadcastDuration, formatLagosTimestamp } from '../../../lib/broadcast-timeline';
import styles from '../../../components/PhoneBroadcaster.module.css';

export const dynamic='force-dynamic';

const statusLabels={
  live:'LIVE',
  ended:'ENDED',
  scheduled:'SCHEDULED',
  interrupted:'CHECK CONNECTION',
} as const;

export default async function BroadcastStudio() {
  const cms=await getPayload({config});
  const auth=await cms.auth({headers:await headers()});
  const actor=getStaff(auth.user);
  if(!actor || !editorial(actor)) return <main style={{maxWidth:720,margin:'70px auto',padding:24}}><h1>Newsroom access required</h1><p>Sign in to broadcast from OgasTV.</p><a href="/studio/login">Sign in to newsroom</a></main>;

  // The newsroom needs the CURRENT event state, not the last Payload version.
  // A draft:true read can resurrect a historical 'live' label after an event ended.
  const events=await cms.find({collection:'live-events',overrideAccess:true,draft:false,depth:0,limit:10,sort:'-updatedAt'});
  const now=Date.now();
  // Query the active event independently: it might not be one of the ten
  // most recently edited history records shown further down this page.
  const activeEvents=await cms.find({collection:'live-events',overrideAccess:true,draft:false,
    depth:0,limit:1,sort:'-updatedAt',where:{and:[
      {_status:{equals:'published'}},{broadcastStatus:{equals:'live'}},
      {actualEnd:{exists:false}}
    ]}});
  const activeEvent=activeEvents.docs[0];
  // A previous broadcaster can leave a CMS event marked LIVE after disconnecting.
  // Keep it visible for staff to review, but do not claim the video is transmitting.
  const activeState=activeEvent?studioBroadcastStatus({
    broadcastStatus:typeof activeEvent.broadcastStatus==='string'?activeEvent.broadcastStatus:null,
    sourceType:typeof activeEvent.sourceType==='string'?activeEvent.sourceType:null,
    publisherSessionId:typeof activeEvent.publisherSessionId==='string'?activeEvent.publisherSessionId:null,
    youtubeVideoId:typeof activeEvent.youtubeVideoId==='string'?activeEvent.youtubeVideoId:null,
    actualStart:typeof activeEvent.actualStart==='string'?activeEvent.actualStart:null,
    actualEnd:typeof activeEvent.actualEnd==='string'?activeEvent.actualEnd:null,
    updatedAt:typeof activeEvent.updatedAt==='string'?activeEvent.updatedAt:null,
  },now):null;

  return <main className={styles.studioPage}>
    <BroadcastSourceSelector activeEvent={activeEvent&&activeState?{
      id:Number(activeEvent.id),title:String(activeEvent.title||'Untitled event'),state:activeState,
      sourceType:activeEvent.sourceType==='youtube'?'youtube':'cloudflare',
      videoId:typeof activeEvent.youtubeVideoId==='string'?activeEvent.youtubeVideoId:null
    }:null}/>
    <details className={styles.history}>
      <summary className={styles.historySummary}>Previous and scheduled broadcasts</summary>
      <p className={styles.historyHelper}>Start a new broadcast above, or choose an existing event below. Older events remain available for reference.</p>
      <div className={styles.historyList}>
        {events.docs.map(event=>{
          // Payload's generic JsonObject does not expose optional collection fields in TS.
          const status=studioBroadcastStatus({
            broadcastStatus:typeof event.broadcastStatus==='string'?event.broadcastStatus:null,
            sourceType:typeof event.sourceType==='string'?event.sourceType:null,
            publisherSessionId:typeof event.publisherSessionId==='string'?event.publisherSessionId:null,
            youtubeVideoId:typeof event.youtubeVideoId==='string'?event.youtubeVideoId:null,
            actualStart:typeof event.actualStart==='string'?event.actualStart:null,
            actualEnd:typeof event.actualEnd==='string'?event.actualEnd:null,
            updatedAt:typeof event.updatedAt==='string'?event.updatedAt:null,
          },now);
          const started=typeof event.actualStart==='string'?event.actualStart:null;
          const ended=typeof event.actualEnd==='string'?event.actualEnd:null;
          const scheduled=typeof event.scheduledStart==='string'?event.scheduledStart:null;
          const startText=formatLagosTimestamp(started);
          const endText=formatLagosTimestamp(ended);
          const scheduledText=formatLagosTimestamp(scheduled);
          const duration=formatBroadcastDuration(started,ended);
          return <a key={event.id} href={'/broadcast-studio/'+event.id} className={styles.historyItem}>
            <span>
              <span className={styles.historyTitle}>{event.title}</span>
              <span className={styles.historyTimeline}>
                {startText?<span>Started: <time dateTime={started!}>{startText}</time></span>:
                  status==='scheduled'&&scheduledText?<span>Scheduled: <time dateTime={scheduled!}>{scheduledText}</time></span>:
                  status==='ended'?<span>Start time unavailable</span>:null}
                {status==='ended'&&<span>Ended: {endText?<time dateTime={ended!}>{endText}</time>:'Time unavailable'}</span>}
                {status==='ended'&&duration&&<span>Duration: {duration}</span>}
              </span>
            </span>
            <span className={[styles.historyStatus,status==='live'?styles.historyStatusLive:'',status==='interrupted'?styles.historyStatusInterrupted:''].filter(Boolean).join(' ')}>
              {statusLabels[status]}
            </span>
          </a>;
        })}
        {events.docs.length===0&&<p className={styles.historyHelper}>No previous broadcasts yet.</p>}
      </div>
      <a href="/studio/manage" className={styles.historyNew}>Manage scheduled broadcasts ↗</a>
    </details>
  </main>;
}
