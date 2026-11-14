'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clapperboard, Grid2X2, Layers3, List, Radio, Search, X } from 'lucide-react';
import { YouTubeArchivePlayer } from './YouTubeArchivePlayer';
import styles from './StudioLibrary.module.css';

export type LibraryVideo={
  id:string;title:string;description:string;youtubeVideoId:string;
  releasedAt?:string;programmeTitle?:string;thumbnail:string;
};
type Order='newest'|'oldest';
type View='grid'|'list';
function readableDate(value?:string){
  if(!value||!Number.isFinite(Date.parse(value)))return 'Date unavailable';
  return new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'}).format(new Date(value));
}
function isReplay(v:LibraryVideo){return v.id.startsWith('live-')}
function category(v:LibraryVideo){return isReplay(v)?'Live coverage':(v.programmeTitle||'Programmes').trim()}
function categoryKey(value:string){return value.toLocaleLowerCase('en-NG').trim()}
export function StudioLibrary({videos}:{videos:LibraryVideo[]}){
  const [query,setQuery]=useState('');
  const deferredQuery=useDeferredValue(query);
  const [filter,setFilter]=useState('all');
  const [order,setOrder]=useState<Order>('newest');
  const [view,setView]=useState<View>('grid');
  const [visibleCount,setVisibleCount]=useState(12);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();input.current?.focus();
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  const categories=useMemo(()=>{
    const counts=new Map<string,{name:string;count:number}>();
    videos.forEach(video=>{
      const name=category(video),key=categoryKey(name);
      const prev=counts.get(key);
      counts.set(key,{name:prev?.name||name,count:(prev?.count||0)+1});
    });
    return [...counts.entries()].sort((a,b)=>b[1].count-a[1].count).map(([key,value])=>({key,...value}));
  },[videos]);
  const liveCount=videos.filter(isReplay).length;
  const programmesCount=new Set(videos.filter(v=>!isReplay(v)).map(v=>categoryKey(category(v)))).size;
  const filtered=useMemo(()=>{
    const q=deferredQuery.toLocaleLowerCase('en-NG').trim();
    return videos.filter(v=>{
      const key=categoryKey(category(v));
      if(filter!=='all'&&filter!==key)return false;
      return !q||[v.title,v.description,v.programmeTitle||'',category(v)].some(s=>s.toLocaleLowerCase('en-NG').includes(q));
    }).sort((a,b)=>{
      const aTime=Date.parse(a.releasedAt||'')||0,bTime=Date.parse(b.releasedAt||'')||0;
      return order==='newest'?bTime-aTime:aTime-bTime;
    });
  },[videos,deferredQuery,filter,order]);
  const shown=filtered.slice(0,visibleCount);
  function changeFilter(next:string){setFilter(next);setVisibleCount(12)}
  return <>
    <section className={styles.hero} aria-labelledby="ogas-video-library-title">
      <div className={styles.heroContent}>
        <div className={styles.eyebrow}><Clapperboard size={16} aria-hidden="true"/> VIDEO LIBRARY</div>
        <h1 id="ogas-video-library-title">OgasTV Studio<span>.</span></h1>
        <p>Conversations, community stories and reporting you can see and hear.</p>
        <label className={styles.heroSearch}>
          <Search size={20} aria-hidden="true"/>
          <span className={styles.sr}>Search programmes, events and topics</span>
          <input ref={input} type="search" value={query} placeholder="Search programmes, events, topics..."
            onChange={e=>{setQuery(e.target.value);setVisibleCount(12)}}/>
          {query&&<button type="button" onClick={()=>{setQuery('');input.current?.focus()}} aria-label="Clear search"><X size={18}/></button>}
          <kbd className={styles.shortcut}>⌘ K</kbd>
        </label>
      </div>
      <div className={styles.metrics} aria-label="Library statistics">
        <div><Clapperboard size={19} aria-hidden="true"/><strong>{videos.length}</strong><span>Videos</span></div>
        <div><Radio size={19} aria-hidden="true"/><strong>{liveCount}</strong><span>Past live</span></div>
        <div><Layers3 size={19} aria-hidden="true"/><strong>{programmesCount}</strong><span>Programmes</span></div>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="studio-library-title">
      <div className={styles.tools}>
        <div className={styles.tabs} role="group" aria-label="Filter videos by category">
          <button type="button" aria-pressed={filter==='all'} className={filter==='all'?styles.active:''} onClick={()=>changeFilter('all')}>All videos</button>
          {categories.map(item=><button key={item.key} type="button" aria-pressed={filter===item.key}
              className={filter===item.key?styles.active:''} onClick={()=>changeFilter(item.key)}>
              {item.name}</button>)}
        </div>
        <div className={styles.controls}>
          <label className={styles.sort}><span className={styles.sr}>Sort videos</span>
            <select value={order} onChange={e=>setOrder(e.target.value as Order)}>
              <option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option>
            </select>
          </label>
          <div className={styles.viewToggle} role="group" aria-label="Display videos">
            <button type="button" aria-label="Grid view" aria-pressed={view==='grid'} className={view==='grid'?styles.active:''} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button>
            <button type="button" aria-label="List view" aria-pressed={view==='list'} className={view==='list'?styles.active:''} onClick={()=>setView('list')}><List size={18}/></button>
          </div>
        </div>
      </div>
      <div className={styles.heading}>
        <div><span className={styles.eyebrowLight}>THE VIDEO ARCHIVE</span>
          <h2 id="studio-library-title">{query.trim()?'Search results':filter==='all'?'Latest programmes':categories.find(c=>c.key===filter)?.name||'Latest programmes'}</h2>
        </div>
        <span className={styles.total} role="status">{filtered.length} {filtered.length===1?'video':'videos'} {query?'found':'in this selection'}</span>
      </div>
      {shown.length?<div className={view==='list'?styles.list:styles.grid}>
        {shown.map(video=><article className={styles.card} key={video.id}>
          <YouTubeArchivePlayer title={video.title} videoId={video.youtubeVideoId} thumbnail={video.thumbnail}/>
          <div className={styles.copy}>
            <h3>{video.title}</h3>
            <div className={styles.meta}><span>{category(video)}</span>
              <span aria-hidden="true">·</span>
              <span className={styles.date}><CalendarDays size={13} aria-hidden="true"/>{readableDate(video.releasedAt)}</span></div>
            {view==='list'&&video.description&&<p className={styles.description}>{video.description}</p>}
          </div>
        </article>)}
      </div>:<div className={styles.empty}>
        <Clapperboard size={28}/><h3>{videos.length?'No matching videos':'The archive is growing'}</h3>
        <p>{videos.length?'Try another search or category.':'Completed livestreams and published programmes will appear here.'}</p>
        {(query||filter!=='all')&&<button onClick={()=>{setQuery('');changeFilter('all')}}>Clear filters</button>}
      </div>}
      {visibleCount<filtered.length&&<div className={styles.more}><button onClick={()=>setVisibleCount(c=>c+12)}>Load more videos <span>({filtered.length-visibleCount} remaining)</span></button></div>}
    </section>
  </>;
}
