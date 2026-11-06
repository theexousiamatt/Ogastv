'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, ExternalLink, FilePenLine, FileText,
  FolderOpen, Home, Image as ImageIcon, ImagePlus, LayoutGrid, Link2,
  LogOut, Menu, MoreHorizontal, Newspaper, PencilLine, Plus, Radio,
  Search, Settings2, ShieldCheck, Sparkles, Trash2, UploadCloud, X,
} from 'lucide-react';

type Tab = 'home' | 'articles' | 'write' | 'media' | 'live' | 'ads';
type Media = { id: string | number; url?: string; thumbnailURL?: string; alt?: string; filename?: string; mimeType?: string };
type Category = { id: string | number; name: string };
type Article = {
  id: string | number; title?: string; summary?: string; slug?: string;
  body?: unknown; publicByline?: string; updatedAt?: string;
  workflowStatus?: string; _status?: string; legacyFeaturedImageUrl?: string;
  primaryCategory?: Category | string | number | null;
  featuredImage?: Media | string | number | null;
  author?: string | number | null;
};
type Ad = {
  id: string | number; name?: string; destinationUrl?: string; status?: string;
  startsAt?: string; endsAt?: string; placement?: string; banner?: Media | number | string | null;
};
type Editor = {
  id: string; title: string; summary: string; bodyText: string;
  primaryCategory: string; featuredImage: string; slug: string;
  published: boolean; lockedBody: boolean; touchedBody: boolean;
};
const emptyEditor = (): Editor => ({
  id: '', title: '', summary: '', bodyText: '', primaryCategory: '',
  featuredImage: '', slug: '', published: false, lockedBody: false, touchedBody: false,
});
const pageSize = 30;
const icons = {home: Home, articles: Newspaper, write: Plus, media: ImageIcon, live: Radio, ads: LayoutGrid};
const topNav: {key: Tab; label: string}[] = [
  {key: 'home',label: 'Home'}, {key: 'articles',label: 'Articles'},
  {key: 'write',label: 'Write'}, {key: 'live',label: 'Go live'},
  {key: 'media',label: 'Media'}, {key: 'ads',label: 'Ads'},
];
function shortDate(input?: string): string {
  if (!input) return 'Just now';
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date);
}
function statusOf(a: Article): 'published'|'review'|'draft' {
  return a._status === 'published' ? 'published' : a.workflowStatus === 'in_review' ? 'review' : 'draft';
}
function statusName(a: Article): string {
  return a._status === 'published' ? 'Published' : a.workflowStatus === 'in_review' ? 'In review' : a.workflowStatus === 'changes_requested' ? 'Changes needed' : 'Draft';
}
function mediaUrl(m?: Media | string | number | null): string {
  if (!m || typeof m !== 'object') return '';
  return m.thumbnailURL || m.url || '';
}
function titleOf(a: Article) { return a.title?.trim() || 'Untitled article'; }
function lexicalText(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const x = input as {text?: unknown;children?: unknown[];root?: unknown;type?: string};
  if (typeof x.text === 'string') return x.text;
  if (x.root) return lexicalText(x.root);
  if (!Array.isArray(x.children)) return '';
  const sep = x.type === 'root' || x.type === 'paragraph' || x.type === 'heading' ? '\n' : '';
  const children = x.children.map(lexicalText).filter(Boolean);
  return (x.type === 'root' ? children.join('\n\n') : children.join(sep === '\n' ? '' : '')).trim();
}
function complexLexical(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const x = input as {root?: unknown;type?: string;children?: unknown[];format?: unknown;style?: unknown};
  if (x.root) return complexLexical(x.root);
  if (x.type && !['root','paragraph','text'].includes(x.type)) return true;
  if (x.type === 'text' && (Number(x.format || 0) !== 0 || Boolean(x.style))) return true;
  return Array.isArray(x.children) && x.children.some(complexLexical);
}
function toLexical(text: string) {
  return { root: { type:'root', version:1, format:'', indent:0, direction:'ltr',
    children: (text.replace(/\r/g, '').split(/\n{2,}/).map(v=>v.trim()).filter(Boolean)).map(para => ({
      type:'paragraph',version:1,format:'',indent:0,direction:'ltr',
      children: [{type:'text',version:1,detail:0,format:0,mode:'normal',style:'',text:para}]
    }))
  }};
}
async function jsonFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, {credentials:'include',cache:'no-store', ...options});
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(typeof body?.errors?.[0]?.message === 'string' ? body.errors[0].message : (typeof body?.message === 'string' ? body.message : 'Something went wrong. Please try again.'));
  return body;
}
function normalizeId(x: unknown) { return x === null || x === undefined ? '' : String(typeof x === 'object' && x !== null && 'id' in x ? (x as {id:string|number}).id : x); }
function iconSize(size=20) { return {size, strokeWidth:2, 'aria-hidden':true as const}; }

