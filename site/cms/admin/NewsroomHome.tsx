'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, BarChart3, Bell, BookOpenText, CheckCheck,
  Clock3, FilePenLine, FileText, Image, MoreHorizontal, Plus, Search,
  ShieldCheck, Tag, TrendingUp, UsersRound,
} from 'lucide-react';

export type NewsroomStory = {
  id: string;
  title: string;
  category: string;
  author: string;
  image?: string | null;
  status: 'published' | 'review' | 'draft';
  updatedAt: string;
};

export type NewsroomSnapshot = {
  name: string;
  role: string;
  date: string;
  published: number;
  drafts: number;
  review: number;
  media: number;
  stories: NewsroomStory[];
  reviewStories: NewsroomStory[];
  weeklyPublished: number[];
  hasSections: boolean;
  canWrite: boolean;
  canManage: boolean;
  canPublish: boolean;
  canModerate: boolean;
};

function Status({ value }: {value: NewsroomStory['status']}) {
  const label = { published: 'Published', review: 'In review', draft: 'Draft' };
  return <span className={'ogas-admin-status ogas-admin-status--'+value}>{label[value]}</span>;
}
function StoryImage({ story }: {story: NewsroomStory}) {
  return <span className="ogas-admin-story-thumb">
    {story.image ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" src={story.image} alt="" />
    </> : <BookOpenText size={16} aria-hidden="true"/>}
  </span>;
}
function DataCard({ label, value, Icon, accent }: {
  label: string; value: number; Icon: typeof FileText; accent?: boolean;
}) {
  return <Card className={'ogas-admin-metric'+(accent?' ogas-admin-metric--olive':'')}>
    <Card.Content>
      <div className="ogas-admin-metric__icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true"/></div>
      <span className="ogas-admin-metric__label">{label}</span>
      <strong>{value.toLocaleString('en-NG')}</strong>
    </Card.Content>
  </Card>;
}
function ActivityChart({values}:{values:number[]}) {
  const max = Math.max(1,...values);
  const days = Array.from({length:7},(_,i)=>{
    const date = new Date();
    date.setUTCDate(date.getUTCDate()-6+i);
    return new Intl.DateTimeFormat('en-NG',{weekday:'short',timeZone:'UTC'}).format(date);
  });
  const total = values.reduce((sum,val)=>sum+val,0);
  return <div className="ogas-admin-activity">
    <div className="ogas-admin-activity__metric"><strong>{total.toLocaleString('en-NG')}</strong><span>stories published this week</span></div>
    <div className="ogas-admin-activity__bars" role="img" aria-label={'Daily published story counts: '+values.map((v,i)=>days[i]+': '+v).join(', ')}>
      {values.map((value,i)=><div className="ogas-admin-activity__day" key={days[i]+'-'+i}>
        <span className={'ogas-admin-activity__bar'+(value===max&&value>0?' ogas-admin-activity__bar--highlight':'')}
          style={{height:(value ? Math.max(11,Math.round(value/max*100)) : 7)+'%'}} title={days[i]+': '+value+' published'} />
        <small>{days[i]}</small>
      </div>)}
    </div>
    {!total && <p className="ogas-admin-activity__note">Your publishing trend will build as stories go live. This chart uses real newsroom data.</p>}
  </div>;
}

