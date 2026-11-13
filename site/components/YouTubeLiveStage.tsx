'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { formatLagosTimestamp } from '../lib/broadcast-timeline';
import styles from './YouTubeBroadcaster.module.css';

type State='live'|'ended'|'offline';
/** OgasTV controls the embed's visibility, not the video running on YouTube.
 * Staff must end the event in Broadcast Studio when YouTube goes off air.
 */
export function YouTubeLiveStage({eventId,videoId,title,description}:{
  eventId:number;videoId:string;title:string;description?:string|null;
}){
  const iframe=useRef<HTMLIFrameElement>(null);
  const [muted,setMuted]=useState(true);
  const [state,setState]=useState<State>('live');
  const [endedAt,setEndedAt]=useState<string|null>(null);
  useEffect(()=>{
    let mounted=true,checking=false;
    async function check(){
      if(!mounted||checking)return;
      checking=true;
      try{
        const response=await fetch('/api/ogas-live/status?eventId='+eventId,{
          cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}
        });
        if(!response.ok)return; // Never mislabel an event based on a network error.
        const result=await response.json() as {state?:State;actualEnd?:string|null};
        if(!mounted)return;
        if(result.state==='ended'||result.state==='offline'){
          setState(result.state);
          if(typeof result.actualEnd==='string')setEndedAt(result.actualEnd);
        }
      }catch{/* Try again on the next poll */}finally{checking=false}
    }
    void check();
    const timer=setInterval(()=>void check(),2000);
    return ()=>{mounted=false;clearInterval(timer)};
  },[eventId]);

  const ended=state==='ended',playing=state==='live';
  const toggleSound=()=>{
    // YouTube's IFrame API accepts commands after enablejsapi=1. Because this
    // runs from an explicit user gesture, the browser can permit audio playback.
    iframe.current?.contentWindow?.postMessage(JSON.stringify({
      event:'command',func:muted?'unMute':'mute',args:[],
    }),'https://www.youtube-nocookie.com');
    if(muted)iframe.current?.contentWindow?.postMessage(JSON.stringify({
      event:'command',func:'setVolume',args:[100],
    }),'https://www.youtube-nocookie.com');
    setMuted(value=>!value);
  };
  return <>
    <div className="live-player ogas-live-page__player">
      <div className="ogas-live-page__youtube">
        {playing?<>
          <iframe ref={iframe} key={videoId} title={'OgasTV Live: '+title}
            src={'https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0'}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen/>
          <span className="ogas-live-page__youtube-badge">LIVE</span>
          <button type="button" onClick={toggleSound}
            aria-label={muted?'Unmute live broadcast':'Mute live broadcast'}
            title={muted?'Turn on sound':'Mute broadcast'}
            style={{position:'absolute',right:14,top:14,zIndex:3,display:'flex',alignItems:'center',gap:8,
              border:'1px solid #ffffff45',borderRadius:999,padding:'9px 12px',
              background:'#111a16d9',color:'#fff',fontSize:12,fontWeight:750,cursor:'pointer'}}>
            {muted?<VolumeX size={18}/>:<Volume2 size={18}/>}
            {muted?'Unmute':'Mute'}
          </button>
        </>:<div className={styles.endedOverlay} role="status" aria-live="polite">
          <CheckCircle2 size={42} color="#cfe2d1"/>
          <h2>{ended?'This broadcast has ended':'Broadcast is off air'}</h2>
          <p>{ended?'Thank you for watching OgasTV Nigeria.':'The event is no longer being featured on OgasTV.'}</p>
        </div>}
      </div>
    </div>
    <div className="ogas-live-page__details">
      {playing?<span className="ogas-live-page__status"><span aria-hidden="true"/> Live now</span>:
        <span className="ogas-live-page__status ogas-live-page__status--ended">
          {ended?'Broadcast ended':'Off air'}
        </span>}
      <h2>{title}</h2>
      {ended&&<p aria-live="polite">
        {formatLagosTimestamp(endedAt)?'Ended '+formatLagosTimestamp(endedAt):'This event is no longer live.'}
      </p>}
      {description&&<p>{description}</p>}
    </div>
  </>;
}
