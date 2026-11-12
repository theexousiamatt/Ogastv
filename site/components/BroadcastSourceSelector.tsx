'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CheckCircle2, RadioTower, RefreshCw, Youtube } from 'lucide-react';
import { PhoneBroadcaster } from './PhoneBroadcaster';
import { YouTubeBroadcaster } from './YouTubeBroadcaster';
import styles from './YouTubeBroadcaster.module.css';

type ActiveEvent = {
  id:number;
  title:string;
  state:'live'|'interrupted'|'ended'|'scheduled';
  sourceType:'youtube'|'cloudflare';
  videoId:string|null;
};

export function BroadcastSourceSelector({activeEvent}:{activeEvent?:ActiveEvent|null}){
  const router=useRouter();
  const [source,setSource]=useState<'phone'|'youtube'>(
    activeEvent?.sourceType==='youtube'?'youtube':'phone'
  );
  const [phoneStatus,setPhoneStatus]=useState<'idle'|'preview'|'connecting'|'live'|'ended'>('idle');
  const phoneActive=phoneStatus==='live'||phoneStatus==='connecting';
  const isBlocked=Boolean(activeEvent);
  const activeYouTube=activeEvent?.sourceType==='youtube';

  return <>
    <section className={styles.sourceSection} aria-labelledby="broadcast-source-title">
      <div className={styles.headerMeta}>
        <span className={styles.eyebrow}>OgasTV / Newsroom</span>
        <div className={styles.headerActions}>
          <a href="/studio/manage">All events</a>
          <a href="/live" target="_blank" rel="noopener noreferrer">
            Public live page <ArrowUpRight size={14} aria-hidden="true"/>
          </a>
        </div>
      </div>
      <h1 id="broadcast-source-title" className={styles.sourceHeading}>
        {activeEvent?'Broadcast studio':'Start a broadcast'}
      </h1>
      <p className={styles.sourceIntro}>
        {activeEvent?'Manage the current event before starting another.':
          'Choose a source, add your details, then go live when you’re ready.'}
      </p>
      {activeEvent&&<div className={[styles.activeNotice,
        activeEvent.state!=='live'?styles.activeNoticeInterrupted:''].filter(Boolean).join(' ')} role="status">
        <div className={styles.activeNoticeContent}>
          <span className={styles.activeNoticeLabel}>
            <span className={activeEvent.state!=='live'?styles.activeNoticeWarningDot:styles.activeNoticeDot} aria-hidden="true"/>
            {activeEvent.state!=='live'?'Connection needs review':'Event marked LIVE'}
          </span>
          <strong>{activeEvent.title}</strong>
          <span className={styles.activeNoticeDescription}>
            {activeEvent.state!=='live'
              ? 'This event may have disconnected. Review or end it before starting a new one.'
              : 'An event is already marked live. Please end it before publishing another.'}
          </span>
        </div>
        <div className={styles.activeNoticeActions}>
          {activeYouTube?
            <button type="button" className={styles.activeNoticeAction}
              onClick={()=>setSource('youtube')}>
              Manage YouTube event <ArrowUpRight size={15} aria-hidden="true"/>
            </button>:
            <a className={styles.activeNoticeAction} href="/studio/manage">
              Review event status <ArrowUpRight size={15} aria-hidden="true"/>
            </a>}
          <button type="button" className={styles.refreshStatus}
            onClick={()=>router.refresh()} title="Check the current event status again">
            <RefreshCw size={14} aria-hidden="true"/> Refresh status
          </button>
        </div>
      </div>}
      <div className={styles.sourceLabelRow}>
        <span className={styles.sourceLabel}>01 <span aria-hidden="true">/</span> Broadcast source</span>
        <span className={styles.sourceLabelHint}>Select a method</span>
      </div>
      <div className={styles.sourceGrid} role="group" aria-label="Broadcast source">
        <button type="button" className={[styles.sourceCard,source==='phone'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('phone')} aria-pressed={source==='phone'}>
          <span className={styles.sourceIcon}><RadioTower size={19} aria-hidden="true"/></span>
          <span className={styles.sourceCopy}><strong>Phone camera</strong>
            <span>Stream directly from this device</span></span>
          {source==='phone'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
        <button type="button" className={[styles.sourceCard,source==='youtube'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('youtube')} aria-pressed={source==='youtube'}
          disabled={source==='phone'&&phoneActive}
          title={source==='phone'&&phoneActive?'End your phone broadcast before switching source':undefined}>
          <span className={styles.sourceIcon}><Youtube size={21} aria-hidden="true"/></span>
          <span className={styles.sourceCopy}><strong>YouTube Live</strong>
            <span>Show a livestream from YouTube</span></span>
          {source==='youtube'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
      </div>
    </section>
    {source==='phone'?
      <PhoneBroadcaster embedded onStatusChange={setPhoneStatus}
        blockedByActiveEvent={isBlocked}/>:
      <YouTubeBroadcaster
        eventId={activeYouTube?activeEvent?.id:undefined}
        title={activeYouTube?activeEvent?.title:''}
        videoId={activeYouTube?activeEvent?.videoId:null}
        status={activeYouTube?'live':'scheduled'}
        blockedByActiveEvent={isBlocked&&!activeYouTube}/>}
  </>;
}
