'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clapperboard, Home,
  MapPin, Plus, Radio, RefreshCw, ShieldCheck, UserRound, UsersRound,
} from 'lucide-react';

type Tab='homepage'|'team'|'programmes'|'episodes'|'live-events'|'community';
type Doc=Record<string,any>&{id:string|number};
type Options=Record<string,Doc[]>;
type Choice={label:string;value:string};
type Field={
  key:string;label:string;type:'text'|'textarea'|'date'|'select'|'relation'|'multi'|'check';
  required?:boolean;placeholder?:string;help?:string;options?:Choice[];source?:string;
};
type Props={role:string;staffId:string;emailReady:boolean};

const roles:Choice[]=[
  {label:'Administrator',value:'administrator'},
  {label:'Editor-in-chief',value:'editor_in_chief'},
  {label:'Editor',value:'editor'},
  {label:'Journalist',value:'journalist'},
  {label:'Moderator',value:'moderator'},
  {label:'Advertising manager',value:'advertising_manager'},
];
const statuses:Choice[]=[
  {label:'Scheduled',value:'scheduled'},{label:'Live',value:'live'},
  {label:'Interrupted',value:'interrupted'},{label:'Ended',value:'ended'},
  {label:'Replay available',value:'replay_available'},{label:'Cancelled',value:'cancelled'},
];
const moderation:Choice[]=[
  {label:'Pending',value:'pending'},{label:'Reviewing',value:'reviewing'},
  {label:'Accepted',value:'accepted'},{label:'Rejected',value:'rejected'},
  {label:'Archived',value:'archived'},
];
const editorialStatus:Choice[]=[{label:'Draft',value:'draft'},{label:'Published',value:'published'}];
const fields:Record<'programmes'|'episodes'|'live-events'|'community',Field[]>={
  programmes:[
    {key:'title',label:'Programme title',type:'text',required:true},
    {key:'slug',label:'URL name',type:'text',required:true,help:'Keep unique and lowercase. Changing this changes the public programme URL.'},
    {key:'description',label:'Programme description',type:'textarea'},
    {key:'cover',label:'Cover image',type:'relation',source:'media'},
    {key:'presenters',label:'Presenters',type:'multi',source:'staff'},
  ],
  episodes:[
    {key:'title',label:'Episode title',type:'text',required:true},
    {key:'slug',label:'URL name',type:'text',required:true},
    {key:'programme',label:'Programme',type:'relation',source:'programmes',required:true},
    {key:'youtubeVideoId',label:'YouTube video ID',type:'text',required:true,
      help:'The 11-character video ID, not a full YouTube URL.'},
    {key:'description',label:'Description',type:'textarea'},
    {key:'thumbnail',label:'Episode thumbnail',type:'relation',source:'media'},
    {key:'releasedAt',label:'Release date and time',type:'date'},
    {key:'presenters',label:'Presenters',type:'multi',source:'staff'},
    {key:'relatedArticles',label:'Related published articles',type:'multi',source:'articles'},
    {key:'_status',label:'Visibility',type:'select',options:editorialStatus},
  ],
  'live-events':[
    {key:'title',label:'Event title',type:'text',required:true},
    {key:'slug',label:'URL name',type:'text',required:true},
    {key:'description',label:'Description',type:'textarea'},
    {key:'location',label:'Location',type:'relation',source:'locations'},
    {key:'venue',label:'Venue',type:'text'},
    {key:'artwork',label:'Event artwork',type:'relation',source:'media'},
    {key:'scheduledStart',label:'Scheduled start',type:'date',required:true},
    {key:'broadcastStatus',label:'Broadcast status',type:'select',options:statuses},
    {key:'sourceType',label:'Video source',type:'select',options:[
      {label:'Phone camera / Cloudflare',value:'cloudflare'},{label:'YouTube',value:'youtube'}]},
    {key:'youtubeVideoId',label:'YouTube video ID (when relevant)',type:'text'},
    {key:'recording',label:'Recording / replay',type:'relation',source:'episodes'},
    {key:'actualStart',label:'Actual start',type:'date'},
    {key:'actualEnd',label:'Actual end',type:'date'},
    {key:'presenters',label:'Presenters',type:'multi',source:'staff'},
    {key:'_status',label:'Visibility',type:'select',options:editorialStatus},
  ],
  community:[
    {key:'moderationStatus',label:'Moderation decision',type:'select',options:moderation},
    {key:'internalNotes',label:'Private editorial notes',type:'textarea'},
    {key:'convertedArticle',label:'Converted article',type:'relation',source:'articles'},
  ],
};
const tabDetails:Record<Tab,{title:string;description:string;Icon:typeof Home;collection?:string}>={
  homepage:{title:'Homepage',description:'Choose the lead story, featured video and breaking-news strip. Regular sections populate automatically from categories.',Icon:Home},
  team:{title:'Team',description:'Manage staff roles and send secure newsroom invitations.',Icon:UsersRound,collection:'staff-users'},
  programmes:{title:'Programmes',description:'Manage OgasTV Studio shows, their covers and presenters.',Icon:Clapperboard,collection:'programmes'},
  episodes:{title:'Episodes',description:'Publish video podcasts, presenter-led coverage and YouTube episodes.',Icon:BookOpen,collection:'episodes'},
  'live-events':{title:'Live events',description:'Create broadcast records, schedule coverage and attach replays. Start actual camera sessions from Broadcast Studio.',Icon:Radio,collection:'live-events'},
  community:{title:'Community stories',description:'Review resident submissions while protecting their contact details and publication consent.',Icon:MapPin,collection:'community-submissions'},
};
const optionUrls:Record<string,string>={
  articles:'/api/articles?limit=100&depth=0&where[_status][equals]=published&sort=-firstPublishedAt',
  episodes:'/api/episodes?limit=100&depth=0&sort=-createdAt',
  programmes:'/api/programmes?limit=100&depth=0&sort=title',
  media:'/api/media?limit=100&depth=0&sort=-createdAt',
  locations:'/api/locations?limit=100&depth=0&sort=name',
  staff:'/api/staff-users?limit=100&depth=0&sort=name',
  'live-events':'/api/live-events?limit=100&depth=0&sort=-createdAt',
};
function relationId(value:any):string{
  if(value==null)return '';
  return String(typeof value==='object'?value.id??'':value);
}
function relationIds(value:any):string[]{
  return Array.isArray(value)?value.map(relationId).filter(Boolean):[];
}
function dateInput(value:any):string{
  if(typeof value!=='string'||!value)return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function slugify(value:string){return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,150);}
