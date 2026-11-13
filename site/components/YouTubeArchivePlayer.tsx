'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { isYouTubeLiveVideoId } from '../lib/youtube-live';

/** Click-to-load embeds prevent dozens of YouTube players from downloading
 * until a visitor explicitly chooses a recording to watch. */
export function YouTubeArchivePlayer({videoId,title,thumbnail}:{
  videoId:string; title:string; thumbnail:string;
}){
  const [playing,setPlaying]=useState(false);
  if(!isYouTubeLiveVideoId(videoId))return null;
  return <div className="ogas-watch__image" style={{position:'relative',aspectRatio:'16 / 9',overflow:'hidden'}}>
    {playing?
      <iframe
        title={'Watch '+title}
        loading="lazy"
        src={'https://www.youtube-nocookie.com/embed/'+videoId+'?autoplay=1&rel=0'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}}
      />:
      <button type="button" onClick={()=>setPlaying(true)}
        aria-label={'Play '+title+' on OgasTV'}
        style={{display:'block',position:'relative',width:'100%',height:'100%',border:0,cursor:'pointer',padding:0,background:'#131916',color:'white'}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" alt="" src={thumbnail}
          style={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>
        <span aria-hidden="true" style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.12)'}}>
          <span style={{display:'grid',placeItems:'center',background:'#ba2026',borderRadius:'50%',width:58,height:58,color:'#fff',boxShadow:'0 4px 24px rgba(0,0,0,.3)'}}>
            <Play size={22} fill="currentColor"/>
          </span>
        </span>
      </button>}
  </div>;
}
