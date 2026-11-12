'use client';
import { useState } from 'react';
import { RadioTower, Youtube, CheckCircle2 } from 'lucide-react';
import { PhoneBroadcaster } from './PhoneBroadcaster';
import { YouTubeBroadcaster } from './YouTubeBroadcaster';
import styles from './YouTubeBroadcaster.module.css';

export function BroadcastSourceSelector({activeEvent}:{activeEvent?:{id:number;title:string}|null}){
  const [source,setSource]=useState<'phone'|'youtube'>('phone');
  const [phoneStatus,setPhoneStatus]=useState<'idle'|'preview'|'connecting'|'live'|'ended'>('idle');
  const phoneActive=phoneStatus==='live'||phoneStatus==='connecting';
  return <>
    <section className={styles.sourceSection} aria-labelledby="broadcast-source-title">
      <div className={styles.eyebrow}>OgasTV / Broadcast Studio</div>
      <h1 id="broadcast-source-title" className={styles.sourceHeading}>Choose how to go live</h1>
      <p className={styles.sourceIntro}>Broadcast from your phone, or feature an existing YouTube livestream on OgasTV.</p>
      {activeEvent&&<div className={styles.activeNotice} role="status">
        <span><strong>Already marked live:</strong> {activeEvent.title}</span>
        <span>End the current OgasTV event before publishing a different stream.</span>
        <a href={'/broadcast-studio/'+activeEvent.id}>View event</a>
        <a href="/studio/manage">Edit event status</a>
      </div>}
      <div className={styles.sourceGrid} role="group" aria-label="Broadcast source">
        <button type="button" className={[styles.sourceCard,source==='phone'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('phone')} aria-pressed={source==='phone'}>
          <RadioTower size={22} aria-hidden="true"/>
          <span className={styles.sourceCopy}><strong>Phone camera</strong><span>Broadcast directly with Cloudflare</span></span>
          {source==='phone'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
        <button type="button" className={[styles.sourceCard,source==='youtube'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('youtube')} aria-pressed={source==='youtube'}
          disabled={source==='phone'&&phoneActive}
          title={source==='phone'&&phoneActive?'End your phone broadcast before switching source':undefined}>
          <Youtube size={24} aria-hidden="true"/>
          <span className={styles.sourceCopy}><strong>YouTube Live</strong><span>Embed a stream already on YouTube</span></span>
          {source==='youtube'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
      </div>
    </section>
    {source==='phone'?<PhoneBroadcaster onStatusChange={setPhoneStatus}/>:<YouTubeBroadcaster/>}
  </>;
}
