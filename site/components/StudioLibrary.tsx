'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, CalendarDays, ArrowUpRight, Clapperboard, X } from 'lucide-react';
import { YouTubeArchivePlayer } from './YouTubeArchivePlayer';
import styles from './StudioLibrary.module.css';

export type LibraryVideo={
  id:string;title:string;description:string;youtubeVideoId:string;
  releasedAt?:string;programmeTitle?:string;thumbnail:string;
};
type Filter='all'|'live'|'programmes';
type Order='newest'|'oldest';
function readableDate(value?:string){
  if(!value||!Number.isFinite(Date.parse(value)))return 'Date unavailable';
  return new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'}).format(new Date(value));
}
function isReplay(video:LibraryVideo){return video.id.startsWith('live-')}
export function StudioLibrary({videos}:{videos:LibraryVideo[]}){
  const [query,setQuery]=useState('');
  const deferredQuery=useDeferredValue(query);
  const [filter,setFilter]=useState<Filter>('all');
  const [order,setOrder]=useState<Order>('newest');
  const [visibleCount,setVisibleCount]=useState(12);
  const counts={all:videos.length,live:videos.filter(isReplay).length,programmes:videos.filter(v=>!isReplay(v)).length};
  const filtered=useMemo(()=>{
    const q=deferredQuery.toLocaleLowerCase().trim();
    return videos.filter(v=>{
      if(filter==='live'&&!isReplay(v))return false;
      if(filter==='programmes'&&isReplay(v))return false;
      return !q||[v.title,v.description,v.programmeTitle||''].some(s=>s.toLocaleLowerCase().includes(q));
    }).sort((a,b)=>{
      const aTime=Date.parse(a.releasedAt||'')||0,bTime=Date.parse(b.releasedAt||'')||0;
      return order==='newest'?bTime-aTime:aTime-bTime;
    });
  },[videos,deferredQuery,filter,order]);
  const shown=filtered.slice(0,visibleCount);
  function changeFilter(next:Filter){setFilter(next);setVisibleCount(12)}
  return <section className={styles.section} aria-labelledby="studio-library-title">
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>THE VIDEO ARCHIVE</span>
        <h2 id="studio-library-title">Stories worth watching<span>.</span></h2>
        <p>Watch reports, conversations and past live coverage from OgasTV Nigeria.</p>
      </div>
      <span className={styles.total}>{videos.length} {videos.length===1?'video':'videos'} in the archive</span>
    </div>
    <div className={styles.tools}>
      <div className={styles.tabs} role="group" aria-label="Filter videos by type">
        {([['all','All videos'],['live','Past live'],['programmes','Programmes']] as const).map(([value,label])=>
          <button key={value} className={filter===value?styles.active:''}
            aria-pressed={filter===value} onClick={()=>changeFilter(value)}>
            {label}<span>{counts[value]}</span>
          </button>)}
      </div>
      <div className={styles.controls}>
        <label className={styles.search}><Search size={17} aria-hidden="true"/>
          <span className={styles.sr}>Search videos</span>
          <input type="search" value={query} placeholder="Search videos or topics"
            onChange={e=>{setQuery(e.target.value);setVisibleCount(12)}}/>
          {query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search"><X size={15}/></button>}
        </label>
        <label className={styles.sort}><SlidersHorizontal size={15}/>
          <span className={styles.sr}>Sort videos</span>
          <select value={order} onChange={e=>setOrder(e.target.value as Order)}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
    </div>
    <p className={styles.results} role="status">{filtered.length} {filtered.length===1?'result':'results'}{query?' for “'+query+'”':''}</p>
    {shown.length?<div className={styles.grid}>
      {shown.map(video=><article className={styles.card} key={video.id}>
        <YouTubeArchivePlayer title={video.title} videoId={video.youtubeVideoId} thumbnail={video.thumbnail}/>
        <div className={styles.copy}>
          <div className={styles.meta}><span>{isReplay(video)?'PAST LIVE COVERAGE':video.programmeTitle||'OGASTV PROGRAMME'}</span>
            <span className={styles.date}><CalendarDays size={13}/>{readableDate(video.releasedAt)}</span></div>
          <h3>{video.title}</h3>
          {video.description&&<p className={styles.description}>{video.description}</p>}
          <a href={'https://www.youtube.com/watch?v='+video.youtubeVideoId} target="_blank" rel="noopener noreferrer" className={styles.source}>
            View original on YouTube <ArrowUpRight size={14}/></a>
        </div>
      </article>)}
    </div>:<div className={styles.empty}>
      <Clapperboard size={28}/><h3>{videos.length?'No matching videos':'The archive is growing'}</h3>
      <p>{videos.length?'Try another search or category.':'Completed livestreams and published programmes will appear here.'}</p>
      {(query||filter!=='all')&&<button onClick={()=>{setQuery('');changeFilter('all')}}>Clear filters</button>}
    </div>}
    {visibleCount<filtered.length&&<div className={styles.more}><button onClick={()=>setVisibleCount(c=>c+12)}>Load more videos <span>({filtered.length-visibleCount} remaining)</span></button></div>}
  </section>;
}
