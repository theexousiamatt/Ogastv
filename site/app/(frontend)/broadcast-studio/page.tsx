import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '../../../payload.config';
import { editorial, getStaff } from '../../../cms/access';
import { PhoneBroadcaster } from '../../../components/PhoneBroadcaster';
import { studioBroadcastStatus } from '../../../lib/broadcast-status';
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

  return <main className={styles.studioPage}>
    <PhoneBroadcaster />
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
            actualStart:typeof event.actualStart==='string'?event.actualStart:null,
            actualEnd:typeof event.actualEnd==='string'?event.actualEnd:null,
            updatedAt:typeof event.updatedAt==='string'?event.updatedAt:null,
          },now);
          const timestamp=event.actualStart||event.scheduledStart||event.updatedAt;
          const date=timestamp?new Date(timestamp):null;
          return <a key={event.id} href={'/broadcast-studio/'+event.id} className={styles.historyItem}>
            <span>
              <span className={styles.historyTitle}>{event.title}</span>
              {date&&Number.isFinite(date.getTime())&&<time className={styles.historyDate} dateTime={date.toISOString()}>
                {date.toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'})}
              </time>}
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
