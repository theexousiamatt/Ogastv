'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, FolderOpen, MapPin, Plus, Search, Tags, X } from 'lucide-react';

type Kind = 'categories'|'locations'|'tags';
type Entry = {
  id: string | number;
  name?: string;
  slug?: string;
  description?: string;
  state?: string;
  kind?: string;
  parent?: string | number | Entry | null;
};
type Form = {name:string;slug:string;description:string;state:string;kind:string;parent:string};
type Props = { role:string; onTaxonomyChanged?:()=>void };
const fields: {key:Kind;title:string;description:string;icon:typeof Tags}[]=[
  {key:'categories',title:'Sections',description:'Where your articles appear on the website',icon:FolderOpen},
  {key:'locations',title:'Locations',description:'Places mentioned in your reporting',icon:MapPin},
  {key:'tags',title:'Topics',description:'Subjects that connect related articles',icon:Tags},
];
function slugify(name:string){return name.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,150);}
const blank:Form={name:'',slug:'',description:'',state:'Lagos',kind:'lga',parent:''};
function readableError(response:any):string{
  return response?.errors?.[0]?.message || response?.message || 'Something went wrong. Please try again.';
}
async function fetchCollection(kind:Kind) {
  const response=await fetch('/api/'+kind+'?limit=100&depth=0&sort=name',{credentials:'include',cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(readableError(data));
  return (data.docs || []) as Entry[];
}
function toId(input:unknown):string {
  if(!input)return '';
  if(typeof input==='object' && input!==null && 'id' in input) return String((input as Entry).id);
  return String(input);
}

export function StudioAdvanced({role,onTaxonomyChanged}:Props){
  const editable=['administrator','editor_in_chief','editor'].includes(role);
  const [active,setActive]=useState<Kind>('categories');
  const [collections,setCollections]=useState<Record<Kind,Entry[]>>({categories:[],locations:[],tags:[]});
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<Entry|null>(null);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState<Form>(blank);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [manualSlug,setManualSlug]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [categories,locations,tags]=await Promise.all([
        fetchCollection('categories'),fetchCollection('locations'),fetchCollection('tags'),
      ]);
      setCollections({categories,locations,tags});
    }catch(e){setError(e instanceof Error?e.message:'Could not load settings.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  const visible=useMemo(()=>collections[active].filter(v=>(v.name||'').toLowerCase().includes(search.trim().toLowerCase())),[active,search,collections]);
  const openNew=()=>{
    setSelected(null);setForm(blank);setManualSlug(false);
    setError('');setSuccess('');setEditing(true);
  };
  const openEdit=(item:Entry)=>{
    setSelected(item);
    setForm({
      name:item.name||'',slug:item.slug||'',description:item.description||'',
      state:item.state||'Lagos',kind:item.kind||'lga',parent:toId(item.parent),
    });
    setManualSlug(true);setError('');setSuccess('');setEditing(true);
  };
  const changeName=(name:string)=>{
    setForm(s=>({...s,name,slug:manualSlug?s.slug:slugify(name)}));
  };
  const save=async()=>{
    if(!editable || busy)return;
    if(!form.name.trim()){setError('Enter a name.');return;}
    if(!form.slug.trim()){setError('Enter a short URL name.');return;}
    setBusy(true);setError('');setSuccess('');
    try{
      const data:Record<string,unknown>={name:form.name.trim(),slug:slugify(form.slug.trim())};
      if(active!=='tags')data.description=form.description.trim();
      if(active==='locations'){
        data.state=form.state.trim()||'Lagos';
        data.kind=form.kind;
        data.parent=form.parent?Number(form.parent):null;
      }
      const response=await fetch('/api/'+active+(selected?'/'+encodeURIComponent(String(selected.id)):''),
      {method:selected?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(readableError(result));
      await load();
      onTaxonomyChanged?.();
      setEditing(false);setSelected(null);
      setSuccess((form.name.trim())+(selected?' was updated.':' was added.'));
    }catch(e){setError(e instanceof Error?e.message:'Could not save.');}
    finally{setBusy(false);}
  };
  const selectedTitle=fields.find(v=>v.key===active)?.title||'Advanced';
  return <section className="ogas-advanced">
    <header className="ogas-heading ogas-heading--split">
      <div>
        <span className="ogas-eyebrow"><span className="ogas-eyebrow-dot"/> MANAGE YOUR NEWSROOM</span>
        <h1>Advanced settings</h1>
        <p>Organise articles, locations and topics. The tools you use less often live here.</p>
      </div>
    </header>
    {error&&<div className="ogas-alert ogas-alert--error" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {success&&<div className="ogas-alert ogas-alert--success" role="status"><Check size={18}/>{success}</div>}
    {['administrator','editor_in_chief'].includes(role)&&<div className="ogas-advanced-homepage" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:18,flexWrap:'wrap',padding:'22px 24px',border:'1px solid #e7e7e3',borderRadius:14,marginBottom:24}}>
      <div style={{maxWidth:590}}><h2 style={{margin:'0 0 8px'}}>Homepage story placements</h2><p style={{margin:0}}>Choose the lead story, five latest highlights, Lagos Watch, Government &amp; Policies, Grassroots Voices, Business &amp; Investment, Personalities, and featured OgasTV Studio episode. Only published stories appear on the public website.</p></div>
      <a className="ogas-button ogas-button--red" href="/admin/globals/homepage">Manage homepage <ArrowRight size={17}/></a>
    </div>}
    <div className="ogas-advanced-layout">
      <nav className="ogas-advanced-nav" aria-label="Advanced settings">
        {fields.map(item=>{
          const Icon=item.icon;
          return <button type="button" key={item.key} className={active===item.key?'active':''}
            onClick={()=>{setActive(item.key);setSearch('');setEditing(false);setError('');setSuccess('');}}>
            <Icon size={19}/>
            <span><strong>{item.title}</strong><small>{item.description}</small></span>
            <ArrowRight size={16}/>
          </button>;
        })}
      </nav>
      <div className="ogas-advanced-panel">
        {editing?
          <>
            <button type="button" className="ogas-advanced-back" onClick={()=>{setEditing(false);setError('')}}><ArrowLeft size={16}/> Back to {selectedTitle.toLowerCase()}</button>
            <h2>{selected?'Edit':'Add'} {active==='categories'?'section':active==='locations'?'location':'topic'}</h2>
            <div className="ogas-advanced-form">
              <label>Name
                <input maxLength={120} value={form.name} onChange={e=>changeName(e.target.value)} placeholder="Enter a name"/>
              </label>
              <label>Short URL name
                <input value={form.slug} onChange={e=>{setManualSlug(true);setForm(s=>({...s,slug:e.target.value}));}} placeholder="e.g. local-news"/>
                <small>Used in website links. Changing it may affect existing links.</small>
              </label>
              {active!=='tags'&&<label>Description <span>Optional</span>
                <textarea rows={4} value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))} placeholder="A short explanation"/>
              </label>}
              {active==='locations'&&<>
                <label>State
                  <input value={form.state} onChange={e=>setForm(s=>({...s,state:e.target.value}))} placeholder="Lagos"/>
                </label>
                <label>Location type
                  <select value={form.kind} onChange={e=>setForm(s=>({...s,kind:e.target.value}))}>
                    <option value="state">State</option><option value="lga">LGA</option>
                    <option value="lcda">LCDA</option><option value="community">Community</option>
                  </select>
                </label>
                <label>Inside a larger location <span>Optional</span>
                  <select value={form.parent} onChange={e=>setForm(s=>({...s,parent:e.target.value}))}>
                    <option value="">None</option>
                    {collections.locations.filter(x=>x.id!==selected?.id).map(x=><option key={String(x.id)} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </label>
              </>}
              <div className="ogas-advanced-actions">
                <button type="button" className="ogas-button ogas-button--outline" onClick={()=>setEditing(false)}>Cancel</button>
                <button type="button" className="ogas-button ogas-button--red" disabled={busy} onClick={()=>void save()}>
                  {busy?'Saving…':selected?'Save changes':'Add to newsroom'} <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          </>:
          <>
            <div className="ogas-section-heading">
              <div><h2>{selectedTitle}</h2><p>{collections[active].length} saved {selectedTitle.toLowerCase()}</p></div>
              {editable&&<button type="button" className="ogas-button ogas-button--red" onClick={openNew}><Plus size={17}/> Add {active==='categories'?'section':active==='locations'?'location':'topic'}</button>}
            </div>
            <label className="ogas-search ogas-advanced-search"><Search size={17}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder={'Find '+selectedTitle.toLowerCase()} aria-label={'Find '+selectedTitle.toLowerCase()}/>
            </label>
            {loading?<p className="ogas-empty-small">Loading your settings…</p>:
            visible.length?<div className="ogas-advanced-list">{visible.map(item=>(
              <button key={String(item.id)} type="button" disabled={!editable} onClick={()=>openEdit(item)}>
                <span><strong>{item.name||'Untitled'}</strong><small>{item.slug}{active==='locations'&&item.state?' · '+item.state:''}</small></span>
                {editable&&<ArrowRight size={16}/>}
              </button>
            ))}</div>:<div className="ogas-empty"><FolderOpen size={28}/><h3>No matches</h3><p>{search?'Try another name.':'No entries have been added yet.'}</p></div>}
          </>
        }
      </div>
    </div>
  </section>;
}
