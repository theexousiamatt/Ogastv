'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { StudioAdvanced } from './StudioAdvanced';
import { prepareEditorialImage, uploadEditorialImage } from './media-upload';
import { StudioRichEditor, canEditRichBody } from './StudioRichEditor';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen,
  CalendarDays, Camera, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, ExternalLink, FilePenLine, FileText,
  FolderOpen, Home, Image as ImageIcon, ImagePlus, LayoutGrid, Link2, Copy,
  LogOut, Menu, MoreHorizontal, Newspaper, PencilLine, Plus, Radio,
  Search, Settings2, ShieldCheck, Sparkles, Trash2, UploadCloud, UsersRound, X,
} from 'lucide-react';

type Tab = 'home' | 'articles' | 'write' | 'media' | 'live' | 'ads' | 'advanced';
type Media = { id: string | number; url?: string; thumbnailURL?: string; alt?: string; filename?: string; mimeType?: string };
type Category = { id: string | number; name: string };
type TaxonomyItem = {id:string|number;name:string;slug?:string;};
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
  id: string; title: string; summary: string; bodyText: string; body: Record<string,any>|null;
  primaryCategory: string; featuredImage: string; slug: string;
  published: boolean; lockedBody: boolean; touchedBody: boolean;
  subtitle:string; publicByline:string; editorialType:string;
  secondaryCategories:string[]; locations:string[]; tags:string[];
  metaTitle:string; metaDescription:string; correctionNotice:string;
  sourceLinks:{label:string;url:string}[];
};
const emptyEditor = (): Editor => ({
  id: '', title: '', summary: '', bodyText: '', body:null, primaryCategory: '',
  featuredImage: '', slug: '', published: false, lockedBody: false, touchedBody: false,
  subtitle:'',publicByline:'',editorialType:'news',secondaryCategories:[],locations:[],tags:[],
  metaTitle:'',metaDescription:'',correctionNotice:'',sourceLinks:[],
});
const pageSize = 30;
const icons = {home: Home, articles: Newspaper, write: Plus, media: ImageIcon, live: Radio, ads: LayoutGrid, advanced: Settings2};
const topNav: {key: Tab; label: string}[] = [
  {key: 'home',label: 'Home'}, {key: 'articles',label: 'Articles'},
  {key: 'write',label: 'Write'}, {key: 'live',label: 'Go live'},
  {key: 'media',label: 'Media'}, {key: 'ads',label: 'Ads'},
  {key: 'advanced',label: 'Advanced'},
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
function ArticleImage({url,alt='',missingText='Image unavailable'}:{url:string;alt?:string;missingText?:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[url]);
  if(!url||failed)return <span className="ogas-image-fallback" role="img" aria-label={failed?missingText:'No image'}><ImageIcon size={20}/><small>{failed?missingText:'No image'}</small></span>;
  return <img src={url} alt={alt} loading="lazy" onError={()=>setFailed(true)}/>;
}
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
  const [selectedArticles,setSelectedArticles] = useState<Set<string>>(()=>new Set());
  const [articleMenu,setArticleMenu] = useState<string|null>(null);
  const [categories,setCategories] = useState<Category[]>([]);
  const [locations,setLocations] = useState<TaxonomyItem[]>([]);
  const [tags,setTags] = useState<TaxonomyItem[]>([]);
  const [media,setMedia] = useState<Media[]>([]);
  const [ads,setAds] = useState<Ad[]>([]);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [editor,setEditor] = useState<Editor>(emptyEditor);
  const editorRef=useRef(editor);
  useEffect(()=>{editorRef.current=editor},[editor]);
  // Keep consecutive image changes ordered so older saves cannot win.
  const featuredImageSaveRef=useRef<{articleId:string;promise:Promise<void>}|null>(null);
  const [autoSaveState,setAutoSaveState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [picker,setPicker] = useState(false);
  const [fileDescription,setFileDescription] = useState('');
  const [uploadFile,setUploadFile] = useState<File|null>(null);
  const [uploadStage,setUploadStage] = useState<'idle'|'optimizing'|'uploading'|'processing'>('idle');
  const [uploadProgress,setUploadProgress] = useState(0);
  const [uploadPreviewUrl,setUploadPreviewUrl] = useState('');
  // Object URLs preview files locally before uploading and must be released.
  useEffect(() => {
    if (!uploadFile) { setUploadPreviewUrl(''); return; }
    const url = URL.createObjectURL(uploadFile);
    setUploadPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);
  const [preview,setPreview] = useState(false);
  const [adForm,setAdForm] = useState({name:'',destinationUrl:'',startsAt:'',endsAt:'',banner:''});
  const [adEditingId,setAdEditingId] = useState<string|null>(null);
  const [adStatus,setAdStatus] = useState<'scheduled'|'paused'>('scheduled');
  const [adEditor,setAdEditor] = useState(false);
  const canWrite = ['administrator','editor_in_chief','editor','journalist'].includes(role);
  const canPublish = ['administrator','editor_in_chief'].includes(role);
  const canDelete = canPublish;
  const canDeleteMedia = ['administrator','editor_in_chief','editor'].includes(role);
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

  const loadTaxonomy=useCallback(async()=>{
    const [c,l,t]=await Promise.all([
      jsonFetch('/api/categories?limit=100&sort=name'),
      jsonFetch('/api/locations?limit=100&sort=name'),
      jsonFetch('/api/tags?limit=100&sort=name'),
    ]);
    setCategories(Array.isArray(c.docs)?c.docs:[]);
    setLocations(Array.isArray(l.docs)?l.docs:[]);
    setTags(Array.isArray(t.docs)?t.docs:[]);
  },[]);

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
      loadTaxonomy(), loadMedia(), loadAds(),
    ]).catch(e=>setError(e instanceof Error?e.message:'Could not load the newsroom.'));
    return ()=>window.removeEventListener('popstate',back);
  }, [loadMedia,loadAds,loadTaxonomy]);

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
  const changeSearch=(value:string)=>{setPage(1);setSearch(value);setSelectedArticles(new Set());setArticleMenu(null);};
  const changeFilter=(value:string)=>{setPage(1);setFilter(value);setSelectedArticles(new Set());setArticleMenu(null);};
  const visibleIds=articles.map(a=>String(a.id));
  const selectedOnPage=visibleIds.filter(id=>selectedArticles.has(id));
  const toggleArticle=(id:string,checked:boolean)=>setSelectedArticles(current=>{
    const next=new Set(current);if(checked)next.add(id);else next.delete(id);return next;
  });
  const toggleAllArticles=(checked:boolean)=>setSelectedArticles(checked?new Set(visibleIds):new Set());

  const isUnfinishedDraft=(draft:Editor)=>Boolean(
    draft.title.trim()||draft.bodyText.trim()||draft.summary.trim()||draft.featuredImage
  );
  // 'Write' resumes work in progress; 'New article' explicitly starts fresh.
  const resumeWriting=()=>{
    const current=editorRef.current;
    if(current.id||isUnfinishedDraft(current)){
      navigate('write',current.id||undefined);
      return;
    }
    begin();
  };
  const begin = () => {
    const current=editorRef.current;
    if(!current.id&&isUnfinishedDraft(current)&&
      !window.confirm('Start another article? Save your unfinished draft first if you want to keep it after refreshing.'))return;
    editorRef.current=emptyEditor();
    setEditor(editorRef.current);setAutoSaveState('idle');setPicker(false);navigate('write');
  };
  const openArticle = async (id: string | number) => {
    setBusy(true);setError('');
    try {
      // Wait for an in-flight cover save before reopening its article.
      const pending=featuredImageSaveRef.current;
      if(pending?.articleId===String(id))await pending.promise;
      const article=await jsonFetch('/api/articles/'+encodeURIComponent(String(id))+'?draft=true&depth=1');
      setEditor({
        id:String(article.id),title:article.title||'',summary:article.summary||'',
        bodyText:lexicalText(article.body),body:article.body||null,primaryCategory:normalizeId(article.primaryCategory),
        featuredImage:normalizeId(article.featuredImage),slug:article.slug||'',
        published:article._status==='published',
        lockedBody:!canEditRichBody(article.body),touchedBody:false,
        subtitle:article.subtitle||'',publicByline:article.publicByline||'',editorialType:article.editorialType||'news',
        secondaryCategories:(article.secondaryCategories||[]).map(normalizeId),
        locations:(article.locations||[]).map(normalizeId),tags:(article.tags||[]).map(normalizeId),
        metaTitle:article.metaTitle||'',metaDescription:article.metaDescription||'',
        correctionNotice:article.correctionNotice||'',
        sourceLinks:Array.isArray(article.sourceLinks)?article.sourceLinks.map((v:any)=>({label:String(v.label||''),url:String(v.url||'')})):[],
      });
      setAutoSaveState('idle');
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
    const pendingImageSave=featuredImageSaveRef.current;
    if(pendingImageSave?.articleId===editor.id)await pendingImageSave.promise;
    const data:Record<string,unknown>={
      title:editor.title.trim(),primaryCategory:makeId(editor.primaryCategory),
      summary:editor.summary.trim() || editor.bodyText.trim().slice(0,240) || editor.title.trim(),
      subtitle:editor.subtitle.trim(),publicByline:editor.publicByline.trim(),
      editorialType:editor.editorialType,
      secondaryCategories:editor.secondaryCategories.map(makeId),
      locations:editor.locations.map(makeId),
      tags:editor.tags.map(makeId),
      metaTitle:editor.metaTitle.trim(),metaDescription:editor.metaDescription.trim(),
      correctionNotice:editor.correctionNotice.trim(),
      sourceLinks:editor.sourceLinks.filter(x=>x.url.trim()).map(x=>({label:x.label.trim(),url:x.url.trim()})),
      featuredImage:editor.featuredImage?makeId(editor.featuredImage):null,
      workflowStatus:action==='publish'||editor.published?'approved':action==='review'?'in_review':'draft',
      _status:action==='publish'||editor.published?'published':'draft',
    };
    if (!editor.id) {
      data.author=makeId(staffId);
      data.body=editor.body || toLexical(editor.bodyText.trim());
    } else if (!editor.lockedBody && editor.touchedBody) {
      data.body=editor.body || toLexical(editor.bodyText.trim());
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
      setAutoSaveState('saved');
      setMessage(action==='publish'?'Your article is now published.':action==='review'?'Sent to the editor for review.':'Draft saved.');
      await loadArticles(1,'','all');
      setPage(1);setFilter('all');setSearch('');
    } catch(e) {setError(e instanceof Error?e.message:'Could not save. Please try again.');}
    finally {setBusy(false);}
  };

  const changeFeaturedImage=(imageId:string)=>{
    const current=editorRef.current;
    if(current.id&&current.published&&!canPublish){
      setError('Only an administrator or editor-in-chief can change a published article’s featured image.');
      setPicker(false);
      return;
    }
    if(current.featuredImage===imageId){setPicker(false);return;}
    const next={...current,featuredImage:imageId};
    editorRef.current=next;
    setEditor(next);
    setPicker(false);
    if(!current.id){
      // New stories without required fields cannot yet be saved to Payload.
      // Keep the photo in the current writing session until Save draft.
      return;
    }
    const articleId=current.id;
    const previous=featuredImageSaveRef.current;
    setAutoSaveState('saving');
    const promise=(async()=>{
      if(previous?.articleId===articleId)await previous.promise;
      try{
        const id=/^\d+$/.test(imageId)?Number(imageId):imageId;
        await jsonFetch('/api/articles/'+encodeURIComponent(articleId)+(current.published?'':'?draft=true'),{
          method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({featuredImage:imageId?id:null}),
        });
        if(editorRef.current.id===articleId&&editorRef.current.featuredImage===imageId){
          setAutoSaveState('saved');
          setMessage('Featured image saved automatically.');
        }
      }catch(e){
        if(editorRef.current.id===articleId&&editorRef.current.featuredImage===imageId){
          setAutoSaveState('error');
          setMessage('');
          setError('Your photo is selected but could not be saved automatically. Please click Save changes. '+
            (e instanceof Error?e.message:'Please try again.'));
        }
      }
    })();
    featuredImageSaveRef.current={articleId,promise};
    void promise.finally(()=>{
      if(featuredImageSaveRef.current?.promise===promise)featuredImageSaveRef.current=null;
    });
  };

  const upload = async () => {
    if (!uploadFile || busy) { if(!uploadFile)setError('Choose a photo to upload.'); return; }
    if (uploadFile.size > 12 * 1024 * 1024) { setError('Choose a photo smaller than 12 MB.'); return; }
    if (!['image/jpeg','image/png','image/webp','image/avif'].includes(uploadFile.type)) {
      setError('Use JPG, PNG, WebP or AVIF photos.'); return;
    }
    setBusy(true); setError(''); setUploadProgress(0); setUploadStage('optimizing');
    try {
      const prepared = await prepareEditorialImage(uploadFile);
      setUploadStage('uploading');
      const item = await uploadEditorialImage(prepared,fileDescription,percent => {
        setUploadProgress(percent);
        if (percent >= 99) setUploadStage('processing');
      }) as Media;
      setUploadFile(null); setFileDescription(''); setUploadProgress(100);
      // Show the newly uploaded image immediately; refresh the list in background.
      setMedia(current => [item,...current.filter(m => String(m.id) !== String(item.id))]);
      if (picker) changeFeaturedImage(String(item.id));
      setMessage(picker?'Photo uploaded. Saving it to the article…':'Photo uploaded successfully.');
      void loadMedia().catch(()=>setError('Photo uploaded, but the library could not refresh. Try Refresh.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload failed.');
    } finally {
      setBusy(false); setUploadStage('idle');
    }
  };
  const deleteMediaItem = async (item:Media) => {
    if (!canDeleteMedia || busy) return;
    const title = item.alt || item.filename || 'this image';
    if (!window.confirm('Permanently delete "' + title + '"? The file will be removed from storage and cannot be recovered. Images in use by an article or advert must be replaced first.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await jsonFetch('/api/media/' + encodeURIComponent(String(item.id)), { method: 'DELETE' });
      setMedia(current => current.filter(m => String(m.id) !== String(item.id)));
      setEditor(current => current.featuredImage === String(item.id) ? {...current, featuredImage:''} : current);
      setAdForm(current => current.banner === String(item.id) ? {...current, banner:''} : current);
      setMessage('Image deleted from the media library and storage.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete image. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const chosenImage=media.find(m=>String(m.id)===editor.featuredImage);
  const duplicateArticle=async(article:Article)=>{
    if(!canWrite || busy)return;
    setArticleMenu(null);setBusy(true);setError('');setMessage('');
    try{
      const source=await jsonFetch('/api/articles/'+encodeURIComponent(String(article.id))+'?draft=true&depth=0');
      if(!source?.body?.root)throw new Error('This article has no content to copy.');
      const asId=(value:unknown)=>{const id=normalizeId(value);return id?(/^\\d+$/.test(id)?Number(id):id):null;};
      const payload={
        title:(String(source.title||'Untitled article')+' (copy)').slice(0,250),
        slug:(String(source.slug||'article').slice(0,155)+'-copy-'+Date.now().toString(36)).slice(0,180),
        body:source.body,summary:source.summary||String(source.title||'Article'),
        subtitle:source.subtitle||'',publicByline:source.publicByline||'',
        editorialType:source.editorialType||'news',primaryCategory:asId(source.primaryCategory),
        secondaryCategories:(source.secondaryCategories||[]).map(asId).filter(Boolean),
        locations:(source.locations||[]).map(asId).filter(Boolean),
        tags:(source.tags||[]).map(asId).filter(Boolean),
        featuredImage:asId(source.featuredImage),author:asId(staffId),
        metaTitle:source.metaTitle||'',metaDescription:source.metaDescription||'',
        sourceLinks:(source.sourceLinks||[]).map((x:{label?:string;url?:string})=>({label:x.label||'',url:x.url||''})),
        correctionNotice:source.correctionNotice||'',
        legacyHtml:source.legacyHtml||'',legacyFeaturedImageUrl:source.legacyFeaturedImageUrl||'',
        legacyFeaturedImageAlt:source.legacyFeaturedImageAlt||'',
        workflowStatus:'draft',_status:'draft'
      };
      const response=await jsonFetch('/api/articles?draft=true',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const newId=response.doc?.id||response.id;
      if(!newId)throw new Error('The article copy could not be opened.');
      setSelectedArticles(new Set());setPage(1);setFilter('all');setSearch('');
      await loadArticles(1,'','all');
      await openArticle(newId);
      setMessage('Draft copy created. Review it before publishing.');
    }catch(e){setError(e instanceof Error?e.message:'Could not duplicate this article.');}
    finally{setBusy(false);}
  };
  const deleteArticles=async(items:Article[])=>{
    if(!canDelete||busy||!items.length)return;
    setArticleMenu(null);
    const label=items.length===1?'“'+titleOf(items[0])+'”':items.length+' selected articles';
    if(!window.confirm('Permanently delete '+label+'? This cannot be undone.'))return;
    setBusy(true);setError('');setMessage('');
    let completed=0;
    try{
      for(const article of items){
        await jsonFetch('/api/articles/'+encodeURIComponent(String(article.id)),{method:'DELETE'});
        completed+=1;
      }
      setMessage(completed===1?'Article deleted.':completed+' articles deleted.');
    }catch(e){setError((e instanceof Error?e.message:'Could not delete the article.')+(completed?' '+completed+' already deleted.':''));}
    finally{
      setSelectedArticles(new Set());
      try{await loadArticles(page,search,filter);}catch{setError('Changes were made, but the article list could not refresh.');}
      setBusy(false);
    }
  };

  const newAd = () => {
    setAdEditingId(null);
    setAdStatus('scheduled');
    setAdForm({name:'',destinationUrl:'',startsAt:'',endsAt:'',banner:''});
    setError(''); setAdEditor(true);
  };
  const toLocalInput = (input?:string) => {
    if(!input)return '';
    const date = new Date(input);
    if(Number.isNaN(date.getTime()))return '';
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  };
  const editAd = (ad:Ad) => {
    setAdEditingId(String(ad.id));
    setAdStatus(ad.status==='paused'?'paused':'scheduled');
    setAdForm({
      name:ad.name||'', destinationUrl:ad.destinationUrl||'',
      startsAt:toLocalInput(ad.startsAt), endsAt:toLocalInput(ad.endsAt),
      banner:normalizeId(ad.banner),
    });
    setError(''); setAdEditor(true);
  };
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
      await jsonFetch(adEditingId?'/api/ad-banners/'+encodeURIComponent(adEditingId):'/api/ad-banners',{method:adEditingId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:adForm.name.trim(),banner:/^\d+$/.test(adForm.banner)?Number(adForm.banner):adForm.banner,
        destinationUrl:destination.toString(),startsAt:new Date(adForm.startsAt).toISOString(),endsAt:new Date(adForm.endsAt).toISOString(),
        status:adStatus,placement:'homepage'
      })});
      await loadAds();setAdEditor(false);setAdEditingId(null);setAdForm({name:'',destinationUrl:'',startsAt:'',endsAt:'',banner:''});
      setMessage('Banner saved. Your schedule and status changes are now active.');
    } catch(e) {setError(e instanceof Error?e.message:'Could not save the banner.');}
    finally {setBusy(false);}
  };

  const articleCard=(a:Article,manageable=false)=>{
    const id=String(a.id),selected=selectedArticles.has(id);
    return <div key={id} className={'ogas-story-item'+(selected?' is-selected':'')}>
      {manageable&&<label className="ogas-story-select" aria-label={'Select '+titleOf(a)}>
        <input type="checkbox" checked={selected} disabled={busy} onChange={e=>toggleArticle(id,e.target.checked)}/>
      </label>}
      <button type="button" className="ogas-story-row" onClick={()=>void openArticle(a.id)} aria-label={'Open '+titleOf(a)}>
        <span className="ogas-story-cover"><ArticleImage url={cover(a)} missingText="Photo missing"/></span>
        <span className="ogas-story-copy"><strong>{titleOf(a)}</strong><small>{categoryName(a.primaryCategory)} <span aria-hidden="true">·</span> {shortDate(a.updatedAt)}</small></span>
        <span className={'ogas-status ogas-status--'+statusOf(a)}>{statusName(a)}</span>
        <ArrowUpRight className="ogas-row-arrow" {...iconSize(17)}/>
      </button>
      {manageable&&<div className="ogas-article-menu-area">
        <button type="button" className="ogas-row-menu-trigger" disabled={busy} aria-label={'Actions for '+titleOf(a)}
          aria-haspopup="menu" aria-expanded={articleMenu===id} onClick={()=>setArticleMenu(articleMenu===id?null:id)}>
          <MoreHorizontal size={20}/>
        </button>
        {articleMenu===id&&<div className="ogas-article-menu" role="menu" onKeyDown={e=>{if(e.key==='Escape')setArticleMenu(null)}}>
          <button type="button" role="menuitem" onClick={()=>{setArticleMenu(null);void openArticle(a.id)}}><FilePenLine size={17}/> Edit article</button>
          {canWrite&&<button type="button" role="menuitem" onClick={()=>void duplicateArticle(a)}><Copy size={17}/> Duplicate as draft</button>}
          {canDelete&&<button type="button" role="menuitem" className="ogas-danger-action" onClick={()=>void deleteArticles([a])}><Trash2 size={17}/> Delete article</button>}
        </div>}
      </div>}
    </div>;
  };

  return <div className="ogas-app">
    <aside className="ogas-sidebar" aria-label="Newsroom navigation">
      <a href="/studio" className="ogas-brand" aria-label="OgasTV Studio home"><span className="ogas-brand-mark"><Radio {...iconSize(20)}/></span><span>ogas<span className="ogas-brand-strong">tv</span><small>studio</small></span></a>
      <div className="ogas-nav-label">YOUR WORKSPACE</div>
      <nav className="ogas-nav">
        {topNav.filter(x=>(canAds || x.key!=='ads') && x.key!=='advanced').map(x=>{
          const Icon=icons[x.key];return <button key={x.key} type="button" className={'ogas-nav-link'+(tab===x.key?' active':'')} onClick={()=>x.key==='write'?resumeWriting():navigate(x.key)} aria-current={tab===x.key?'page':undefined}><Icon {...iconSize(20)}/><span>{x.label==='Write'?'Write an article':x.label==='Articles'?'Your articles':x.label}</span>{x.key==='write'&&<Plus size={15} strokeWidth={2.2}/>}</button>;
        })}
        <div className="ogas-nav-label ogas-nav-label--more">MORE</div>
        <button type="button" className={'ogas-nav-link'+(tab==='advanced'?' active':'')} onClick={()=>navigate('advanced')}>
          <Settings2 size={20}/> <span>Advanced settings</span>
        </button>
        {role==='administrator'&&<a className="ogas-nav-link" href="/studio/manage?tab=team"><UsersRound size={20}/><span>Team &amp; access</span></a>}
      </nav>
      <div className="ogas-side-bottom"><div className="ogas-side-note"><ShieldCheck {...iconSize(19)}/><div><strong>Your work is private</strong><p>Only the OgasTV team can use this space.</p></div></div>
      <div className="ogas-profile"><span className="ogas-avatar">{firstName.slice(0,2).toUpperCase()}</span><span><strong>{name}</strong><small>{roleText}</small></span><a href="/studio/account" aria-label="Account settings"><Settings2 size={17}/></a></div></div>
    </aside>

    <div className="ogas-workspace">
      <header className="ogas-topbar">
        <div className="ogas-breadcrumb"><span>Newsroom</span><ChevronRight size={15}/><strong>{tab==='home'?'Home':tab==='articles'?'Your articles':tab==='write'?'Write an article':tab==='media'?'Media library':tab==='live'?'Go live':tab==='advanced'?'Advanced settings':'Advertisements'}</strong></div>
        <div className="ogas-top-actions"><span className="ogas-systems"><span/> Signed in securely</span><a className="ogas-top-website" href="/" target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={15}/></a><span className="ogas-avatar ogas-avatar--top">{firstName.slice(0,2).toUpperCase()}</span></div>
      </header>

      <main className="ogas-main">
        {error && <div role="alert" className="ogas-alert ogas-alert--error"><CircleHelp {...iconSize(18)}/><span>{error}</span><button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={17}/></button></div>}
        {message && <div role="status" className="ogas-alert ogas-alert--success"><CheckCircle2 {...iconSize(18)}/><span>{message}</span><button type="button" onClick={()=>setMessage('')} aria-label="Dismiss message"><X size={17}/></button></div>}

        {tab==='home'&&<>
          <section className="ogas-heading"><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR WORKSPACE</span><h1>Welcome back, {firstName}.</h1><p>What would you like to work on today?</p></section>
          <div className="ogas-action-grid">
            {canWrite&&<button type="button" className="ogas-feature-action ogas-feature-action--red" onClick={resumeWriting}><span className="ogas-feature-icon"><PencilLine {...iconSize(22)}/></span><span className="ogas-feature-decor" aria-hidden="true"><Newspaper size={78} strokeWidth={0.7}/></span><span className="ogas-feature-bottom"><span><strong>Write an article</strong><small>Pick up where you left off.</small></span><span className="ogas-action-arrow"><ArrowUpRight size={18}/></span></span></button>}
            <button type="button" className="ogas-feature-action ogas-feature-action--green" onClick={()=>navigate('live')}><span className="ogas-feature-icon"><Radio {...iconSize(22)}/></span><span className="ogas-feature-decor ogas-feature-decor--signal" aria-hidden="true"><Radio size={97} strokeWidth={0.7}/></span><span className="ogas-feature-bottom"><span><strong>Go live</strong><small>Start broadcasting in a few taps.</small></span><span className="ogas-action-arrow"><ArrowUpRight size={18}/></span></span></button>
          </div>
          <div className="ogas-mini-stats"><span><strong>{total}</strong> Articles found</span><span><strong>{articles.filter(a=>a._status==='published').length}</strong> Published in this view</span><span><strong>{articles.filter(a=>a._status!=='published').length}</strong> Unpublished in this view</span></div>
          <div className="ogas-home-columns"><section className="ogas-recent"><div className="ogas-section-heading"><div><h2>Pick up where you left off</h2><p>Recently updated articles from the newsroom.</p></div><button type="button" className="ogas-text-link" onClick={()=>navigate('articles')}>See all articles <ArrowRight size={16}/></button></div><div className="ogas-story-list">{loading?<p className="ogas-empty-small">Loading your articles…</p>:filteredRecent.length?filteredRecent.map(a=>articleCard(a)):<div className="ogas-empty"><BookOpen size={26}/><h3>Your first article starts here</h3><p>Write something new, then come back to find it here.</p>{canWrite&&<button className="ogas-button ogas-button--red" onClick={begin}>Write an article</button>}</div>}</div></section>
          <aside className="ogas-at-glance"><h2>At a glance</h2><p>Shortcuts to what needs attention.</p><button onClick={()=>{changeFilter('review');navigate('articles');}}><span className="ogas-glance-icon"><Clock3 {...iconSize(19)}/></span><span><strong>Waiting for review</strong><small>Find articles sent to an editor</small></span><ArrowRight size={18}/></button><button onClick={()=>navigate('media')}><span className="ogas-glance-icon ogas-glance-icon--green"><ImageIcon {...iconSize(19)}/></span><span><strong>Media library</strong><small>Browse and upload photos</small></span><ArrowRight size={18}/></button>{canAds&&<button onClick={()=>navigate('ads')}><span className="ogas-glance-icon"><LayoutGrid {...iconSize(19)}/></span><span><strong>Advertisements</strong><small>Manage website banners</small></span><ArrowRight size={18}/></button>}</aside></div>
        </>}

        {tab==='articles'&&<>
          <section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> CONTENT LIBRARY</span><h1>Your articles</h1><p>Find, update and publish articles, all in one place.</p></div>{canWrite&&<button className="ogas-button ogas-button--red" onClick={begin}><Plus {...iconSize(18)}/> New article</button>}</section>
          <div className="ogas-library-tools"><label className="ogas-search"><Search size={19}/><input type="search" value={search} onChange={e=>changeSearch(e.target.value)} placeholder="Search articles by headline" aria-label="Search articles by headline"/></label><div role="group" aria-label="Article status" className="ogas-segmented">{[{key:'all',label:'All'},{key:'published',label:'Published'},{key:'draft',label:'Drafts'},{key:'review',label:'In review'}].map(x=><button key={x.key} type="button" className={filter===x.key?'selected':''} onClick={()=>changeFilter(x.key)}>{x.label}</button>)}</div></div>
          {articles.length>0&&<div className="ogas-selection-toolbar">
            <label><input type="checkbox" disabled={busy} checked={visibleIds.length>0&&selectedOnPage.length===visibleIds.length}
              onChange={e=>toggleAllArticles(e.target.checked)}/> Select all on this page</label>
            {selectedOnPage.length>0&&<div className="ogas-selection-actions">
              <span>{selectedOnPage.length} selected</span>
              <button type="button" onClick={()=>setSelectedArticles(new Set())}>Clear</button>
              {canDelete&&<button type="button" className="ogas-danger-action" disabled={busy}
                onClick={()=>void deleteArticles(articles.filter(a=>selectedArticles.has(String(a.id))))}><Trash2 size={16}/> Delete selected</button>}
            </div>}
          </div>}
          <div className="ogas-story-list ogas-story-list--large">{loading?<p className="ogas-empty-small">Finding articles…</p>:articles.length?articles.map(a=>articleCard(a,true)):<div className="ogas-empty"><Search size={28}/><h3>No articles found</h3><p>Try another headline or choose a different filter.</p><button onClick={()=>{changeSearch('');changeFilter('all');}}>Clear search</button></div>}</div>
          <div className="ogas-pagination"><span>{total?('Showing '+Math.min((page-1)*pageSize+1,total)+'–'+Math.min(page*pageSize,total)+' of '+total+' articles'):'No articles'}</span><div><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Previous page"><ChevronLeft size={18}/></button><span>Page {page}</span><button disabled={page*pageSize>=total} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={18}/></button></div></div>
        </>}

        {tab==='write'&&<>
          <section className="ogas-heading ogas-heading--split ogas-write-heading"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR WRITING DESK</span><h1>{editor.id?'Edit article':'Write an article'}</h1><p>Write your article and save it when you're ready.</p></div><div className="ogas-editor-actions"><button className="ogas-button ogas-button--outline" onClick={()=>setPreview(true)}><ExternalLink size={16}/> Preview</button><button className="ogas-button ogas-button--outline" disabled={busy} onClick={()=>void saveArticle('draft')}><Check size={17}/> {editor.published?'Save changes':'Save draft'}</button>{!editor.published&&<button className="ogas-button ogas-button--red" disabled={busy} onClick={()=>void saveArticle(canPublish?'publish':'review')}>{busy?'Saving…':canPublish?'Publish':'Send for review'} <ArrowRight size={16}/></button>}</div></section>
          <div className="ogas-editor-grid">
            <section className="ogas-writing-surface"><span className="ogas-doc-state"><span className="ogas-doc-dot"/> {editor.published?'Published':'Draft'} <span>·</span> Write in your own words</span>
              <input aria-label="Article headline" className="ogas-headline-input" maxLength={250} placeholder="Give your article a headline…" value={editor.title} onChange={e=>setEditor(s=>({...s,title:e.target.value}))} disabled={busy||editor.published&&!canPublish}/>
              <div className="ogas-byline"><span className="ogas-avatar">{firstName.slice(0,2).toUpperCase()}</span> {name} <span>·</span> {shortDate(new Date().toISOString())}</div>
              <div className="ogas-writing-divider"/>
              {editor.lockedBody?
                <div className="ogas-locked-editor"><ShieldCheck size={24}/><h3>This article includes special content</h3><p>Its original formatting has been protected. You can update the headline, image and settings here while support for this content type is added.</p><div className="ogas-body-readonly">{editor.bodyText}</div></div>:
                <StudioRichEditor
                  key={editor.id||'new-article'}
                  value={editor.body as any}
                  disabled={busy||(editor.published&&!canPublish)}
                  onChange={(body,text)=>setEditor(current=>{
                    if(current.lockedBody)return current;
                    if(JSON.stringify(current.body)===JSON.stringify(body))return current;
                    return {...current,body,bodyText:text,touchedBody:true};
                  })}
                />}
              <div className="ogas-editor-footnote"><CheckCircle2 size={15}/> {autoSaveState==='saving'?'Saving changes…':autoSaveState==='saved'?'All changes saved':autoSaveState==='error'?'Could not save changes':'Save your draft whenever you need a break.'}</div>
            </section>
            <aside className="ogas-editor-side"><section className="ogas-editor-panel"><h3>Featured image <span>Optional</span></h3>{chosenImage? <button type="button" className="ogas-chosen-cover" onClick={()=>setPicker(true)}><ArticleImage url={mediaUrl(chosenImage)} alt={chosenImage.alt||'Featured article photo'} missingText="Photo unavailable — choose another"/><span>Change image</span></button>:<button type="button" className="ogas-cover-upload" onClick={()=>setPicker(true)}><ImagePlus size={25}/><strong>Choose or upload a photo</strong><small>JPG, PNG, WebP or AVIF</small></button>}{editor.featuredImage&&<button className="ogas-remove-cover" onClick={()=>changeFeaturedImage('')}>Remove featured image</button>}</section>
              <section className="ogas-editor-panel">
                <h3>Article details</h3>
                <label className="ogas-input-label" htmlFor="ogas-primary-category">Primary category <span>Required</span></label>
                <select id="ogas-primary-category" className="ogas-field" value={editor.primaryCategory} onChange={e=>setEditor(current=>({
                  ...current, primaryCategory:e.target.value,
                  secondaryCategories:current.secondaryCategories.filter(id=>id!==e.target.value),
                }))}>
                  <option value="">Choose a category</option>
                  {categories.map(c=><option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
                </select>
                <fieldset style={{border:0,margin:'16px 0',padding:0}}>
                  <legend className="ogas-input-label">Additional categories <span>Optional</span></legend>
                  <p className="ogas-helper">Published articles appear automatically in every category you choose.</p>
                  <div style={{display:'grid',gap:8,maxHeight:190,overflowY:'auto',marginTop:10}}>
                    {categories.filter(c=>String(c.id)!==editor.primaryCategory).map(c=>(
                      <label key={String(c.id)} style={{display:'flex',alignItems:'center',gap:9,fontSize:13,cursor:'pointer'}}>
                        <input type="checkbox" value={String(c.id)} checked={editor.secondaryCategories.includes(String(c.id))}
                          onChange={e=>setEditor(current=>({...current,
                            secondaryCategories:e.target.checked
                              ? [...current.secondaryCategories.filter(id=>id!==String(c.id)),String(c.id)]
                              : current.secondaryCategories.filter(id=>id!==String(c.id)),
                          }))}/>
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset style={{border:0,margin:'16px 0',padding:0}}>
                  <legend className="ogas-input-label">Location / Lagos council <span>Optional</span></legend>
                  <p className="ogas-helper">Tag areas covered by this story. These selections power Lagos Watch council filters.</p>
                  <div style={{display:'grid',gap:8,maxHeight:165,overflowY:'auto',marginTop:10}}>
                    {locations.slice().sort((a,b)=>{
                      const priority=(name:string)=>name==='Kosofe'?0:name==='Ikorodu'?1:2;
                      return priority(a.name)-priority(b.name)||a.name.localeCompare(b.name);
                    }).map(place=>(
                      <label key={String(place.id)} style={{display:'flex',alignItems:'center',gap:9,fontSize:13,cursor:'pointer'}}>
                        <input type="checkbox" value={String(place.id)} checked={editor.locations.includes(String(place.id))}
                          onChange={event=>setEditor(current=>({...current,
                            locations:event.target.checked?
                              [...current.locations.filter(id=>id!==String(place.id)),String(place.id)]:
                              current.locations.filter(id=>id!==String(place.id)),
                          }))}/>
                        <span>{place.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="ogas-input-label">Short introduction <span>Optional</span></label>
                <textarea className="ogas-field" rows={4} value={editor.summary} onChange={e=>setEditor(current=>({...current,summary:e.target.value}))} placeholder="A brief introduction for readers."/>
                <p className="ogas-helper">If you leave this blank, we'll use the opening of your article.</p>
              </section>
              <details className="ogas-editor-panel ogas-more-options ogas-story-advanced">
                <summary><Settings2 size={17}/> More options <ChevronDown size={16}/></summary>
                <div className="ogas-story-advanced__fields">
                  <label>Supporting headline <span>Optional</span>
                    <input value={editor.subtitle} onChange={e=>setEditor(s=>({...s,subtitle:e.target.value}))} placeholder="A short supporting line"/>
                  </label>
                  <label>Public author name <span>Optional</span>
                    <input value={editor.publicByline} onChange={e=>setEditor(s=>({...s,publicByline:e.target.value}))} placeholder="Name readers will see"/>
                  </label>
                  <label>Type of article
                    <select value={editor.editorialType} onChange={e=>setEditor(s=>({...s,editorialType:e.target.value}))}>
                      <option value="news">News</option><option value="analysis">Analysis</option>
                      <option value="explainer">Explainer</option><option value="opinion">Opinion</option>
                      <option value="interview">Interview</option><option value="sponsored">Sponsored</option>
                    </select>
                  </label>
                  
                  <label>Topics
                    <select multiple value={editor.tags} onChange={e=>setEditor(s=>({...s,tags:Array.from(e.target.selectedOptions,v=>v.value)}))}>
                      {tags.map(c=><option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </label>
                  <label>Search headline <span>Optional</span>
                    <input maxLength={180} value={editor.metaTitle} onChange={e=>setEditor(s=>({...s,metaTitle:e.target.value}))} placeholder="Title for search results"/>
                  </label>
                  <label>Search description <span>Optional</span>
                    <textarea maxLength={320} rows={3} value={editor.metaDescription} onChange={e=>setEditor(s=>({...s,metaDescription:e.target.value}))} placeholder="A brief description for search"/>
                  </label>
                  <label>Correction note <span>Optional</span>
                    <textarea rows={3} value={editor.correctionNotice} onChange={e=>setEditor(s=>({...s,correctionNotice:e.target.value}))}/>
                  </label>
                  <div className="ogas-source-links"><strong>Sources and references</strong>
                    {editor.sourceLinks.map((entry,i)=><div key={i} className="ogas-source-link">
                      <input aria-label={'Source name '+(i+1)} value={entry.label} placeholder="Source name" onChange={e=>setEditor(s=>({...s,sourceLinks:s.sourceLinks.map((x,j)=>j===i?{...x,label:e.target.value}:x)}))}/>
                      <input aria-label={'Source URL '+(i+1)} type="url" value={entry.url} placeholder="https://example.com" onChange={e=>setEditor(s=>({...s,sourceLinks:s.sourceLinks.map((x,j)=>j===i?{...x,url:e.target.value}:x)}))}/>
                      <button type="button" aria-label={'Remove source '+(i+1)} onClick={()=>setEditor(s=>({...s,sourceLinks:s.sourceLinks.filter((_,j)=>j!==i)}))}><X size={16}/></button>
                    </div>)}
                    <button type="button" className="ogas-add-source" onClick={()=>setEditor(s=>({...s,sourceLinks:[...s.sourceLinks,{label:'',url:''}]}))}><Plus size={15}/> Add source</button>
                  </div>
                </div>
              </details>
            </aside>
          </div>
        </>}

        {tab==='advanced'&&<StudioAdvanced role={role} onTaxonomyChanged={()=>void loadTaxonomy()}/>}

        {tab==='media'&&<>
          <section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> YOUR MEDIA LIBRARY</span><h1>Media library</h1><p>Keep photos together so you can use them again.</p></div>{canUpload&&<button className="ogas-button ogas-button--red" onClick={()=>document.getElementById('ogas-media-file')?.click()}><UploadCloud size={18}/> Upload a photo</button>}</section>
          {canUpload&&<div className="ogas-upload-panel"><label htmlFor="ogas-media-file" className="ogas-upload-area">{uploadPreviewUrl?<img className="ogas-upload-preview" src={uploadPreviewUrl} alt="Selected image preview, not yet uploaded" />:<ImagePlus size={28}/>}<strong>{uploadFile?uploadFile.name:'Choose a photo to upload'}</strong><span>{uploadFile?'Preview · not uploaded yet':'JPG, PNG, WebP or AVIF · up to 12 MB'}</span></label><input id="ogas-media-file" className="ogas-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/>{uploadFile&&<div className="ogas-upload-details"><label>Image description <span>Optional</span><input value={fileDescription} onChange={e=>setFileDescription(e.target.value)} placeholder="Describe this photo for readers who can't see it"/></label><button className="ogas-button ogas-button--green" disabled={busy} onClick={()=>void upload()}>{busy?(uploadStage==='optimizing'?'Optimizing…':uploadStage==='processing'?'Processing…':uploadStage==='uploading'?'Uploading '+uploadProgress+'%':'Please wait…'):'Upload photo'} <ArrowRight size={16}/></button>{busy&&uploadStage!=='idle'&&<div role="status" aria-live="polite" style={{width:'100%',marginTop:10}}>
  <div style={{height:5,background:'#e8e8e8',borderRadius:999,overflow:'hidden'}}>
    <div style={{height:'100%',background:'#237750',width:(uploadStage==='optimizing'?5:uploadStage==='processing'?99:uploadProgress)+'%',transition:'width .2s ease'}}/>
  </div>
  <small>{uploadStage==='optimizing'?'Preparing your image for faster upload…':uploadStage==='processing'?'Upload received. Saving the image…':'Uploading image · '+uploadProgress+'%'}</small>
</div>}</div>}</div>}
          <div className="ogas-section-heading ogas-section-heading--spaced"><div><h2>Your photos</h2><p>{media.length} recent uploads</p></div><button type="button" className="ogas-text-link" onClick={()=>void loadMedia()}>Refresh <ArrowRight size={16}/></button></div>
          {media.length?<div className="ogas-photo-grid">{media.map(m=><article key={String(m.id)} className="ogas-photo-card"><div className="ogas-photo-visual">{mediaUrl(m)?<ArticleImage url={mediaUrl(m)} alt={m.alt||''} missingText="Photo unavailable"/>:<ImageIcon size={30}/>}</div><div className="ogas-photo-copy"><strong title={m.alt||m.filename||'Untitled photo'}>{m.alt||m.filename||'Untitled photo'}</strong><small title={m.filename||''}>{m.filename||'Uploaded image'}</small>{canDeleteMedia&&<button type="button" className="ogas-media-delete" disabled={busy} onClick={()=>void deleteMediaItem(m)} aria-label={'Delete '+(m.alt||m.filename||'image')}><Trash2 size={15}/> Delete image</button>}</div></article>)}</div>:<div className="ogas-empty"><ImageIcon size={28}/><h3>No photos yet</h3><p>Upload a photo to start your media library.</p></div>}
        </>}

        {tab==='live'&&<>
          <section className="ogas-heading"><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> BROADCAST STUDIO</span><h1>Ready to go live?</h1><p>Start broadcasting using the studio you already know.</p></section>
          <div className="ogas-broadcast-grid"><div className="ogas-live-stage"><div className="ogas-live-icon"><Radio size={58} strokeWidth={1.4}/></div><span className="ogas-live-label">OGASTV NIGERIA · LIVE STUDIO</span><div className="ogas-live-rings" aria-hidden="true"/></div><div className="ogas-live-control"><span className="ogas-eyebrow">BROADCAST SETUP</span><h2>You're almost there.</h2><p>The camera, microphone and Go Live controls are waiting in the broadcast studio.</p><div className="ogas-live-check"><CheckCircle2 size={19}/><span>Your existing broadcast workflow is unchanged.</span></div><a className="ogas-button ogas-button--red" href="/broadcast-studio">Open broadcast studio <ArrowUpRight size={17}/></a></div></div>
        </>}

        {tab==='ads'&&(canAds?<><section className="ogas-heading ogas-heading--split"><div><span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> GROW YOUR NEWSROOM</span><h1>Advertisements</h1><p>Add a banner and the website it should open when someone clicks.</p></div><button className="ogas-button ogas-button--red" onClick={newAd}><Plus size={18}/> New banner</button></section>
          <div className="ogas-mini-stats ogas-ad-stats"><span><strong>{ads.length}</strong> Recent campaigns</span><span><strong>{ads.filter(a=>a.status==='scheduled').length}</strong> Scheduled</span><span><strong>{ads.filter(a=>a.status==='paused').length}</strong> Paused</span></div>
          <div className="ogas-section-heading"><div><h2>Your banners</h2><p>Only one homepage banner can run per day.</p></div></div>
          {ads.length?<div className="ogas-ad-list">{ads.map(ad=><div className="ogas-ad-row" key={String(ad.id)}><div className="ogas-ad-thumb">{mediaUrl(ad.banner)?<ArticleImage url={mediaUrl(ad.banner)} alt="" missingText="Banner unavailable"/>:<LayoutGrid size={23}/>}</div><div><strong>{ad.name||'Untitled banner'}</strong><small>{shortDate(ad.startsAt)} – {shortDate(ad.endsAt)} · {ad.status||'Draft'}</small></div><button type="button" onClick={()=>editAd(ad)} className="ogas-text-link">Manage <ArrowUpRight size={16}/></button></div>)}</div>:<div className="ogas-empty"><LayoutGrid size={28}/><h3>Your first banner goes here</h3><p>Upload an advertiser's image, add their link and schedule it.</p><button className="ogas-button ogas-button--red" onClick={newAd}>Create a banner</button></div>}
          <p className="ogas-ad-note"><ShieldCheck size={17}/> Advertisements are labeled on the website. Only authorised staff can schedule them.</p>
        </>:<div className="ogas-empty"><ShieldCheck size={28}/><h3>Advertising access required</h3><p>Ask an administrator if you need to manage banners.</p></div>)}
      </main>
    </div>

    <nav className="ogas-mobile-nav" aria-label="Mobile newsroom navigation">{topNav.slice(0,4).map(x=>{const Icon=icons[x.key];return <button key={x.key} className={tab===x.key?'active':''} onClick={()=>x.key==='write'?resumeWriting():navigate(x.key)}><Icon size={19} strokeWidth={2.1}/><span>{x.label}</span></button>;})}<button onClick={()=>setMore(s=>!s)} className={['media','ads','advanced'].includes(tab)?'active':''}><Menu size={19}/><span>More</span></button></nav>
    {more&&<div className="ogas-mobile-more"><button onClick={()=>navigate('media')}><ImageIcon size={18}/> Media library</button>{canAds&&<button onClick={()=>navigate('ads')}><LayoutGrid size={18}/> Advertisements</button>}<button onClick={()=>navigate('advanced')}><Settings2 size={18}/> Advanced settings</button>{role==='administrator'&&<a href="/studio/manage?tab=team"><UsersRound size={18}/> Team &amp; access</a>}<a href="/studio/account">Account & password</a><a href="/"><ExternalLink size={18}/> View website</a></div>}

    {picker&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setPicker(false);}}><div className="ogas-modal" role="dialog" aria-modal="true" aria-label="Choose an article photo"><header><div><h2>Choose a photo</h2><p>Select an existing image or upload a new one.</p></div><button onClick={()=>setPicker(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-picker-grid">{media.map(m=><button key={String(m.id)} onClick={()=>changeFeaturedImage(String(m.id))}>{mediaUrl(m)?<ArticleImage url={mediaUrl(m)} alt={m.alt||m.filename||'Photo'} missingText="Photo unavailable"/>:<ImageIcon size={28}/>}<span>{m.alt||m.filename||'Photo'}</span></button>)}</div><div className="ogas-picker-upload"><label className="ogas-input-label">Upload a new photo</label><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/>{uploadPreviewUrl&&<div className="ogas-picker-selected"><img src={uploadPreviewUrl} alt="Selected image preview, not yet uploaded"/><span>{uploadFile?.name}<small>Ready to upload</small></span></div>}<input placeholder="Image description (optional)" value={fileDescription} onChange={e=>setFileDescription(e.target.value)}/><button className="ogas-button ogas-button--red" disabled={!uploadFile||busy} onClick={()=>void upload()}>{busy?(uploadStage==='optimizing'?'Optimizing…':uploadStage==='processing'?'Processing…':uploadStage==='uploading'?'Uploading '+uploadProgress+'%':'Please wait…'):'Upload and use'} <ArrowRight size={16}/></button>{busy&&uploadStage!=='idle'&&<div role="status" aria-live="polite" style={{width:'100%',marginTop:10}}>
  <div style={{height:5,background:'#e8e8e8',borderRadius:999,overflow:'hidden'}}>
    <div style={{height:'100%',background:'#237750',width:(uploadStage==='optimizing'?5:uploadStage==='processing'?99:uploadProgress)+'%',transition:'width .2s ease'}}/>
  </div>
  <small>{uploadStage==='optimizing'?'Preparing your image for faster upload…':uploadStage==='processing'?'Upload received. Saving the image…':'Uploading image · '+uploadProgress+'%'}</small>
</div>}</div></div></div>}

    {preview&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setPreview(false);}}><div className="ogas-modal ogas-preview-modal" role="dialog" aria-modal="true" aria-label="Article preview"><header><div><h2>Article preview</h2><p>This preview is only visible to you.</p></div><button onClick={()=>setPreview(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-preview-article"><span className="ogas-eyebrow">{categories.find(c=>String(c.id)===editor.primaryCategory)?.name||'NEWSROOM'}</span><h1>{editor.title||'Your headline goes here'}</h1>{chosenImage&&<ArticleImage url={mediaUrl(chosenImage)} alt={chosenImage.alt||''} missingText="Photo unavailable"/>}<p className="ogas-preview-summary">{editor.summary||editor.bodyText.slice(0,230)}</p><div className="ogas-preview-body">{editor.bodyText||'Start writing to see your article here.'}</div></div></div></div>}

    {adEditor&&<div className="ogas-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setAdEditor(false);}}><div className="ogas-modal ogas-ad-modal" role="dialog" aria-modal="true" aria-label={adEditingId?'Edit banner':'Schedule a banner'}><header><div><h2>{adEditingId?'Edit banner':'Schedule a banner'}</h2><p>Choose a photo, destination link and running dates.</p></div><button onClick={()=>setAdEditor(false)} aria-label="Close"><X size={21}/></button></header><div className="ogas-ad-form"><label>Campaign name<input value={adForm.name} onChange={e=>setAdForm(s=>({...s,name:e.target.value}))} placeholder="e.g. December partner banner"/></label><label>Banner image<select value={adForm.banner} onChange={e=>setAdForm(s=>({...s,banner:e.target.value}))}><option value="">Choose an uploaded image</option>{adForm.banner&&!media.some(m=>String(m.id)===adForm.banner)&&<option value={adForm.banner}>Current banner image</option>}{media.map(m=><option key={String(m.id)} value={String(m.id)}>{m.alt||m.filename||'Photo '+m.id}</option>)}</select><button type="button" className="ogas-text-link" style={{marginTop:10}} onClick={()=>{setAdEditor(false);navigate("media");}}>Need to upload a banner? Open Media library <ArrowRight size={14}/></button></label><label>Website link<input type="url" placeholder="https://advertiser.com" value={adForm.destinationUrl} onChange={e=>setAdForm(s=>({...s,destinationUrl:e.target.value}))}/></label><div className="ogas-ad-dates"><label>Start date<input type="datetime-local" value={adForm.startsAt} onChange={e=>setAdForm(s=>({...s,startsAt:e.target.value}))}/></label><label>End date<input type="datetime-local" value={adForm.endsAt} onChange={e=>setAdForm(s=>({...s,endsAt:e.target.value}))}/></label></div><p>Times are based on your device's time zone. Your banner will appear on the homepage during these dates.</p><label>Campaign status
                  <select value={adStatus} onChange={e=>setAdStatus(e.target.value==='paused'?'paused':'scheduled')}>
                    <option value="scheduled">Scheduled</option><option value="paused">Paused</option>
                  </select>
                </label>
                <button className="ogas-button ogas-button--red" disabled={busy} onClick={()=>void submitAd()}>{busy?'Saving…':adEditingId?'Save banner changes':'Schedule banner'} <ArrowRight size={16}/></button></div></div></div>}
  </div>;
}
