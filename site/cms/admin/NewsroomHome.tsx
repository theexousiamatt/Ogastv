'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpenText, CheckCircle2, ClipboardCheck, FilePenLine,
  FolderOpen, Plus, Radio, Search,
} from 'lucide-react';

export type NewsroomStory = {
  id: string;
  title: string;
  category: string;
  author: string;
  status: 'published' | 'review' | 'draft';
  updatedAt: string;
};

export type NewsroomSnapshot = {
  name: string;
  published: number;
  drafts: number;
  review: number;
  stories: NewsroomStory[];
  reviewStories: NewsroomStory[];
  hasSections: boolean;
  canWrite: boolean;
  canManage: boolean;
};

function Status({ value }: { value: NewsroomStory['status'] }) {
  return <span className={'ogas-home__status ogas-home__status--' + value}>
    {value === 'published' ? 'Published' : value === 'review' ? 'In review' : 'Draft'}
  </span>;
}

export function NewsroomHome(data: NewsroomSnapshot) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return data.stories;
    return data.stories.filter(story =>
      [story.title, story.category, story.author].some(field => field.toLocaleLowerCase().includes(term))
    );
  }, [query, data.stories]);
  const firstName = data.name.trim().split(/\s+/)[0] || 'there';

  return <main className="ogas-home">
    <header className="ogas-home__hero">
      <div className="ogas-home__hero-copy">
        <p className="ogas-home__eyebrow">OGASTV AFRICA · NEWSROOM</p>
        <h1>Welcome back, {firstName}.</h1>
        <p>Pick up a story or start something new.</p>
      </div>
      <div className="ogas-home__actions" aria-label="Start working">
        {data.canWrite && <a href="/admin/collections/articles/create" className="ogas-home__button ogas-home__button--primary">
          <Plus size={18} aria-hidden="true" /> Write a story
        </a>}
        {data.canWrite && <a href="/broadcast-studio" className="ogas-home__button ogas-home__button--secondary">
          <Radio size={18} aria-hidden="true" /> Go live
        </a>}
      </div>
    </header>

    {!data.hasSections && data.canManage && <div className="ogas-home__setup" role="status">
      <div><strong>Set up your first news section</strong><p>Stories need a section like News, Politics, or Community before publishing.</p></div>
      <a href="/admin/collections/categories/create">Create section <ArrowRight size={16} aria-hidden="true" /></a>
    </div>}

    <section className="ogas-home__stats" aria-label="Newsroom at a glance">
      <a href="/admin/collections/articles" className="ogas-home__stat">
        <span>Published stories</span><strong>{data.published.toLocaleString('en-NG')}</strong>
        <span className="ogas-home__stat-link">Browse stories <ArrowRight size={14} aria-hidden="true" /></span>
      </a>
      <a href="/admin/collections/articles?where%5B_status%5D%5Bequals%5D=draft" className="ogas-home__stat">
        <span>Drafts</span><strong>{data.drafts.toLocaleString('en-NG')}</strong>
        <span className="ogas-home__stat-link">Continue writing <ArrowRight size={14} aria-hidden="true" /></span>
      </a>
      {data.canManage && <a href="/admin/review-queue" className="ogas-home__stat">
        <span>Needs review</span><strong>{data.review.toLocaleString('en-NG')}</strong>
        <span className="ogas-home__stat-link">Review submissions <ArrowRight size={14} aria-hidden="true" /></span>
      </a>}
    </section>

    <section className="ogas-home__panel" aria-labelledby="ogas-home-stories">
      <div className="ogas-home__panel-head">
        <div><h2 id="ogas-home-stories">Recent stories</h2><p>Open a story to keep working or check its status.</p></div>
        <a href="/admin/collections/articles" className="ogas-home__text-link">All stories <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      {data.stories.length > 0 && <label className="ogas-home__filter">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Filter recent stories</span>
        <input value={query} onChange={event => setQuery(event.target.value)}
          type="search" placeholder="Find a recent story…" aria-label="Filter recent stories" />
      </label>}
      {filtered.length > 0 ? <ul className="ogas-home__story-list">
        {filtered.map(story => <li key={story.id}>
          <a className="ogas-home__story" href={'/admin/collections/articles/' + encodeURIComponent(story.id)}>
            <span className="ogas-home__story-icon"><BookOpenText size={20} aria-hidden="true" /></span>
            <span className="ogas-home__story-info">
              <strong>{story.title}</strong>
              <small>{story.category} · {story.author} · {story.updatedAt}</small>
            </span>
            <Status value={story.status} />
            <ArrowRight className="ogas-home__story-arrow" size={18} aria-hidden="true" />
          </a>
        </li>)}
      </ul> : <div className="ogas-home__empty">
        <FolderOpen size={26} aria-hidden="true" />
        <strong>{data.stories.length ? 'No matching stories' : 'Your newsroom is ready'}</strong>
        <p>{data.stories.length ? 'Try a different headline or name.' : 'Write your first story to get started.'}</p>
        {data.canWrite && !data.stories.length && <a href="/admin/collections/articles/create">Write a story <ArrowRight size={16} aria-hidden="true" /></a>}
      </div>}
    </section>

    {data.canManage && <section className="ogas-home__review" aria-labelledby="ogas-home-review">
      <div className="ogas-home__panel-head">
        <div><h2 id="ogas-home-review">Waiting for review</h2><p>Reports submitted by your writers.</p></div>
        <a href="/admin/review-queue" className="ogas-home__text-link">Review queue <ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      {data.reviewStories.length ? <ul className="ogas-home__review-list">
        {data.reviewStories.map(story => <li key={story.id}>
          <a href={'/admin/collections/articles/' + encodeURIComponent(story.id)}>
            <ClipboardCheck size={18} aria-hidden="true" />
            <span>{story.title}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </li>)}
      </ul> : <div className="ogas-home__review-empty"><CheckCircle2 size={20} aria-hidden="true" /> You're all caught up.</div>}
    </section>}

    <p className="ogas-home__footer">Manage sections, media, and team settings from the sidebar.</p>
  </main>;
}