function titleOf(doc:Doc){return String(doc.title||doc.subject||doc.name||doc.email||'Untitled');}
function statusOf(doc:Doc){return String(doc.broadcastStatus||doc.moderationStatus||doc._status||doc.role||'');}
async function request(url:string,options?:RequestInit):Promise<any>{
  const response=await fetch(url,{credentials:'include',cache:'no-store',...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.errors?.[0]?.message||data?.message||'Request failed. Please try again.');
  return data;
}
function labelFor(source:string,doc:Doc){
  return String(doc.title||doc.name||doc.alt||doc.filename||doc.email||source+' '+doc.id);
}
function defaultForm(tab:Tab):Record<string,any>{
  if(tab==='episodes')return {_status:'draft',presenters:[],relatedArticles:[]};
  if(tab==='live-events')return {_status:'draft',broadcastStatus:'scheduled',sourceType:'cloudflare',presenters:[]};
  if(tab==='community')return {moderationStatus:'pending'};
  if(tab==='programmes')return {presenters:[]};
  return {};
}
function fromDoc(doc:Doc,fieldsToUse:Field[]):Record<string,any>{
  const data:Record<string,any>={};
  for(const field of fieldsToUse){
    const value=doc[field.key];
    if(field.type==='relation')data[field.key]=relationId(value);
    else if(field.type==='multi')data[field.key]=relationIds(value);
    else if(field.type==='date')data[field.key]=dateInput(value);
    else if(field.type==='check')data[field.key]=Boolean(value);
    else data[field.key]=value??'';
  }
  return data;
}
function asDocument(form:Record<string,any>,fieldsToUse:Field[]):Record<string,any>{
  const result:Record<string,any>={};
  for(const field of fieldsToUse){
    const value=form[field.key];
    if(field.type==='date'){
      result[field.key]=value?new Date(String(value)).toISOString():null;
    }else if(field.type==='relation'){
      result[field.key]=value?(/^\d+$/.test(String(value))?Number(value):String(value)):null;
    }else if(field.type==='multi'){
      result[field.key]=(Array.isArray(value)?value:[]).map((item:string)=>/^\d+$/.test(item)?Number(item):item);
    }else if(field.type==='check')result[field.key]=Boolean(value);
    else result[field.key]=value??'';
  }
  return result;
}

export default function StudioManage({role,staffId,emailReady}:Props){
  const tabs=useMemo(()=>{
    const available:Tab[]=[];
    if(['administrator','editor_in_chief'].includes(role))available.push('homepage');
    if(role==='administrator')available.push('team');
    if(['administrator','editor_in_chief','editor'].includes(role))available.push('programmes','episodes','live-events');
    if(['administrator','editor_in_chief','editor','moderator'].includes(role))available.push('community');
    return available;
  },[role]);
  const [active,setActive]=useState<Tab>(tabs[0]||'homepage');
  const [documents,setDocuments]=useState<Record<string,Doc[]>>({});
  const [optionSets,setOptionSets]=useState<Options>({});
  const [selected,setSelected]=useState<string>('new');
  const [form,setForm]=useState<Record<string,any>>({});
  const [homepage,setHomepage]=useState<Record<string,any>>({});
  const [invite,setInvite]=useState({name:'',email:'',role:'journalist'});
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const current=tabDetails[active];
  const collection=current.collection;
  const entries=documents[collection||'']||[];
  const selectedDoc=entries.find(doc=>String(doc.id)===selected)||null;
  const canCreate=active!=='community'&&active!=='team';
  const categoryFields=fields[active as keyof typeof fields]||[];

  const loadOptions=useCallback(async()=>{
    const keys=Object.keys(optionUrls);
    const data=await Promise.all(keys.map(async key=>{
      try{
        const response=await request(optionUrls[key]);
        return [key,Array.isArray(response.docs)?response.docs:[]] as const;
      }catch{return [key,[]] as const;}
    }));
    setOptionSets(Object.fromEntries(data));
  },[]);
  const loadTab=useCallback(async(tab:Tab)=>{
    setLoading(true);setError('');
    try{
      if(tab==='homepage'){
        const response=await request('/api/globals/homepage?depth=0');
        setHomepage(response||{});
      }else{
        const col=tabDetails[tab].collection!;
        const url='/api/'+col+'?limit=80&depth=1&sort=-createdAt'+
          (tab==='episodes'||tab==='live-events'?'&draft=true':'');
        const response=await request(url);
        setDocuments(prev=>({...prev,[col]:Array.isArray(response.docs)?response.docs:[]}));
      }
    }catch(e){setError(e instanceof Error?e.message:'Could not load this section.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadOptions()},[loadOptions]);
  useEffect(()=>{if(tabs.includes(active))void loadTab(active)},[active,loadTab,tabs]);
  useEffect(()=>{
    if(active==='team'||active==='homepage')return;
    const doc=entries.find(item=>String(item.id)===selected);
    setForm(doc?fromDoc(doc,categoryFields):defaultForm(active));
  },[selected,active,documents]);

  const chooseTab=(tab:Tab)=>{
    setActive(tab);setSelected('new');setError('');setSuccess('');
    setForm(defaultForm(tab));
  };
  const refresh=async()=>{
    await Promise.all([loadOptions(),loadTab(active)]);
  };
  const optionList=(source:string):Doc[]=>optionSets[source]||[];
  const onFieldChange=(key:string,value:any)=>{
    setForm(old=>{
      const next={...old,[key]:value};
      if(key==='title'&&!old.slug)next.slug=slugify(String(value));
      return next;
    });
  };
  const renderField=(field:Field)=>{
    const value=form[field.key];
    const optionChoices:Choice[]=field.source?
      optionList(field.source).map(item=>({value:String(item.id),label:labelFor(field.source!,item)})):
      (field.options||[]);
    // Ensure the current value doesn't disappear when REST list permissions
    // or pagination omit a previously selected relationship.
    if(field.source && value){
      const ids=field.type==='multi'?relationIds(value):[String(value)];
      for(const id of ids)if(id&&!optionChoices.some(choice=>choice.value===id))
        optionChoices.unshift({value:id,label:'Previously selected record ('+id+')'});
    }
    if(field.type==='check')return <label className="ogas-manage__check" key={field.key}>
      <input type="checkbox" checked={Boolean(value)} onChange={event=>onFieldChange(field.key,event.target.checked)}/>{field.label}
    </label>;
    if(field.type==='multi')return <div key={field.key} className="ogas-manage__form">
      <label>{field.label}</label>
      <div style={{maxHeight:160,overflow:'auto',border:'1px solid #e1e2dd',padding:12,borderRadius:8,display:'grid',gap:10}}>
        {optionChoices.length?optionChoices.map(item=><label key={item.value} className="ogas-manage__check">
          <input type="checkbox" checked={Array.isArray(value)&&value.map(String).includes(item.value)}
            onChange={event=>{
              const old=Array.isArray(value)?value.map(String):[];
              onFieldChange(field.key,event.target.checked?[...old.filter(x=>x!==item.value),item.value]:old.filter(x=>x!==item.value));
            }}/>
          {item.label}
        </label>):<span className="ogas-manage__aside">No available records</span>}
      </div>
    </div>;
    return <label key={field.key}>{field.label}{field.required?' *':''}
      {field.type==='textarea'?
        <textarea rows={4} value={String(value??'')} onChange={event=>onFieldChange(field.key,event.target.value)}/>:
        field.type==='select'||field.type==='relation'?
          <select required={field.required} value={String(value??'')} onChange={event=>onFieldChange(field.key,event.target.value)}>
            {field.type==='relation'&&<option value="">None selected</option>}
            {field.type==='select'&&!value&&<option value="">Select an option</option>}
            {optionChoices.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
          </select>:
          <input type={field.type==='date'?'datetime-local':'text'} required={field.required}
            value={String(value??'')} placeholder={field.placeholder||''} maxLength={field.type==='text'?250:undefined}
            onChange={event=>onFieldChange(field.key,event.target.value)}/>
      }
      {field.help&&<small>{field.help}</small>}
    </label>;
  };

  const saveDoc=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy||!collection||active==='team'||active==='community'&&selected==='new')return;
    setBusy(true);setError('');setSuccess('');
    try{
      const data=asDocument(form,categoryFields);
      const url='/api/'+collection+(selectedDoc?'/'+encodeURIComponent(String(selectedDoc.id)):'');
      const res=await request(url,{method:selectedDoc?'PATCH':'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const id=relationId(res.doc?.id||res.id);
      await Promise.all([loadTab(active),loadOptions()]);
      if(id)setSelected(id);
      setSuccess((selectedDoc?'Changes saved.':'Record created.')+' Your newsroom data has been updated.');
    }catch(e){setError(e instanceof Error?e.message:'Could not save.');}
    finally{setBusy(false);}
  };
  const saveHomepage=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');setSuccess('');
    try{
      const data={
        leadStory:homepage.leadStory?Number(relationId(homepage.leadStory)):null,
        featuredEpisode:homepage.featuredEpisode?Number(relationId(homepage.featuredEpisode)):null,
        featuredLiveEvent:homepage.featuredLiveEvent?Number(relationId(homepage.featuredLiveEvent)):null,
        breakingNewsEnabled:Boolean(homepage.breakingNewsEnabled),
        breakingNewsText:String(homepage.breakingNewsText||''),
        breakingNewsLink:String(homepage.breakingNewsLink||''),
      };
      await request('/api/globals/homepage',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)});
      await loadTab('homepage');setSuccess('Homepage settings saved. Regular article sections still populate automatically by category.');
    }catch(e){setError(e instanceof Error?e.message:'Could not save homepage.');}
    finally{setBusy(false);}
  };
  const inviteStaff=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(!emailReady||busy||role!=='administrator')return;
    setBusy(true);setError('');setSuccess('');
    try{
      const response=await request('/api/studio/invite-staff',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(invite)});
      setInvite({name:'',email:'',role:'journalist'});
      await loadTab('team');setSuccess(response.message||'Staff invitation created.');
    }catch(e){setError(e instanceof Error?e.message:'Could not invite staff.');}
    finally{setBusy(false);}
  };
  const changeStaffRole=async(id:string,newRole:string)=>{
    if(role!=='administrator'||id===staffId||busy)return;
    setBusy(true);setError('');setSuccess('');
    try{
      await request('/api/staff-users/'+encodeURIComponent(id),{method:'PATCH',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({role:newRole})});
      await loadTab('team');setSuccess('Staff permissions updated.');
    }catch(e){setError(e instanceof Error?e.message:'Could not change staff role.');}
    finally{setBusy(false);}
  };
  const moderate=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(active!=='community'||!selectedDoc||busy)return;
    setBusy(true);setError('');setSuccess('');
    try{
      await request('/api/community-submissions/'+encodeURIComponent(String(selectedDoc.id)),{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(asDocument(form,fields.community)),
      });
      await loadTab('community');setSuccess('Moderation decision saved. No article is published without an editor.');
    }catch(e){setError(e instanceof Error?e.message:'Could not save moderation.');}
    finally{setBusy(false);}
  };

  if(!tabs.length)return <main className="ogas-manage">
    <div className="ogas-manage__shell"><Link href="/studio">← Back to Studio</Link>
      <p>Your role has no additional management tools. Continue working in the Studio dashboard.</p>
    </div>
  </main>;
  return <main className="ogas-manage">
    <header className="ogas-manage__top"><div className="ogas-manage__top-inner">
      <Link href="/studio" className="ogas-manage__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ogastv-nigeria-logo.png" width={103} height={32} alt="OgasTV Nigeria"/> Studio
      </Link>
      <Link href="/studio" className="ogas-manage__back"><ArrowLeft size={16}/> Back to dashboard</Link>
    </div></header>
    <div className="ogas-manage__shell">
      <div className="ogas-manage__intro"><div>
        <span className="ogas-manage__eyebrow">EDITORIAL OPERATIONS</span>
        <h1>Manage your newsroom.</h1>
        <p>Everything behind the publication, in one place.</p>
      </div></div>
      <div className="ogas-manage__grid">
        <nav className="ogas-manage__nav" aria-label="Management tools">
          {tabs.map(tab=>{
            const item=tabDetails[tab];const Icon=item.Icon;
            return <button key={tab} type="button" className={active===tab?'active':''}
              onClick={()=>chooseTab(tab)}><Icon size={17} aria-hidden="true"/>{item.title}</button>;
          })}
        </nav>
        <section className="ogas-manage__main">
          <div className="ogas-manage__heading">
            <div><h2>{current.title}</h2><p>{current.description}</p></div>
            <button className="ogas-manage__btn" type="button" disabled={loading||busy}
              onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button>
          </div>
          {error&&<div role="alert" className="ogas-manage__notice ogas-manage__error">{error}</div>}
          {success&&<div role="status" className="ogas-manage__notice ogas-manage__success"><CheckCircle2 size={14}/> {success}</div>}
          {active==='homepage'&&<div className="ogas-manage__surface">
            <p className="ogas-manage__notice">Posts under Lagos Watch, Government, Grassroots Voices, Business and Personalities appear automatically when published in those categories. Only the special positions below need editorial selection.</p>
            <form className="ogas-manage__form" onSubmit={event=>void saveHomepage(event)}>
              {([
                ['leadStory','Lead grassroots story','articles'],
                ['featuredEpisode','Featured OgasTV Studio episode','episodes'],
                ['featuredLiveEvent','Featured live event','live-events'],
              ] as const).map(([key,label,source])=><label key={key}>{label}
                <select value={relationId(homepage[key])} onChange={event=>setHomepage(prev=>({...prev,[key]:event.target.value}))}>
                  <option value="">Automatic / not selected</option>
                  {optionList(source).map(item=><option key={String(item.id)} value={String(item.id)}>{labelFor(source,item)}</option>)}
                </select>
              </label>)}
              <div className="ogas-manage__divider"/>
              <h3 className="ogas-manage__subheading">Breaking news strip</h3>
              <label className="ogas-manage__check"><input type="checkbox" checked={Boolean(homepage.breakingNewsEnabled)}
                onChange={event=>setHomepage(prev=>({...prev,breakingNewsEnabled:event.target.checked}))}/> Show breaking-news announcement</label>
              <label>Announcement text
                <input value={String(homepage.breakingNewsText||'')} onChange={event=>setHomepage(prev=>({...prev,breakingNewsText:event.target.value}))}/>
              </label>
              <label>Story URL
                <input value={String(homepage.breakingNewsLink||'')} onChange={event=>setHomepage(prev=>({...prev,breakingNewsLink:event.target.value}))} placeholder="/stories/example"/>
              </label>
              <div className="ogas-manage__form-actions"><button className="ogas-manage__btn ogas-manage__btn--primary" disabled={busy||loading} type="submit">{busy?'Saving…':'Save homepage'} <ArrowRight size={16}/></button></div>
            </form>
          </div>}
          {active==='team'&&<>
            <div className="ogas-manage__surface">
              <h3 className="ogas-manage__subheading">Staff and permissions</h3>
              <p className="ogas-manage__aside">Only administrators can grant or change team roles. You cannot change your own role here.</p>
              {entries.length?<div className="ogas-manage__list">
                {entries.map(staff=><div className="ogas-manage__row" style={{padding:'13px 0',borderBottom:'1px solid #eceee8'}} key={String(staff.id)}>
                  <div><strong>{String(staff.name||'Unnamed staff')}</strong><div className="ogas-manage__meta">{String(staff.email||'')}</div></div>
                  <select aria-label={'Role for '+staff.name} value={String(staff.role||'journalist')}
                    disabled={busy||String(staff.id)===staffId}
                    onChange={event=>void changeStaffRole(String(staff.id),event.target.value)}>
                    {roles.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}
                  </select>
                </div>)}
              </div>:<p className="ogas-manage__empty">No staff records are currently visible.</p>}
            </div>
            <div className="ogas-manage__surface">
              <h3 className="ogas-manage__subheading">Invite a team member</h3>
              {!emailReady&&<p className="ogas-manage__notice">SMTP email delivery is not configured. Inviting staff is disabled until invitations can be delivered securely. Existing staff can continue signing in.</p>}
              <form className="ogas-manage__form" onSubmit={event=>void inviteStaff(event)}>
                <label>Full name<input required maxLength={100} value={invite.name} onChange={event=>setInvite(old=>({...old,name:event.target.value}))} placeholder="Staff member's name"/></label>
                <label>Work email<input type="email" required value={invite.email} onChange={event=>setInvite(old=>({...old,email:event.target.value}))} placeholder="email@example.com"/></label>
                <label>Assigned role<select value={invite.role} onChange={event=>setInvite(old=>({...old,role:event.target.value}))}>
                  {roles.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
                </label>
                <button className="ogas-manage__btn ogas-manage__btn--primary" type="submit" disabled={!emailReady||busy}>{busy?'Creating…':'Send secure invitation'}<ArrowRight size={15}/></button>
              </form>
            </div>
          </>}
          {active!=='homepage'&&active!=='team'&&<div className="ogas-manage__collection">
            <div>
              <div className="ogas-manage__row" style={{marginBottom:13}}>
                <strong>{entries.length} records</strong>
                {canCreate&&<button type="button" className="ogas-manage__btn ogas-manage__btn--primary"
                  onClick={()=>{setSelected('new');setForm(defaultForm(active));setError('')}}><Plus size={15}/> New</button>}
              </div>
              {loading?<p className="ogas-manage__empty">Loading newsroom content…</p>:
                entries.length?<div className="ogas-manage__list">
                  {entries.map(item=><button type="button" className={'ogas-manage__item'+(selected===String(item.id)?' active':'')}
                    key={String(item.id)} onClick={()=>{setSelected(String(item.id));setError('')}}>
                    <strong>{titleOf(item)}</strong><small>{statusOf(item)||item.slug||'Record'}</small>
                  </button>)}
                </div>:<p className="ogas-manage__empty">No records in this section yet.</p>}
            </div>
            <div className="ogas-manage__editor">
              {active==='community'&&!selectedDoc?<div className="ogas-manage__empty">
                <UserRound size={23}/><p>Choose a community submission to review. Public intake remains closed until spam prevention and consent safeguards are ready.</p>
              </div>:<>
                <h3>{selectedDoc?'Edit '+(active==='community'?'submission':active.slice(0,-1)):'Add '+(active==='episodes'?'episode':active==='programmes'?'programme':'live event')}</h3>
                {active==='community'&&selectedDoc&&<div className="ogas-manage__surface" style={{background:'#fafbf9',padding:17}}>
                  <strong>{String(selectedDoc.subject||'Untitled')}</strong>
                  <p className="ogas-manage__aside">{String(selectedDoc.description||'')}</p>
                  <p className="ogas-manage__meta">Submitted by: {String(selectedDoc.submitterName||'Unknown')}</p>
                  <p className="ogas-manage__meta">Contact: {String(selectedDoc.contactEmail||selectedDoc.contactPhone||'Not provided')}</p>
                  <p className="ogas-manage__meta">May contact: {selectedDoc.consentToContact?'Yes':'No'} · May publish: {selectedDoc.permissionToPublish?'Yes':'No'}</p>
                </div>}
                <form className="ogas-manage__form" onSubmit={event=>void (active==='community'?moderate(event):saveDoc(event))}>
                  {categoryFields.map(renderField)}
                  {active==='episodes'&&<p className="ogas-manage__notice">Only published episodes appear on the public website. A valid 11-character YouTube video ID and programme are required.</p>}
                  {active==='live-events'&&<p className="ogas-manage__notice">Changing a live event's status does not start a camera session. Use Broadcast Studio to begin a live stream.</p>}
                  <div className="ogas-manage__form-actions">
                    <button className="ogas-manage__btn ogas-manage__btn--primary" type="submit" disabled={busy}>
                      {busy?'Saving…':selectedDoc?'Save changes':'Create record'} <ArrowRight size={15}/>
                    </button>
                  </div>
                </form>
              </>}
            </div>
          </div>}
          <p className="ogas-manage__aside" style={{marginTop:19}}>
            Access to every tool is checked by your existing newsroom role and Payload API permissions.
            Sensitive reader accounts are kept separate from public editorial content.
          </p>
        </section>
      </div>
    </div>
  </main>;
}
