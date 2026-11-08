'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { Bookmark, ArrowUpRight, Trash2 } from 'lucide-react';
import type { SavedStory } from '@/lib/reading-list';
import { readSavedStories,writeSavedStories } from '@/lib/reading-list';

export default function SavedStories(){
  const [stories,setStories]=useState<SavedStory[]>([]);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const refresh=()=>{setStories(readSavedStories());setReady(true);};
    refresh();window.addEventListener('storage',refresh);
    window.addEventListener('ogastv-reading-list-change',refresh);
    return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('ogastv-reading-list-change',refresh);};
  },[]);
  const remove=(slug:string)=>{const next=stories.filter(s=>s.slug!==slug);if(writeSavedStories(next))setStories(next);};
  return <div className="ogas-saved-list">
    <span className="ogas-reading__eyebrow">YOUR OGASTV AFRICA READING</span>
    <h1>Saved stories<span>.</span></h1>
    <p>Keep articles for later. Your list is stored in this browser on this device—not in an online account.</p>
    {!ready?<div role="status">Loading your stories…</div>:stories.length===0?
      <div className="ogas-saved-list__empty"><Bookmark size={27}/>
        <h2>Nothing saved yet.</h2><p>Find an article that interests you and choose “Save this story.”</p>
        <Link href="/latest">Browse latest stories <ArrowUpRight size={16}/></Link>
      </div>:
      <div className="ogas-saved-list__items">
        <div className="ogas-saved-list__count">{stories.length} saved {stories.length===1?'article':'articles'}</div>
        {stories.map(item=><div className="ogas-saved-list__item" key={item.slug}>
          <div><span>{item.category||'OGASTV AFRICA'}</span>
            <h2><Link href={'/stories/'+encodeURIComponent(item.slug)}>{item.title}</Link></h2>
            {item.date&&<small>{new Date(item.date).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</small>}
          </div>
          <button type="button" onClick={()=>remove(item.slug)} aria-label={'Remove '+item.title+' from saved stories'}><Trash2 size={17}/></button>
        </div>)}
        <button type="button" className="ogas-saved-list__clear" onClick={()=>{if(window.confirm('Clear all saved stories from this device?')){if(writeSavedStories([]))setStories([]);}}}>
          Clear reading list
        </button>
      </div>}
  </div>;
}
