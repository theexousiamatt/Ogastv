'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { SavedStory } from '@/lib/reading-list';
import { readSavedStories,writeSavedStories } from '@/lib/reading-list';

export function SaveStory({story}:{story:SavedStory}){
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    const refresh=()=>setSaved(readSavedStories().some(item=>item.slug===story.slug));
    refresh();
    window.addEventListener('storage',refresh);
    window.addEventListener('ogastv-reading-list-change',refresh);
    return()=>{window.removeEventListener('storage',refresh);window.removeEventListener('ogastv-reading-list-change',refresh);};
  },[story.slug]);
  const toggle=()=>{
    const list=readSavedStories();
    const already=list.some(item=>item.slug===story.slug);
    const next=already?list.filter(item=>item.slug!==story.slug):[story,...list].slice(0,100);
    if(writeSavedStories(next)){setSaved(!already);setMessage(already?'Removed from reading list.':'Saved on this device.');}
    else setMessage('Saving is unavailable in this browser.');
  };
  return <div className="ogas-reading__save">
    <button type="button" onClick={toggle} aria-pressed={saved} className={saved?'ogas-reading__save-button is-saved':'ogas-reading__save-button'}>
      {saved?<BookmarkCheck size={17}/>:<Bookmark size={17}/>}
      {saved?'Saved':'Save this story'}
    </button>
    <Link href="/reading-list">My reading list</Link>
    {message&&<span role="status" className="ogas-reading__save-message">{message}</span>}
  </div>;
}