export function StudioApp({staffId,name,role}: {staffId:string;name:string;role:string}) {
  const [tab,setTab] = useState<Tab>('home');
  const [more,setMore] = useState(false);
  const [articles,setArticles] = useState<Article[]>([]);
  const [total,setTotal] = useState(0);
  const [page,setPage] = useState(1);
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('all');
  const [categories,setCategories] = useState<Category[]>([]);
  const [media,setMedia] = useState<Media[]>([]);
  const [ads,setAds] = useState<Ad[]>([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [editor,setEditor] = useState<Editor>(emptyEditor);
  const [picker,setPicker] = useState(false);
  const [fileDescription,setFileDescription] = useState('');
  const [uploadFile,setUploadFile] = useState<File|null>(null);
  const [preview,setPreview] = useState(false);
  const [adForm,setAdForm] = useState({name:'',destinationUrl:'',startsAt:'',endsAt:'',banner:''});
  const [adEditor,setAdEditor] = useState(false);
  const canWrite = ['administrator','editor_in_chief','editor','journalist'].includes(role);
  const canPublish = ['administrator','editor_in_chief'].includes(role);
  const canAds = ['administrator','advertising_manager','editor_in_chief'].includes(role);
  const canUpload = canWrite || canAds;
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const roleText = role === 'editor_in_chief' ? 'Editor-in-chief' : role.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());

  const navigate = useCallback((view:Tab, id?: string) => {
    setTab(view); setError(''); setMessage(''); setMore(false);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', view);
    if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
    window.history.pushState(null,'',url.pathname + url.search);
    window.scrollTo({top:0,behavior:'instant'});
  }, []);

  const loadArticles = useCallback(async (p=1,term='',state='all') => {
    const params = new URLSearchParams({depth:'1',sort:'-updatedAt',draft:'true',page:String(p),limit:String(pageSize)});
    if (term.trim()) params.set('where[title][like]',term.trim());
    if (state === 'published') params.set('where[_status][equals]','published');
    if (state === 'draft') params.set('where[_status][equals]','draft');
    if (state === 'review') params.set('where[workflowStatus][equals]','in_review');
    const response = await jsonFetch('/api/articles?' + params.toString());
    setArticles(Array.isArray(response.docs) ? response.docs : []);
    setTotal(Number(response.totalDocs || 0));
  }, []);

  const loadMedia = useCallback(async () => {
    const response = await jsonFetch('/api/media?limit=100&sort=-createdAt&depth=0');
    setMedia(Array.isArray(response.docs) ? response.docs : []);
  }, []);

  const loadAds = useCallback(async () => {
    if (!canAds) return;
    try {
      const response = await jsonFetch('/api/ad-banners?limit=30&sort=-createdAt&depth=1');
      setAds(Array.isArray(response.docs) ? response.docs : []);
    } catch { setAds([]); }
  }, [canAds]);

  useEffect(()=>{
    const url = new URL(window.location.href);
    const initial = url.searchParams.get('tab') as Tab;
    if (initial && topNav.some(x=>x.key===initial)) setTab(initial);
    const back=()=>{const u=new URL(window.location.href);const next=u.searchParams.get('tab') as Tab;setTab(topNav.some(x=>x.key===next)?next:'home');};
    window.addEventListener('popstate',back);
    Promise.all([
      jsonFetch('/api/categories?limit=100&sort=name').then(x=>setCategories(x.docs || [])),
      loadMedia(), loadAds(),
    ]).catch(e=>setError(e instanceof Error?e.message:'Could not load the newsroom.'));
    return ()=>window.removeEventListener('popstate',back);
  }, [loadMedia,loadAds]);

  useEffect(()=>{
    let ignore=false;
    const timer=window.setTimeout(()=>{
      setLoading(true);
      loadArticles(page,search,filter).catch(e=>{if(!ignore)setError(e instanceof Error?e.message:'Could not load articles.');})
        .finally(()=>{if(!ignore)setLoading(false);});
    }, search ? 320 : 0);
    return ()=>{ignore=true;window.clearTimeout(timer);};
  },[page,search,filter,loadArticles]);

  const filteredRecent = articles.slice(0,5);
  const cover = (a: Article) => mediaUrl(a.featuredImage) || (a.legacyFeaturedImageUrl || '');
  const categoryName = (category: Article['primaryCategory']) => {
    if (category && typeof category === 'object') return category.name;
    return categories.find(c=>String(c.id)===String(category))?.name || 'Uncategorised';
  };
  const changeSearch=(value:string)=>{setPage(1);setSearch(value);};
  const changeFilter=(value:string)=>{setPage(1);setFilter(value);};

  const begin = () => {setEditor(emptyEditor());setPicker(false);navigate('write');};
  const openArticle = async (id: string | number) => {
    setBusy(true);setError('');
    try {
      const article=await jsonFetch('/api/articles/'+encodeURIComponent(String(id))+'?draft=true&depth=1');
      setEditor({
        id:String(article.id),title:article.title||'',summary:article.summary||'',
        bodyText:lexicalText(article.body),primaryCategory:normalizeId(article.primaryCategory),
        featuredImage:normalizeId(article.featuredImage),slug:article.slug||'',
        published:article._status==='published',
        lockedBody:complexLexical(article.body),touchedBody:false,
      });
      navigate('write',String(id));
    } catch (e) {setError(e instanceof Error?e.message:'Could not open this article.');}
    finally {setBusy(false);}
  };
  useEffect(()=>{
    const id=new URL(window.location.href).searchParams.get('id');
    if (id && new URL(window.location.href).searchParams.get('tab')==='write') {void openArticle(id);}
    // initial edit route only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const saveArticle=async (action:'draft'|'review'|'publish')=>{
    setError('');setMessage('');
    if (!editor.title.trim()) {setError('Add a headline before saving.');return;}
    if (!editor.primaryCategory) {setError('Choose a section for this article.');return;}
    if (!editor.id && !editor.bodyText.trim()) {setError('Write the article before saving.');return;}
    if (editor.id && editor.published && !canPublish) {setError('Published articles can only be changed by the editor-in-chief or administrator.');return;}
    if (action==='publish' && !canPublish) {setError('You do not have permission to publish articles.');return;}
    if (action==='publish' && !window.confirm('Publish this article on the OgasTV website now?')) return;
    setBusy(true);
    const makeId=(value:string)=>/^\d+$/.test(value)?Number(value):value;
    const data:Record<string,unknown>={
      title:editor.title.trim(),primaryCategory:makeId(editor.primaryCategory),
      summary:editor.summary.trim() || editor.bodyText.trim().slice(0,240) || editor.title.trim(),
      featuredImage:editor.featuredImage?makeId(editor.featuredImage):null,
      workflowStatus:action==='publish'||editor.published?'approved':action==='review'?'in_review':'draft',
      _status:action==='publish'||editor.published?'published':'draft',
    };
    if (!editor.id) {
      data.author=makeId(staffId);
      data.body=toLexical(editor.bodyText.trim());
    } else if (!editor.lockedBody && editor.touchedBody) {
      data.body=toLexical(editor.bodyText.trim());
    }
    try {
      const endpoint='/api/articles'+(editor.id?'/'+encodeURIComponent(editor.id):'')+
        (action==='publish'||editor.published?'':'?draft=true');
      const result=await jsonFetch(endpoint,{
        method:editor.id?'PATCH':'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      const doc=result.doc||result;
      const savedId=String(doc.id||editor.id);
      setEditor(s=>({...s,id:savedId,published:action==='publish'||s.published,touchedBody:false}));
      setMessage(action==='publish'?'Your article is now published.':action==='review'?'Sent to the editor for review.':'Draft saved.');
      await loadArticles(1,'','all');
      setPage(1);setFilter('all');setSearch('');
    } catch(e) {setError(e instanceof Error?e.message:'Could not save. Please try again.');}
    finally {setBusy(false);}
  };

  const upload = async () => {
    if (!uploadFile) {setError('Choose a photo to upload.');return;}
    if (uploadFile.size>12*1024*1024) {setError('Choose a photo smaller than 12 MB.');return;}
    if (!['image/jpeg','image/png','image/webp','image/avif'].includes(uploadFile.type)) {setError('Use JPG, PNG, WebP or AVIF photos.');return;}
    setBusy(true);setError('');
    try {
      const form=new FormData();
      form.append('file',uploadFile);
      form.append('_payload',JSON.stringify({alt:fileDescription.trim()}));
      const response=await fetch('/api/media',{method:'POST',body:form,credentials:'include'});
      const result=await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(result.errors?.[0]?.message||result.message||'Upload failed.');
      const item=result.doc||result;
      setUploadFile(null);setFileDescription('');
      await loadMedia();
      if (picker) {setEditor(s=>({...s,featuredImage:String(item.id)}));setPicker(false);}
      setMessage('Photo uploaded successfully.');
    } catch(e) {setError(e instanceof Error?e.message:'Photo upload failed.');}
    finally {setBusy(false);}
  };
  const chosenImage=media.find(m=>String(m.id)===editor.featuredImage);

  const submitAd = async () => {
    setError('');setMessage('');
    if (!canAds) {setError('Only advertising staff can manage banners.');return;}
    if (!adForm.name.trim() || !adForm.banner) {setError('Add a campaign name and banner image.');return;}
    let destination:URL;
    try {destination=new URL(adForm.destinationUrl);} catch {setError('Enter a valid website link.');return;}
    if (!['https:','http:'].includes(destination.protocol)) {setError('Use an http or https website link.');return;}
    if (!adForm.startsAt || !adForm.endsAt || new Date(adForm.endsAt)<=new Date(adForm.startsAt)) {setError('Choose a valid start and end date.');return;}
    setBusy(true);
    try {
      await jsonFetch('/api/ad-banners',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:adForm.name.trim(),banner:/^\d+$/.test(adForm.banner)?Number(adForm.banner):adForm.banner,
        destinationUrl:destination.toString(),startsAt:new Date(adForm.startsAt).toISOString(),endsAt:new Date(adForm.endsAt).toISOString(),
        status:'scheduled',placement:'homepage'
      })});
      await loadAds();setAdEditor(false);setAdForm({name:'',destinationUrl:'',startsAt:'',endsAt:'',banner:''});
      setMessage('Banner scheduled. It will appear automatically during the selected dates.');
    } catch(e) {setError(e instanceof Error?e.message:'Could not save the banner.');}
    finally {setBusy(false);}
  };

  const articleCard=(a:Article)=>(
    <button key={String(a.id)} type="button" className="ogas-story-row" onClick={()=>void openArticle(a.id)} aria-label={'Open '+titleOf(a)}>
      <span className="ogas-story-cover">
        {cover(a)?<img src={cover(a)} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';e.currentTarget.parentElement?.classList.add('missing-image');}}/>:<span className="ogas-cover-empty"><ImageIcon {...iconSize(19)}/><small>No image</small></span>}
      </span>
      <span className="ogas-story-copy"><strong>{titleOf(a)}</strong><small>{categoryName(a.primaryCategory)} <span aria-hidden="true">·</span> {shortDate(a.updatedAt)}</small></span>
      <span className={'ogas-status ogas-status--'+statusOf(a)}>{statusName(a)}</span>
      <ArrowUpRight className="ogas-row-arrow" {...iconSize(17)}/>
    </button>
  );

  return <div className="ogas-app">
    <aside className="ogas-sidebar" aria-label="Newsroom navigation">
      <a href="/studio" className="ogas-brand" aria-label="OgasTV Studio home"><span className="ogas-brand-mark"><Radio {...iconSize(20)}/></span><span>ogas<span className="ogas-brand-strong">tv</span><small>studio</small></span></a>
      <div className="ogas-nav-label">YOUR WORKSPACE</div>
      <nav className="ogas-nav">
        {topNav.filter(x=>canAds || x.key!=='ads').map(x=>{
          const Icon=icons[x.key];return <button key={x.key} type="button" className={'ogas-nav-link'+(tab===x.key?' active':'')} onClick={()=>x.key==='write'?begin():navigate(x.key)} aria-current={tab===x.key?'page':undefined}><Icon {...iconSize(20)}/><span>{x.label==='Write'?'Write an article':x.label==='Articles'?'Your articles':x.label}</span>{x.key==='write'&&<Plus size={15} strokeWidth={2.2}/>}</button>;
        })}
      </nav>
      <div className="ogas-side-bottom"><div className="ogas-side-note"><ShieldCheck {...iconSize(19)}/><div><strong>Your work is private</strong><p>Only the OgasTV team can use this space.</p></div></div>
      <div className="ogas-profile"><span className="ogas-avatar">{firstName.slice(0,2).toUpperCase()}</span><span><strong>{name}</strong><small>{roleText}</small></span><a href="/admin/account" aria-label="Account settings"><Settings2 size={17}/></a></div></div>
    </aside>

    <div className="ogas-workspace">
      <header className="ogas-topbar">
        <div className="ogas-breadcrumb"><span>Newsroom</span><ChevronRight size={15}/><strong>{tab==='home'?'Home':tab==='articles'?'Your articles':tab==='write'?'Write an article':tab==='media'?'Media library':tab==='live'?'Go live':'Advertisements'}</strong></div>
        <div className="ogas-top-actions"><span className="ogas-systems"><span/> Signed in securely</span><a className="ogas-top-website" href="/" target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={15}/></a><span className="ogas-avatar ogas-avatar--top">{firstName.slice(0,2).toUpperCase()}</span></div>
      </header>

      <main className="ogas-main">
        {error && <div role="alert" className="ogas-alert ogas-alert--error"><CircleHelp {...iconSize(18)}/><span>{error}</span><button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={17}/></button></div>}
        {message && <div role="status" className="ogas-alert ogas-alert--success"><CheckCircle2 {...iconSize(18)}/><span>{message}</span><button type="button" onClick={()=>setMessage('')} aria-label="Dismiss message"><X size={17}/></button></div>}

        {tab==='home'&&<>
          <section className="ogas-heading"><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR WORKSPACE</span><h1>Welcome back, {firstName}.</h1><p>What would you like to work on today?</p></section>
          <div className="ogas-action-grid">
            {canWrite&&<button type="button" className="ogas-feature-action ogas-feature-action--red" onClick={begin}><span className="ogas-feature-icon"><PencilLine {...iconSize(22)}/></span><span className="ogas-feature-decor" aria-hidden="true"><Newspaper size={78} strokeWidth={0.7}/></span><span className="ogas-feature-bottom"><span><strong>Write an article</strong><small>Start writing something new.</small></span><span className="ogas-action-arrow"><ArrowUpRight size={18}/></span></span></button>}
            <button type="button" className="ogas-feature-action ogas-feature-action--green" onClick={()=>navigate('live')}><span className="ogas-feature-icon"><Radio {...iconSize(22)}/></span><span className="ogas-feature-decor ogas-feature-decor--signal" aria-hidden="true"><Radio size={97} strokeWidth={0.7}/></span><span className="ogas-feature-bottom"><span><strong>Go live</strong><small>Start broadcasting in a few taps.</small></span><span className="ogas-action-arrow"><ArrowUpRight size={18}/></span></span></button>
          </div>
          <div className="ogas-mini-stats"><span><strong>{total}</strong> Articles found</span><span><strong>{articles.filter(a=>a._status==='published').length}</strong> Published in this view</span><span><strong>{articles.filter(a=>a._status!=='published').length}</strong> Unpublished in this view</span></div>
          <div className="ogas-home-columns"><section className="ogas-recent"><div className="ogas-section-heading"><div><h2>Pick up where you left off</h2><p>Recently updated articles from the newsroom.</p></div><button type="button" className="ogas-text-link" onClick={()=>navigate('articles')}>See all articles <ArrowRight size={16}/></button></div><div className="ogas-story-list">{loading?<p className="ogas-empty-small">Loading your articles…</p>:filteredRecent.length?filteredRecent.map(articleCard):<div className="ogas-empty"><BookOpen size={26}/><h3>Your first article starts here</h3><p>Write something new, then come back to find it here.</p>{canWrite&&<button className="ogas-button ogas-button--red" onClick={begin}>Write an article</button>}</div>}</div></section>
          <aside className="ogas-at-glance"><h2>At a glance</h2><p>Shortcuts to what needs attention.</p><button onClick={()=>{changeFilter('review');navigate('articles');}}><span className="ogas-glance-icon"><Clock3 {...iconSize(19)}/></span><span><strong>Waiting for review</strong><small>Find articles sent to an editor</small></span><ArrowRight size={18}/></button><button onClick={()=>navigate('media')}><span className="ogas-glance-icon ogas-glance-icon--green"><ImageIcon {...iconSize(19)}/></span><span><strong>Media library</strong><small>Browse and upload photos</small></span><ArrowRight size={18}/></button>{canAds&&<button onClick={()=>navigate('ads')}><span className="ogas-glance-icon"><LayoutGrid {...iconSize(19)}/></span><span><strong>Advertisements</strong><small>Manage website banners</small></span><ArrowRight size={18}/></button>}</aside></div>
        </>}

        {tab==='articles'&&<>
          <section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> CONTENT LIBRARY</span><h1>Your articles</h1><p>Find, update and publish articles, all in one place.</p></div>{canWrite&&<button className="ogas-button ogas-button--red" onClick={begin}><Plus {...iconSize(18)}/> New article</button>}</section>
          <div className="ogas-library-tools"><label className="ogas-search"><Search size={19}/><input type="search" value={search} onChange={e=>changeSearch(e.target.value)} placeholder="Search articles by headline" aria-label="Search articles by headline"/></label><div role="group" aria-label="Article status" className="ogas-segmented">{[{key:'all',label:'All'},{key:'published',label:'Published'},{key:'draft',label:'Drafts'},{key:'review',label:'In review'}].map(x=><button key={x.key} type="button" className={filter===x.key?'selected':''} onClick={()=>changeFilter(x.key)}>{x.label}</button>)}</div></div>
          <div className="ogas-story-list ogas-story-list--large">{loading?<p className="ogas-empty-small">Finding articles…</p>:articles.length?articles.map(articleCard):<div className="ogas-empty"><Search size={28}/><h3>No articles found</h3><p>Try another headline or choose a different filter.</p><button onClick={()=>{changeSearch('');changeFilter('all');}}>Clear search</button></div>}</div>
          <div className="ogas-pagination"><span>{total?('Showing '+Math.min((page-1)*pageSize+1,total)+'–'+Math.min(page*pageSize,total)+' of '+total+' articles'):'No articles'}</span><div><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Previous page"><ChevronLeft size={18}/></button><span>Page {page}</span><button disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={18}/></button></div></div>
        </>}

        {tab==='write'&&<>
          <section className="ogas-heading ogas-heading--split ogas-write-heading"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR WRITING DESK</span><h1>{editor.id?'Edit article':'Write an article'}</h1><p>Write your article and save it when you're ready.</p></div><div className="ogas-editor-actions"><button className="ogas-button ogas-button--outline" onClick={()=>setPreview(true)}><ExternalLink size={16}/> Preview</button><button className="ogas-button ogas-button--outline" disabled={busy} onClick={()=>void saveArticle('draft')}><Check size={17}/> {editor.published?'Save changes':'Save draft'}</button>{!editor.published&&<button className="ogas-button ogas-button--red" disabled={busy} onClick={()=>void saveArticle(canPublish?'publish':'review')}>{busy?'Saving…':canPublish?'Publish':'Send for review'} <ArrowRight size={16}/></button>}</div></section>
          <div className="ogas-editor-grid">
            <section className="ogas-writing-surface"><span className="ogas-doc-state"><span className="ogas-doc-dot"/> {editor.published?'Published':'Draft'} <span>·</span> Write in your own words</span>
              <input aria-label="Article headline" className="ogas-headline-input" maxLength={250} placeholder="Give your article a headline…" value={editor.title} onChange={e=>setEditor(s=>({...s,title:e.target.value}))} disabled={busy||editor.published&&!canPublish}/>
              <div className="ogas-byline"><span className="ogas-avatar">{firstName.slice(0,2).toUpperCase()}</span> {name} <span>·</span> {shortDate(new Date().toISOString())}</div>
              <div className="ogas-writing-divider"/>
              {editor.lockedBody?<div className="ogas-locked-editor"><ShieldCheck size={24}/><h3>This article has advanced formatting</h3><p>To keep its existing links, images and formatting intact, edit the article body in the full editor.</p><a className="ogas-button ogas-button--outline" href={'/admin/collections/articles/'+encodeURIComponent(editor.id)}>Open full editor <ArrowUpRight size={15}/></a><div className="ogas-body-readonly">{editor.bodyText}</div></div>:
              <textarea aria-label="Article body" className="ogas-body-input" placeholder="Start writing your article here…" value={editor.bodyText} onChange={e=>setEditor(s=>({...s,bodyText:e.target.value,touchedBody:true}))} disabled={busy||editor.published&&!canPublish} />}
              <div className="ogas-editor-footnote"><CheckCircle2 size={15}/> {editor.id?'Remember to save your changes.':'Save your draft when you need a break.'}</div>
            </section>
            <aside className="ogas-editor-side"><section className="ogas-editor-panel"><h3>Featured image <span>Optional</span></h3>{chosenImage? <button type="button" className="ogas-chosen-cover" onClick={()=>setPicker(true)}><img src={mediaUrl(chosenImage)} alt={chosenImage.alt||'Featured article photo'}/><span>Change image</span></button>:<button type="button" className="ogas-cover-upload" onClick={()=>setPicker(true)}><ImagePlus size={25}/><strong>Choose or upload a photo</strong><small>JPG, PNG, WebP or AVIF</small></button>}{editor.featuredImage&&<button className="ogas-remove-cover" onClick={()=>setEditor(s=>({...s,featuredImage:''}))}>Remove featured image</button>}</section>
              <section className="ogas-editor-panel"><h3>Article details</h3><label className="ogas-input-label">Section <span>Required</span></label><select className="ogas-field" value={editor.primaryCategory} onChange={e=>setEditor(s=>({...s,primaryCategory:e.target.value}))}><option value="">Choose a section</option>{categories.map(c=><option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}</select><label className="ogas-input-label">Short introduction <span>Optional</span></label><textarea className="ogas-field" rows={4} value={editor.summary} onChange={e=>setEditor(s=>({...s,summary:e.target.value}))} placeholder="A brief introduction for readers."/><p className="ogas-helper">If you leave this blank, we'll use the opening of your article.</p></section>
              <details className="ogas-editor-panel ogas-more-options"><summary><Settings2 size={17}/> More options <ChevronDown size={16}/></summary><p>Need categories, sources, SEO or more editing tools?</p><a href={editor.id?'/admin/collections/articles/'+encodeURIComponent(editor.id):'/admin/collections/articles/create'}>Open full editor <ArrowUpRight size={15}/></a></details>
            </aside>
          </div>
        </>}

        {tab==='media'&&<>
          <section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR MEDIA LIBRARY</span><h1>Media library</h1><p>Keep photos together so you can use them again.</p></div>{canUpload&&<button className="ogas-button ogas-button--red" onClick={()=>document.getElementById('ogas-media-file')?.click()}><UploadCloud size={18}/> Upload a photo</button>}</section>
          {canUpload&&<div className="ogas-upload-panel"><label htmlFor="ogas-media-file" className="ogas-upload-area"><ImagePlus size={28}/><strong>{uploadFile?uploadFile.name:'Choose a photo to upload'}</strong><span>JPG, PNG, WebP or AVIF · up to 12 MB</span></label><input id="ogas-media-file" className="ogas-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/>{uploadFile&&<div className="ogas-upload-details"><label>Image description <span>Optional</span><input value={fileDescription} onChange={e=>setFileDescription(e.target.value)} placeholder="Describe this photo for readers who can't see it"/></label><button className="ogas-button ogas-button--green" disabled={busy} onClick={()=>void upload()}>{busy?'Uploading…':'Upload photo'} <ArrowRight size={16}/></button></div>}</div>}
          <div className="ogas-section-heading ogas-section-heading--spaced"><div><h2>Your photos</h2><p>{media.length} recent uploads</p></div><button type="button" className="ogas-text-link" onClick={()=>void loadMedia()}>Refresh <ArrowRight size={16}/></button></div>
          {media.length?<div className="ogas-photo-grid">{media.map(m=><article key={String(m.id)} className="ogas-photo-card"><div className="ogas-photo-visual">{mediaUrl(m)?<img src={mediaUrl(m)} alt={m.alt||''} loading="lazy"/>:<ImageIcon size={30}/>}</div><div className="ogas-photo-copy"><strong>{m.alt||m.filename||'Untitled photo'}</strong><small>{m.filename||'Uploaded image'}</small></div></article>)}</div>:<div className="ogas-empty"><ImageIcon size={28}/><h3>No photos yet</h3><p>Upload a photo to start your media library.</p></div>}
        </>}

        {tab==='live'&&<>
          <section className="ogas-heading"><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> BROADCAST STUDIO</span><h1>Ready to go live?</h1><p>Start broadcasting using the studio you already know.</p></section>
          <div className="ogas-broadcast-grid"><div className="ogas-live-stage"><div className="ogas-live-icon"><Radio size={58} strokeWidth={1.4}/></div><span className="ogas-live-label">OGASTV AFRICA · LIVE STUDIO</span><div className="ogas-live-rings" aria-hidden="true"/></div><div className="ogas-live-control"><span className="ogas-eyebrow">BROADCAST SETUP</span><h2>You're almost there.</h2><p>The camera, microphone and Go Live controls are waiting in the broadcast studio.</p><div className="ogas-live-check"><CheckCircle2 size={19}/><span>Your existing broadcast workflow is unchanged.</span></div><a className="ogas-button ogas-button--red" href="/broadcast-studio">Open broadcast studio <ArrowUpRight size={17}/></a></div></div>
        </>}

        {tab==='ads'&&(canAds?<><section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> GROW YOUR NEWSROOM</span><h1>Advertisements</h1><p>Add a banner and the website it should open when someone clicks.</p></div><button className="ogas-button ogas-button--red" onClick={()=>setAdEditor(true)}><Plus size={18}/> New banner</button></section>
          <div className="ogas-mini-stats ogas-ad-stats"><span><strong>{ads.length}</strong> Recent campaigns</span><span><strong>{ads.filter(a=>a.status==='scheduled').length}</strong> Scheduled</span><span><strong>{ads.filter(a=>a.status==='paused').length}</strong> Paused</span></div>
          <div className="ogas-section-heading"><div><h2>Your banners</h2><p>Only one homepage banner runs at a time.</p></div></div>
          {ads.length?<div className="ogas-ad-list">{ads.map(ad=><div className="ogas-ad-row" key={String(ad.id)}><div className="ogas-ad-thumb">{mediaUrl(ad.banner)?<img src={mediaUrl(ad.banner)} alt=""/>:<LayoutGrid size={23}/>}</div><div><strong>{ad.name||'Untitled banner'}</strong><small>{shortDate(ad.startsAt)} – {shortDate(ad.endsAt)} · {ad.status||'Draft'}</small></div><a href={'/admin/collections/ad-banners/'+encodeURIComponent(String(ad.id))} className="ogas-text-link">Manage <ArrowUpRight size={16}/></a></div>)}</div>:<div className="ogas-empty"><LayoutGrid size={28}/><h3>Your first banner goes here</h3><p>Upload an advertiser's image, add their link and schedule it.</p><button className="ogas-button ogas-button--red" onClick={()=>setAdEditor(true)}>Create a banner</button></div>}
          <p className="ogas-ad-note"><ShieldCheck size={17}/> Advertisements are labeled on the website. Only authorised staff can schedule them.</p>
        </>:<div className="ogas-empty"><ShieldCheck size={28}/><h3>Advertising access required</h3><p>Ask an administrator if you need to manage banners.</p></div>)}
      </main>
    </div>

    <nav className="ogas-mobile-nav" aria-label="Mobile newsroom navigation">{topNav.slice(0,4).map(x=>{const Icon=icons[x.key];return <button key={x.key} className={tab===x.key?'active':''} onClick={()=>x.key==='write'?begin():navigate(x.key)}><Icon size={19} strokeWidth={2.1}/><span>{x.label}</span></button>;})}<button onClick={()=>setMore(s=>!s)} className={['media','ads'].includes(tab)?'active':''}><Menu size={19}/><span>More</span></button></nav>
    {more&&<div className="ogas-mobile-more"><button onClick={()=>navigate('media')}><ImageIcon size={18}/> Media library</button>{canAds&&<button onClick={()=>navigate('ads')}><LayoutGrid size={18}/> Advertisements</button>}<a href="/admin/account"><Settings2 size={18}/> Account & settings</a><a href="/"><ExternalLink size={18}/> View website</a></div>}

    {picker&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setPicker(false);}}><div className="ogas-modal" role="dialog" aria-modal="true" aria-label="Choose an article photo"><header><div><h2>Choose a photo</h2><p>Select an existing image or upload a new one.</p></div><button onClick={()=>setPicker(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-picker-grid">{media.map(m=><button key={String(m.id)} onClick={()=>{setEditor(s=>({...s,featuredImage:String(m.id)}));setPicker(false);}}>{mediaUrl(m)?<img src={mediaUrl(m)} alt={m.alt||m.filename||'Photo'}/>:<ImageIcon size={28}/>}<span>{m.alt||m.filename||'Photo'}</span></button>)}</div><div className="ogas-picker-upload"><label className="ogas-input-label">Upload a new photo</label><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/><input placeholder="Image description (optional)" value={fileDescription} onChange={e=>setFileDescription(e.target.value)}/><button className="ogas-button ogas-button--red" disabled={!uploadFile||busy} onClick={()=>void upload()}>{busy?'Uploading…':'Upload and use'} <ArrowRight size={16}/></button></div></div></div>}

    {preview&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setPreview(false);}}><div className="ogas-modal ogas-preview-modal" role="dialog" aria-modal="true" aria-label="Article preview"><header><div><h2>Article preview</h2><p>This preview is only visible to you.</p></div><button onClick={()=>setPreview(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-preview-article"><span className="ogas-eyebrow">{categories.find(c=>String(c.id)===editor.primaryCategory)?.name||'NEWSROOM'}</span><h1>{editor.title||'Your headline goes here'}</h1>{chosenImage&&<img src={mediaUrl(chosenImage)} alt={chosenImage.alt||''}/>}<p className="ogas-preview-summary">{editor.summary||editor.bodyText.slice(0,230)}</p><div className="ogas-preview-body">{editor.bodyText||'Start writing to see your article here.'}</div></div></div></div>}

    {adEditor&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setAdEditor(false);}}><div className="ogas-modal ogas-ad-modal" role="dialog" aria-modal="true" aria-label="Schedule a banner"><header><div><h2>Schedule a banner</h2><p>Choose a photo, destination link and running dates.</p></div><button onClick={()=>setAdEditor(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-ad-form"><label>Campaign name<input value={adForm.name} onChange={e=>setAdForm(s=>({...s,name:e.target.value}))} placeholder="e.g. December partner banner"/></label><label>Banner image<select value={adForm.banner} onChange={e=>setAdForm(s=>({...s,banner:e.target.value}))}><option value="">Choose an uploaded image</option>{media.map(m=><option key={String(m.id)} value={String(m.id)}>{m.alt||m.filename||'Photo '+m.id}</option>)}</select><button type="button" className="ogas-text-link" style={{marginTop:10}} onClick={()=>{setAdEditor(false);navigate("media");}}>Need to upload a banner? Open Media library <ArrowRight size={14}/></button></label><label>Website link<input type="url" placeholder="https://advertiser.com" value={adForm.destinationUrl} onChange={e=>setAdForm(s=>({...s,destinationUrl:e.target.value}))}/></label><div className="ogas-ad-dates"><label>Start date<input type="datetime-local" value={adForm.startsAt} onChange={e=>setAdForm(s=>({...s,startsAt:e.target.value}))}/></label><label>End date<input type="datetime-local" value={adForm.endsAt} onChange={e=>setAdForm(s=>({...s,endsAt:e.target.value}))}/></label></div><p>Times are based on your device's time zone. Your banner will appear on the homepage during these dates.</p><button className="ogas-button ogas-button--red" disabled={busy} onClick={()=>void submitAd()}>{busy?'Saving…':'Schedule banner'} <ArrowRight size={16}/></button></div></div></div>}
  </div>;
}
