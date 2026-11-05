'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, BookOpenText, CalendarDays, CheckCircle2,
  Clock3, FilePenLine, FileText, FolderOpen, Globe2, Image,
  LayoutGrid, ListFilter, Plus, Radio, Search, Tags, Users, Video,
} from 'lucide-react';

export type NewsroomStory = {
  id: string;
  title: string;
  status: 'published' | 'review' | 'draft';
  category: string;
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
  hasSections: boolean;
  canWrite: boolean;
  canManage: boolean;
  canPublish: boolean;
  canModerate: boolean;
};

const roleNames: Record<string,string> = {
  administrator: 'Administrator',
  editor_in_chief: 'Editor-in-Chief',
  editor: 'Editor',
  journalist: 'Journalist',
  moderator: 'Moderator',
  advertising_manager: 'Advertising Manager',
};

function Status({ value }: { value: NewsroomStory['status'] }) {
  const labels = { published: 'Published', review: 'In review', draft: 'Draft' };
  return <span className={'nr-status nr-status--' + value}>{labels[value]}</span>;
}

export function NewsroomHome(snapshot: NewsroomSnapshot) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const stories = useMemo(
    () => snapshot.stories.filter((story) =>
      [story.title,story.category,story.status].some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))),
    [query,snapshot.stories],
  );
  const hasStories = snapshot.stories.length > 0;
  const firstName = snapshot.name?.trim().split(/\s+/)[0] || 'there';

  const stats = [
    { label: 'Published stories', value: snapshot.published, note: 'Live on your website', Icon: Globe2, tone: 'green' },
    { label: 'Saved drafts', value: snapshot.drafts, note: 'Saved, not yet published', Icon: FileText, tone: '' },
    { label: 'Needs a review', value: snapshot.review, note: 'Waiting for an editor', Icon: Clock3, tone: 'amber' },
    { label: 'Media library', value: snapshot.media, note: 'Images available to use', Icon: Image, tone: 'red' },
  ];

  const links = [
    { name: 'My stories', href: '/admin/my-stories', Icon: BookOpenText, shown: true },
    { name: 'Media library', href: '/admin/collections/media', Icon: Image, shown: snapshot.canWrite },
    { name: 'Categories', href: '/admin/collections/categories', Icon: Tags, shown: true },
    { name: 'Review queue', href: '/admin/review-queue', Icon: CheckCircle2, shown: snapshot.canManage },
    { name: 'Live events', href: '/admin/collections/live-events', Icon: Video, shown: true },
    { name: 'Homepage', href: '/admin/globals/homepage', Icon: LayoutGrid, shown: snapshot.canPublish },
    { name: 'Team access', href: '/admin/collections/staff-users', Icon: Users, shown: snapshot.role === 'administrator' },
  ].filter((link) => link.shown);

  const guide = [
    { title: 'Create a story', detail: 'Write a headline, summary and the full report.', href: '/admin/collections/articles/create', shown: snapshot.canWrite },
    { title: 'Organise your sections', detail: 'Create categories like Lagos Watch and Grassroots.', href: '/admin/collections/categories', shown: snapshot.canManage },
    { title: 'Prepare article images', detail: 'Upload photographs with descriptive alt text.', href: '/admin/collections/media', shown: snapshot.canWrite },
    { title: 'Review and publish', detail: 'Approve a story before it appears to readers.', href: '/admin/collections/articles', shown: snapshot.canPublish },
  ].filter((item) => item.shown);

  return (
    <div className="newsroom-dashboard">
      <nav className="nr-crumbs" aria-label="Breadcrumb">
        <span>OgasTV Africa</span><i aria-hidden="true">/</i><span>Newsroom overview</span>
      </nav>

      <div className="nr-heading">
        <div>
          <div className="nr-heading__kicker">Your editorial workspace · {snapshot.date}</div>
          <h1 className="nr-title">Welcome back, {firstName}.</h1>
          <p className="nr-heading__description">
            Pick up where you left off. Write a story, send it for review and keep the newsroom moving.
          </p>
        </div>
        <div className="nr-heading__actions">
          <Button variant="secondary" className="nr-button nr-button--subtle" onPress={() => window.open('/', '_blank', 'noopener,noreferrer')}>
            <ArrowUpRight aria-hidden="true" /> View website
          </Button>
          {snapshot.canWrite && (
            <Button variant="primary" className="nr-button nr-button--primary" onPress={() => router.push('/admin/collections/articles/create')}>
              <Plus aria-hidden="true" /> New story
            </Button>
          )}
        </div>
      </div>

      {!snapshot.hasSections && snapshot.canManage && (
        <div className="nr-onboarding" role="status">
          <div className="nr-onboarding__mark" aria-hidden="true"><Tags size={18} /></div>
          <div>
            <strong>First, create a news section.</strong>
            <p>Your CMS has no sections yet. Add “News” or “Lagos Watch” so every story has a place to appear.</p>
          </div>
          <a href="/admin/collections/categories/create">Create section <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
      )}

      <section className="nr-stats" aria-label="Newsroom statistics">
        {stats.map(({label,value,note,Icon,tone})=>(
          <Card className="nr-stat" key={label}>
            <Card.Content>
              <div className="nr-stat__top">
                <span className="nr-stat__label">{label}</span>
                <span className={'nr-stat__icon' + (tone ? ' nr-stat__icon--'+tone : '')}><Icon aria-hidden="true" /></span>
              </div>
              <strong className="nr-stat__value">{value.toLocaleString('en-NG')}</strong>
              <span className="nr-stat__note">{note}</span>
            </Card.Content>
          </Card>
        ))}
      </section>

      <div className="nr-columns">
        <div className="nr-column">
          <section className="nr-panel" aria-label="Recent articles">
            <div className="nr-panel__head">
              <div><h2 className="nr-panel__title">Recent articles</h2><p className="nr-panel__hint">Your latest drafts and published stories.</p></div>
              <a className="nr-panel__all" href="/admin/my-stories">My stories <ArrowRight aria-hidden="true" /></a>
            </div>
            {hasStories ? (
              <>
                <label className="nr-search">
                  <Search aria-hidden="true" />
                  <input aria-label="Search recent articles" type="search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Find a recent story..." />
                  <ListFilter aria-hidden="true" />
                </label>
                {stories.length ? (
                  <table className="nr-table">
                    <thead><tr><th>Story</th><th>Status</th><th>Updated</th><th><span className="sr-only">Edit</span></th></tr></thead>
                    <tbody>{stories.map((story)=>(
                      <tr key={story.id}>
                        <td><a className="nr-story__title" href={'/admin/collections/articles/'+encodeURIComponent(story.id)}>{story.title}</a><span className="nr-story__secondary">{story.category}</span></td>
                        <td><Status value={story.status}/></td>
                        <td className="nr-date">{story.updatedAt}</td>
                        <td><a className="nr-table__action" title={'Open '+story.title} aria-label={'Open '+story.title} href={'/admin/collections/articles/'+encodeURIComponent(story.id)}><ArrowUpRight aria-hidden="true" /></a></td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <p className="nr-search-empty" role="status">No recent stories match “{query}”. Try another search.</p>}
              </>
            ) : (
              <div className="nr-empty">
                <div className="nr-empty__illustration"><FilePenLine aria-hidden="true"/></div>
                <h3>Your next story starts here.</h3>
                <p>The newsroom is ready. Create an article to start building your publication.</p>
                {snapshot.canWrite && (
                  <Button variant="primary" className="nr-button nr-button--primary" onPress={() => router.push('/admin/collections/articles/create')}>
                    <Plus aria-hidden="true"/> Write a story
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="nr-panel nr-shortcuts" aria-label="Newsroom shortcuts">
            <h2>Quick access</h2>
            <div className="nr-shortcuts__grid">
              {links.map(({name,href,Icon})=>(
                <a className="nr-shortcut" href={href} key={href}>
                  <Icon aria-hidden="true" />
                  <span className="nr-shortcut__label">{name}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <div className="nr-column">
          <aside className="nr-panel nr-guide" aria-label="Publishing guide">
            <h2 className="nr-guide__title">Your publishing guide</h2>
            <p className="nr-guide__description">The essentials to prepare content for OgasTV readers.</p>
            {guide.length ? guide.map((item,index)=>(
              <a className="nr-step" href={item.href} key={item.href}>
                <span className="nr-step__num">{String(index+1).padStart(2,'0')}</span>
                <span className="nr-step__copy"><span className="nr-step__name">{item.title}</span><span className="nr-step__detail">{item.detail}</span></span>
                <ArrowRight className="nr-step__arrow" aria-hidden="true" />
              </a>
            )) : <p className="nr-guide__description">Your access level is {roleNames[snapshot.role] || 'Staff member'}. Use the available collections to continue your work.</p>}
            <div className="nr-note"><CheckCircle2 aria-hidden="true" /><span>Only approved and published stories become public. Saved drafts stay private.</span></div>
          </aside>

          <aside className="nr-live" aria-label="Video and live coverage">
            <div className="nr-live__label">OgasTV Studio</div>
            <div className="nr-live__state"><strong>Broadcast workspace</strong><span>Manage events</span></div>
            <p className="nr-live__copy">Prepare programmes, schedule coverage and organise video before going on air.</p>
            <a className="nr-live__link" href="/admin/collections/live-events"><Radio aria-hidden="true"/> Open live events <ArrowRight aria-hidden="true"/></a>
          </aside>
        </div>
      </div>
    </div>
  );
}
