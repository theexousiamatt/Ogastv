'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, Radio, Square, Youtube } from 'lucide-react';
import { parseYouTubeLiveId, isYouTubeLiveVideoId } from '../lib/youtube-live';
import { formatLagosTimestamp } from '../lib/broadcast-timeline';
import styles from './YouTubeBroadcaster.module.css';

type EventStatus='scheduled'|'live'|'ended'|'interrupted'|'cancelled'|'replay_available';
type Props={eventId?:number;title?:string;videoId?:string|null;status?:string;blockedByActiveEvent?:boolean};
async function youtubeAction(body:object){
  const response=await fetch('/api/ogas-live/youtube',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Could not update the broadcast.');
  return data as {eventId?:number;actualEnd?:string|null};
}
export function YouTubeBroadcaster({eventId,title='',videoId=null,status='scheduled',blockedByActiveEvent=false}:Props){
  const router=useRouter();
  const existing=Number.isSafeInteger(eventId)&&Number(eventId)>0;
  const [name,setName]=useState(title);
  const [url,setUrl]=useState(existing&&isYouTubeLiveVideoId(videoId)?'https://www.youtube.com/watch?v='+videoId:'');
  const [description,setDescription]=useState('');
  const [id,setId]=useState<number|null>(existing?eventId!:null);
  const [broadcastStatus,setBroadcastStatus]=useState<EventStatus>(
    status==='live'?'live':status==='ended'?'ended':'scheduled'
  );
  const [endedAt,setEndedAt]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [confirmEnd,setConfirmEnd]=useState(false);
  const [error,setError]=useState('');
  const parsed=parseYouTubeLiveId(url);
  const publishable=Boolean(parsed&&name.trim().length>=3&&name.trim().length<=120);

  async function publish(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy||blockedByActiveEvent||broadcastStatus==='live'||broadcastStatus==='ended'||!publishable)return;
    setBusy(true);setError('');
    try{
      const result=await youtubeAction(existing?
        {action:'publish-existing',eventId:id}:
        {action:'start',title:name.trim(),youtubeUrl:url.trim(),description:description.trim()});
      setId(Number(result.eventId));setBroadcastStatus('live');
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Unable to publish video');}
    finally{setBusy(false)}
  }
  async function end(){
    if(!id||busy||broadcastStatus!=='live')return;
    setBusy(true);setError('');
    try{
      const result=await youtubeAction({action:'end',eventId:id});
      setEndedAt(result.actualEnd||null);setBroadcastStatus('ended');setConfirmEnd(false);
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'Unable to end event');}
    finally{setBusy(false)}
  }
  return <section className={styles.panel} aria-labelledby="ogas-youtube-heading">
    <div className={styles.titleRow}><span className={styles.youtubeIcon}><Youtube size={23}/></span>
      <div><span className={styles.youtubeStep}>02 / YouTube setup</span>
      <h2 id="ogas-youtube-heading" className={styles.title}>Connect your YouTube livestream</h2>
      <p className={styles.intro}>Add an existing livestream to OgasTV's live page.</p></div>
    </div>
    <details className={styles.how}>
      <summary>Before you connect YouTube <span aria-hidden="true">+</span></summary>
      <p>Start your livestream in YouTube Studio and allow embedding. OgasTV shows that video on its live page—it does not start or stop streaming on YouTube.</p>
    </details>
    {broadcastStatus==='ended'?<div className={styles.finished} role="status">
      <CheckCircle2 size={25}/><div><strong>Broadcast ended on OgasTV</strong>
      <p>{endedAt?'Ended '+formatLagosTimestamp(endedAt):'This event is no longer live.'}</p>
      <a href="/broadcast-studio">Create another broadcast</a></div>
    </div>:broadcastStatus==='live'?<div className={styles.published} role="status">
      <div className={styles.activeRow}><span className={styles.liveDot}/> <strong>Currently featured on OgasTV</strong></div>
      <h3>{name}</h3>
      <p>Viewers can watch this YouTube video on the OgasTV Live page. When your YouTube stream finishes, end this event here too.</p>
      <div className={styles.actions}>
        <a href="/live" target="_blank" rel="noopener noreferrer" className={styles.secondary}>
          <ExternalLink size={16}/> View public live page
        </a>
        {id&&<a href={'/broadcast-studio/'+id} className={styles.secondary}>Manage event</a>}
        <button type="button" className={styles.end} onClick={()=>setConfirmEnd(true)} disabled={busy||confirmEnd}>
          <Square size={15}/> End OgasTV broadcast
        </button>
      </div>
      {confirmEnd&&<div className={styles.endConfirmation} role="group" aria-label="Confirm end of YouTube broadcast">
        <strong>End this event on OgasTV?</strong>
        <p>Current OgasTV viewers will see “This broadcast has ended”. The video on YouTube will keep playing until you stop it there.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={()=>setConfirmEnd(false)} disabled={busy}>Cancel</button>
          <button type="button" className={styles.end} onClick={()=>void end()} disabled={busy}>
            <Square size={15}/> {busy?'Ending…':'Yes, end on OgasTV'}
          </button>
        </div>
      </div>}
    </div>:<form onSubmit={e=>void publish(e)}>
      <div className={styles.field}><label htmlFor="youtube-broadcast-title">Broadcast title</label>
        <input id="youtube-broadcast-title" value={name} onChange={e=>setName(e.target.value)}
          placeholder="What are you covering?" maxLength={120} minLength={3} required readOnly={existing}/></div>
      <div className={styles.field}><label htmlFor="youtube-broadcast-url">YouTube Live URL or video ID</label>
        <input id="youtube-broadcast-url" inputMode="url" autoCapitalize="none" autoCorrect="off"
          placeholder="https://youtube.com/live/..." value={url} onChange={e=>setUrl(e.target.value)}
          readOnly={existing} required aria-describedby="youtube-link-help" spellCheck={false}/>
        <span id="youtube-link-help" className={styles.hint}>Paste the link to the livestream already running on YouTube.</span>
        {url.trim()&&!parsed&&<span className={styles.validation}>Enter a valid YouTube video link.</span>}
      </div>
      {!existing&&<div className={styles.field}><label htmlFor="youtube-broadcast-description">Description <span className={styles.optional}>(optional)</span></label>
        <textarea id="youtube-broadcast-description" value={description} onChange={e=>setDescription(e.target.value)}
          placeholder="A short introduction to the live coverage" rows={3} maxLength={500}/></div>}
      {parsed&&<div className={styles.preview}>
        <div className={styles.previewTop}><span>Video preview</span><a href={'https://www.youtube.com/watch?v='+parsed}
          target="_blank" rel="noopener noreferrer"><ExternalLink size={13}/> Open on YouTube</a></div>
        <iframe key={parsed} src={'https://www.youtube-nocookie.com/embed/'+parsed}
          title="Preview YouTube livestream" loading="lazy" allow="encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
        <p>Confirm the video is live and can be embedded. OgasTV does not verify YouTube's live status automatically.</p>
      </div>}
      {blockedByActiveEvent&&<p role="status" className={styles.publishBlocked}>
        An existing event is still marked LIVE. Review or end that event above before publishing a new one.
      </p>}
      <button type="submit" className={styles.publish} disabled={busy||blockedByActiveEvent||!publishable}>
        <Radio size={17}/>{busy?'Publishing…':'Publish live on OgasTV'}
      </button>
    </form>}
    {error&&<p className={styles.error} role="alert">{error} <a href="/studio/manage">Manage live events</a></p>}
  </section>;
}
