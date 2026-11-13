'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { isYouTubeLiveVideoId } from '../lib/youtube-live';
import styles from './YouTubeArchivePlayer.module.css';

/** Branded preview until playback is requested. The official YouTube iframe
 * takes over during playback; its native branding and controls are not hidden. */
export function YouTubeArchivePlayer({videoId,title,thumbnail}:{videoId:string;title:string;thumbnail:string}){
  const [playing,setPlaying]=useState(false);
  const [imageFailed,setImageFailed]=useState(false);
  if(!isYouTubeLiveVideoId(videoId))return null;
  return <div className={styles.frame}>
    {playing?<>
      <iframe title={'Watch '+title} loading="lazy"
        src={'https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
        className={styles.iframe}/>
      <button type="button" className={styles.reset} onClick={()=>setPlaying(false)}
        aria-label={'Return to preview of '+title}><RotateCcw size={14}/> Preview</button>
    </>:<button type="button" className={styles.poster} onClick={()=>setPlaying(true)}
        aria-label={'Play '+title+' on OgasTV'}>
      {!imageFailed&&<>{/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnail} alt="" loading="lazy" decoding="async"
          onError={()=>setImageFailed(true)} className={styles.image}/></>}
      <span className={styles.scrim} aria-hidden="true"/>
      <span className={styles.play} aria-hidden="true"><Play fill="currentColor" size={24}/></span>
    </button>}
  </div>;
}
