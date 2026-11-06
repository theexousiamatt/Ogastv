'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

export function ArticleShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: window.location.href });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }
    await copy();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // A manual selection still works when clipboard permissions are denied.
      window.prompt('Copy the story link:', window.location.href);
    }
  }
  return <div aria-label="Share this story" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',margin:'20px 0 28px'}}>
    <button type="button" onClick={()=>void share()} style={{border:'1px solid #ddd',borderRadius:999,padding:'10px 15px',background:'transparent',display:'inline-flex',gap:8,alignItems:'center',cursor:'pointer',fontWeight:650}}><Share2 size={16} aria-hidden="true"/> Share story</button>
    <button type="button" onClick={()=>void copy()} style={{border:'1px solid #ddd',borderRadius:999,padding:'10px 15px',background:'transparent',display:'inline-flex',gap:8,alignItems:'center',cursor:'pointer',fontWeight:650}}>{copied?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}{copied?'Link copied':'Copy link'}</button>
    {copied&&<span role="status" style={{fontSize:12,color:'#536055'}}>Link copied to clipboard</span>}
  </div>;
}
