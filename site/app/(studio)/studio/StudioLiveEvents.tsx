'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, ImagePlus, Radio, Search, Trash2, X } from 'lucide-react';
import { prepareEditorialImage, uploadEditorialImage } from './media-upload';
import styles from './StudioLiveEvents.module.css';

type Media = {id:number|string;url?:string;thumbnailURL?:string;alt?:string};
type Event = {id:number|string;title:string;description?:string;sourceType?:string;broadcastStatus?:string;
  actualStart?:string;actualEnd?:string;scheduledStart?:string;artwork?:Media|number|null;
  youtubeVideoId?:string;_status?:string};
type Filter='all'|'ended'|'live'|'scheduled';
const completed=(event:Event)=>['ended','replay_available'].includes(event.broadcastStatus||'');
const eventDate=(value?:string)=>value?new Intl.DateTimeFormat('en-NG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Lagos'}).format(new Date(value)):'Not recorded';
async function api(path:string,options?:RequestInit){
  const response=await fetch(path,{cache:'no-store',credentials:'include',...options});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.errors?.[0]?.message||result?.message||'Request could not be completed.');
  return result;
}
export function StudioLiveEvents({role}:{role:string}){
  const editable=['administrator','editor_in_chief','editor'].includes(role);
  const deletable=['administrator','editor_in_chief'].includes(role);
  const [events,setEvents]=useState<Event[]>([]);
  const [media,setMedia]=useState<Media[]>([]);
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<Event|null>(null);
  const [form,setForm]=useState({title:'',description:'',artwork:''});
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [page,setPage]=useState(1);
  const [hasNext,setHasNext]=useState(false);
  const load=useCallback(async(p=1)=>{
    setLoading(true);
    try{
      // Reconcile YouTube's verified actual end time before showing LIVE badges.
      // An API outage must not block the newsroom list or falsely end an event.
      try{
        const checked=await api('/api/studio/live-events/reconcile',{
          method:'POST',headers:{'Content-Type':'application/json'}
        });
        if(checked.ended>0)setNotice(checked.ended+' completed YouTube broadcast'+(checked.ended===1?' was':'s were')+' moved to Completed.');
      }catch(e){console.warn('[OgasTV] YouTube live verification unavailable',e);}
      const result=await api('/api/live-events?draft=false&depth=1&sort=-updatedAt&limit=20&page='+p);
      setEvents(Array.isArray(result.docs)?result.docs:[]);
      setHasNext(Boolean(result.hasNextPage));
      setPage(p);
    }catch(e){setError(e instanceof Error?e.message:'Could not load events.')}
    finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load()},[load]);
  // Keep an open dashboard current without a manual refresh.
  useEffect(()=>{
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void load(page);},60_000);
    return ()=>clearInterval(timer);
  },[load,page]);
  useEffect(()=>{if(!selected)return;
    api('/api/media?limit=100&sort=-createdAt&depth=0').then(result=>
      setMedia(Array.isArray(result.docs)?result.docs:[])).catch(()=>setMedia([]));
  },[selected]);
  const shown=useMemo(()=>events.filter(event=>{
    if(filter==='ended'&&!completed(event))return false;
    if(filter==='live'&&!['live','interrupted'].includes(event.broadcastStatus||''))return false;
    if(filter==='scheduled'&&!['scheduled','cancelled'].includes(event.broadcastStatus||''))return false;
    const q=query.trim().toLowerCase();
    return !q||[event.title,event.description||'',event.sourceType||''].some(s=>s.toLowerCase().includes(q));
  }),[events,filter,query]);
  function edit(event:Event){
    setSelected(event);setError('');setNotice('');
    setForm({title:event.title||'',description:event.description||'',
      artwork:event.artwork&&typeof event.artwork==='object'?String(event.artwork.id):
        event.artwork?String(event.artwork):''});
  }
  async function save(){
    if(!selected||!editable||busy)return;
    if(form.title.trim().length<3){setError('Enter a title of at least three characters.');return}
    setBusy(true);setError('');setNotice('');
    try{
      await api('/api/live-events/'+encodeURIComponent(String(selected.id)),{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title:form.title.trim(),description:form.description.trim(),
          artwork:form.artwork?Number(form.artwork):null})
      });
      setSelected(null);setNotice('Event details saved. Published artwork and titles may appear in the public archive.');
      await load(page);
    }catch(e){setError(e instanceof Error?e.message:'Could not save event.')}
    finally{setBusy(false)}
  }
  async function endOgasTVEvent(event:Event){
    if(busy||event.sourceType!=='youtube'||event.broadcastStatus!=='live')return;
    if(!window.confirm('End “'+event.title+'” on OgasTV? This removes the LIVE indicator and moves the recording to the archive. This does not end the broadcast on YouTube.'))return;
    setBusy(true);setError('');setNotice('');
    try{
      await api('/api/ogas-live/youtube',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'end',eventId:Number(event.id)})});
      setNotice('Broadcast ended on OgasTV and moved to Completed.');
      await load(page);
    }catch(e){setError(e instanceof Error?e.message:'Unable to end broadcast.')}
    finally{setBusy(false)}
  }
  async function remove(event:Event){
    if(!deletable||busy)return;
    if(['live','interrupted'].includes(event.broadcastStatus||'')){
      setError('End the active broadcast before attempting deletion.');return;
    }
    if(!window.confirm('Permanently delete “'+event.title+'” from OgasTV? This also removes its OgasTV archive listing. The original YouTube recording will not be deleted. This cannot be undone.'))return;
    setBusy(true);setError('');setNotice('');
    try{
      await api('/api/live-events/'+encodeURIComponent(String(event.id)),{method:'DELETE'});
      setSelected(null);setNotice('Event deleted from OgasTV. Any video on YouTube remains unchanged.');
      await load(page);
    }catch(e){setError(e instanceof Error?e.message:'Unable to delete event.')}
    finally{setBusy(false)}
  }
  async function upload(file:File){
    if(!editable||!file)return;
    if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>12*1024*1024){
      setError('Choose a JPG, PNG, WebP or AVIF image under 12 MB.');return;
    }
    setUploading(true);setProgress(0);setError('');
    try{
      const prepared=await prepareEditorialImage(file);
      const image=await uploadEditorialImage(prepared,(selected?.title||'OgasTV live event')+' cover',setProgress);
      setForm(v=>({...v,artwork:String(image.id)}));
      setMedia(v=>[{id:image.id,url:URL.createObjectURL(file),alt:file.name},...v]);
      setNotice('Cover uploaded. Select Save changes to attach it to this event.');
    }catch(e){setError(e instanceof Error?e.message:'Cover upload failed.')}
    finally{setUploading(false)}
  }
  const artwork=selected&&media.find(m=>String(m.id)===form.artwork);
  const artworkUrl=artwork?.thumbnailURL||artwork?.url||
    (selected?.artwork&&typeof selected.artwork==='object'?selected.artwork.thumbnailURL||selected.artwork.url:'');
  return <section className={styles.page}>
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>BROADCAST LIBRARY</span><h1>Live events</h1>
        <p>Manage upcoming broadcasts, past coverage, descriptions and cover artwork.</p></div>
      <a href="/broadcast-studio" className={styles.primary}><Radio size={17}/> Go live</a>
    </div>
    {error&&<div className={styles.alert} role="alert">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {notice&&<div className={styles.notice} role="status">{notice}</div>}
    {selected?<div className={styles.edit}>
      <button className={styles.back} onClick={()=>setSelected(null)}>← Back to live events</button>
      <h2>Edit event</h2>
      <p>Update how this broadcast appears in OgasTV's public video archive. Stream connection details are managed separately.</p>
      <label>Event heading<input value={form.title} maxLength={160} disabled={!editable||busy}
          onChange={e=>setForm(v=>({...v,title:e.target.value}))}/></label>
      <label>Description<textarea rows={4} value={form.description} disabled={!editable||busy}
          onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label>
      <div className={styles.coverArea}>
        <strong>Cover artwork</strong><p>Use a landscape 16:9 image for the event thumbnail.</p>
        {artworkUrl&&<img src={artworkUrl} alt="Current live event cover preview" className={styles.cover}/>}
        <div className={styles.mediaGrid}>
          {media.map(item=><button type="button" key={item.id} disabled={!editable||busy}
            className={form.artwork===String(item.id)?styles.chosen:''} onClick={()=>setForm(v=>({...v,artwork:String(item.id)}))}>
            {item.thumbnailURL||item.url?<img src={item.thumbnailURL||item.url} alt={item.alt||'Available image'}/>:<ImagePlus size={22}/>}
          </button>)}
        </div>
        {editable&&<label className={styles.upload}><ImagePlus size={17}/> {uploading?'Uploading '+progress+'%':'Upload new cover'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading||busy}
            onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/></label>}
        {form.artwork&&editable&&<button className={styles.clear} onClick={()=>setForm(v=>({...v,artwork:''}))}>Remove event cover</button>}
      </div>
      <div className={styles.actions}>
        <button onClick={()=>setSelected(null)} disabled={busy}>Cancel</button>
        {editable&&<button className={styles.primary} onClick={()=>void save()} disabled={busy||uploading}>
          {busy?'Saving…':'Save changes'}</button>}
      </div>
      {deletable&&<div className={styles.danger}><strong>Delete this event</strong>
        <p>Removes the event from OgasTV, not from YouTube.</p>
        <button disabled={busy||['live','interrupted'].includes(selected.broadcastStatus||'')}
          onClick={()=>void remove(selected)}><Trash2 size={16}/> Delete event</button></div>}
    </div>:<>
      <div className={styles.filters}>
        <div className={styles.tabs}>{(['all','ended','live','scheduled'] as const).map(x=>
          <button type="button" key={x} className={filter===x?styles.active:''} aria-pressed={filter===x}
            onClick={()=>setFilter(x)}>{x==='all'?'All events':x==='ended'?'Completed':x==='live'?'Live / interrupted':'Scheduled'}</button>)}</div>
        <label className={styles.search}><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search events" aria-label="Search live events"/></label>
      </div>
      {loading?<p>Loading live events…</p>:shown.length?<div className={styles.list}>
        {shown.map(event=><article key={event.id} className={styles.row}>
          <div className={styles.thumb}>{event.artwork&&typeof event.artwork==='object'&&(event.artwork.thumbnailURL||event.artwork.url)?
            <img src={event.artwork.thumbnailURL||event.artwork.url} alt=""/>:
            event.youtubeVideoId?<img src={'https://i.ytimg.com/vi/'+event.youtubeVideoId+'/hqdefault.jpg'} alt=""/>:<Radio size={28}/>}</div>
          <div className={styles.details}><span className={styles.status}>{event.broadcastStatus||'Scheduled'} · {event.sourceType==='youtube'?'YouTube':'Phone broadcast'}</span>
            <h2>{event.title}</h2><span className={styles.date}><CalendarDays size={14}/>{eventDate(event.actualEnd||event.actualStart||event.scheduledStart)}</span></div>
          <div className={styles.rowActions}><button onClick={()=>edit(event)}>View / edit</button>
            {editable&&event.sourceType==='youtube'&&event.broadcastStatus==='live'&&
              <button type="button" disabled={busy} title="Remove LIVE from OgasTV (does not stop YouTube)"
                onClick={()=>void endOgasTVEvent(event)}>End on OgasTV</button>}
            {completed(event)&&event.sourceType==='youtube'&&event.youtubeVideoId&&
              <a href={'https://www.youtube.com/watch?v='+event.youtubeVideoId} target="_blank" rel="noopener noreferrer" aria-label="Open recording on YouTube"><ExternalLink size={18}/></a>}
            {deletable&&<button title="Delete event" aria-label={'Delete '+event.title} disabled={busy||['live','interrupted'].includes(event.broadcastStatus||'')}
              onClick={()=>void remove(event)}><Trash2 size={17}/></button>}</div>
        </article>)}
      </div>:<div className={styles.empty}><Radio size={26}/><h2>No events found</h2><p>Try another search or filter.</p></div>}
      <div className={styles.pager}><button disabled={loading||page<=1} onClick={()=>void load(page-1)}>Previous</button><span>Page {page}</span><button disabled={loading||!hasNext} onClick={()=>void load(page+1)}>Next</button></div>
    </>}
  </section>;
}