export function NewsroomHome(data: NewsroomSnapshot) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const filtered = useMemo(()=>data.stories.filter(story=>
    [story.title,story.category,story.author,story.status].some(value=>value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ),[query,data.stories]);
  const firstName = data.name.trim().split(/\s+/)[0] || 'Editor';
  const initials = data.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase() || 'OT';

  return <div className="ogas-admin-v2">
    <header className="ogas-admin-v2__header">
      <div className="ogas-admin-v2__brand"><span className="ogas-admin-v2__brand-mark">▶</span><span>OgasTV <em>Africa</em><small>Newsroom</small></span></div>
      <h1>Newsroom Dashboard</h1>
      <div className="ogas-admin-v2__header-tools">
        <label className="ogas-admin-v2__search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search articles, people..." aria-label="Search recent articles" type="search"/></label>
        {data.canWrite && <Button variant="primary" className="ogas-admin-v2__new" onPress={()=>router.push('/admin/collections/articles/create')}><Plus size={16}/> New Story</Button>}
        <span className="ogas-admin-v2__user" aria-label={'Signed in as '+data.name} title={'Signed in as '+data.name}>{initials}</span>
      </div>
    </header>
    <div className="ogas-admin-v2__welcome"><div><span>WELCOME BACK, {firstName.toLocaleUpperCase()}</span><p>Here&apos;s what&apos;s happening across your newsroom.</p></div><span>{data.date}</span></div>

    {!data.hasSections && data.canManage && <section className="ogas-admin-v2__setup" role="status">
      <span className="ogas-admin-v2__setup-icon"><Tag size={19}/></span>
      <div><strong>Your first step: add a news section.</strong><p>Stories need a category before they can be published. Start with News or Lagos Watch.</p></div>
      <a href="/admin/collections/categories/create">Create section <ArrowRight size={15}/></a>
    </section>}

    <section className="ogas-admin-v2__overview" aria-labelledby="ogas-admin-overview">
      <div className="ogas-admin-v2__section-heading"><h2 id="ogas-admin-overview">Overview</h2><span className="ogas-admin-v2__period">All time</span></div>
      <div className="ogas-admin-v2__metrics">
        <DataCard label="Published stories" value={data.published} Icon={FileText} accent/>
        <DataCard label="Drafts" value={data.drafts} Icon={FilePenLine}/>
        <DataCard label="Review queue" value={data.review} Icon={Clock3}/>
        <DataCard label="Media library" value={data.media} Icon={Image}/>
      </div>
    </section>

    <section className="ogas-admin-v2__recent" aria-labelledby="ogas-admin-recent">
      <div className="ogas-admin-v2__section-heading"><div><h2 id="ogas-admin-recent">Recent Stories</h2><small>Track stories from the newsroom</small></div><a href="/admin/collections/articles">View all <ArrowRight size={15}/></a></div>
      {data.stories.length ? <>
        <div className="ogas-admin-v2__table-wrap"><table className="ogas-admin-v2__table">
          <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Updated</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>{filtered.map(story=><tr key={story.id}>
            <td><a href={'/admin/collections/articles/'+encodeURIComponent(story.id)} className="ogas-admin-v2__story-title"><StoryImage story={story}/><span>{story.title}</span></a></td>
            <td><span className="ogas-admin-v2__category">{story.category}</span></td>
            <td><span className="ogas-admin-v2__author"><span>{story.author.slice(0,1).toUpperCase()}</span>{story.author}</span></td>
            <td><Status value={story.status}/></td>
            <td className="ogas-admin-v2__muted">{story.updatedAt}</td>
            <td><a className="ogas-admin-v2__more" href={'/admin/collections/articles/'+encodeURIComponent(story.id)} aria-label={'Open '+story.title}><MoreHorizontal size={19}/></a></td>
          </tr>)}</tbody>
        </table></div>
        {!filtered.length && <p className="ogas-admin-v2__no-results">No recent stories match “{query}”.</p>}
      </> : <div className="ogas-admin-v2__empty">
        <div className="ogas-admin-v2__empty-icon"><BookOpenText size={26}/></div>
        <h3>Your newsroom is ready for its first story.</h3>
        <p>Begin with a headline and write your report. Save it as a draft, then send it to an editor.</p>
        {data.canWrite && <a href="/admin/collections/articles/create">Write your first story <ArrowRight size={15}/></a>}
      </div>}
    </section>

    <div className="ogas-admin-v2__bottom">
      <section className="ogas-admin-v2__analytics" aria-labelledby="ogas-admin-analytics">
        <div className="ogas-admin-v2__section-heading"><h2 id="ogas-admin-analytics">Publishing activity</h2><span className="ogas-admin-v2__period">Last 7 days</span></div>
        <ActivityChart values={data.weeklyPublished}/>
      </section>
      <section className="ogas-admin-v2__queue" aria-labelledby="ogas-admin-queue">
        <div className="ogas-admin-v2__section-heading"><h2 id="ogas-admin-queue">Review Queue</h2>{data.canManage && <a href="/admin/review-queue">View all <ArrowRight size={15}/></a>}</div>
        {!data.canManage ? <div className="ogas-admin-v2__queue-empty"><ShieldCheck size={25}/><p>Submitted reports are reviewed by your editors.</p></div> :
        data.reviewStories.length ? <div className="ogas-admin-v2__queue-items">{data.reviewStories.map(story=><div className="ogas-admin-v2__queue-item" key={story.id}>
          <StoryImage story={story}/>
          <div><a href={'/admin/collections/articles/'+encodeURIComponent(story.id)}>{story.title}</a><span>{story.category} · {story.author}</span></div>
          <a href={'/admin/collections/articles/'+encodeURIComponent(story.id)} className="ogas-admin-v2__queue-action" aria-label={'Review '+story.title}><ArrowUpRight size={16}/></a>
        </div>)}</div> : <div className="ogas-admin-v2__queue-empty"><CheckCheck size={26}/><strong>All caught up</strong><p>Newly submitted stories will appear here.</p></div>}
      </section>
    </div>
    <p className="ogas-admin-v2__footer-note">OgasTV Africa newsroom · Content and activity are based on real CMS records.</p>
  </div>;
}
