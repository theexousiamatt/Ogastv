'use client';

import { useState } from 'react';
import { ArrowUpRight, CheckCircle2, RadioTower, Youtube } from 'lucide-react';
import { PhoneBroadcaster } from './PhoneBroadcaster';
import { YouTubeBroadcaster } from './YouTubeBroadcaster';
import styles from './YouTubeBroadcaster.module.css';

type ActiveEvent = {id:number;title:string;state:'live'|'interrupted'|'ended'|'scheduled'};
export function BroadcastSourceSelector({activeEvent}:{activeEvent?:ActiveEvent|null}){
  const [source,setSource]=useState<'phone'|'youtube'>('phone');
  const [phoneStatus,setPhoneStatus]=useState<'idle'|'preview'|'connecting'|'live'|'ended'>('idle');
  const phoneActive=phoneStatus==='live'||phoneStatus==='connecting';
  return <>
    <section className={styles.sourceSection} aria-labelledby="broadcast-source-title">
      <div className={styles.headerMeta}>
        <span className={styles.eyebrow}>OgasTV / Newsroom</span>
        <div className={styles.headerActions}>
          <a href="/studio/manage">Manage events</a>
          <a href="/live" target="_blank" rel="noopener noreferrer">
            View live <ArrowUpRight size={14} aria-hidden="true"/>
          </a>
        </div>
      </div>
      <h1 id="broadcast-source-title" className={styles.sourceHeading}>Broadcast studio</h1>
      <p className={styles.sourceIntro}>Choose a source, prepare your broadcast and publish it to OgasTV.</p>
      {activeEvent&&<div className={styles.activeNotice} role="status">
        <div className={styles.activeNoticeContent}>
          <span className={styles.activeNoticeLabel}>
            <span className={activeEvent.state==='interrupted'?styles.activeNoticeWarningDot:styles.activeNoticeDot} aria-hidden="true"/>
            {activeEvent.state==='interrupted'?'Session needs review':'Event marked live'}
          </span>
          <strong>{activeEvent.title}</strong>
          <span className={styles.activeNoticeDescription}>
            {activeEvent.state==='interrupted'
              ? 'This session may be disconnected. Review its status before starting another broadcast.'
              : 'End this event before publishing a different stream.'}
          </span>
        </div>
        <a className={styles.activeNoticeAction} href={'/broadcast-studio/'+activeEvent.id}>
          Open event <ArrowUpRight size={15} aria-hidden="true"/>
        </a>
      </div>}
      <div className={styles.sourceLabelRow}>
        <span className={styles.sourceLabel}>01 <span aria-hidden="true">/</span> Broadcast source</span>
        <span className={styles.sourceLabelHint}>Select a method</span>
      </div>
      <div className={styles.sourceGrid} role="group" aria-label="Broadcast source">
        <button type="button" className={[styles.sourceCard,source==='phone'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('phone')} aria-pressed={source==='phone'}>
          <span className={styles.sourceIcon}><RadioTower size={19} aria-hidden="true"/></span>
          <span className={styles.sourceCopy}><strong>Phone camera</strong><span>Broadcast directly to OgasTV</span></span>
          {source==='phone'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
        <button type="button" className={[styles.sourceCard,source==='youtube'?styles.sourceCardActive:''].join(' ')}
          onClick={()=>setSource('youtube')} aria-pressed={source==='youtube'}
          disabled={source==='phone'&&phoneActive}
          title={source==='phone'&&phoneActive?'End your phone broadcast before switching source':undefined}>
          <span className={styles.sourceIcon}><Youtube size={21} aria-hidden="true"/></span>
          <span className={styles.sourceCopy}><strong>YouTube Live</strong><span>Feature an existing YouTube stream</span></span>
          {source==='youtube'&&<CheckCircle2 className={styles.sourceCheck} size={19} aria-hidden="true"/>}
        </button>
      </div>
    </section>
    {source==='phone'?<PhoneBroadcaster embedded onStatusChange={setPhoneStatus}/>:<YouTubeBroadcaster/>}
  </>;
}
