import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { canPublish, canReview, editorial, getStaff, hasRole } from '../access';
import { NewsroomHome, type NewsroomStory } from './NewsroomHome';

type ArticleRow = {
  id: number | string;
  title?: string;
  publicByline?: string;
  author?: number | { name?: string } | null;
  featuredImage?: number | { url?: string } | null;
  updatedAt?: string;
  _status?: string;
  workflowStatus?: string;
  primaryCategory?: { name?: string } | number | string | null;
};

function asStory(item: ArticleRow): NewsroomStory {
  return {
    id: String(item.id),
    title: item.title || 'Untitled story',
    author: item.publicByline || (item.author && typeof item.author === 'object' ? item.author.name || 'Newsroom' : 'Newsroom'),
    image: item.featuredImage && typeof item.featuredImage === 'object' ? item.featuredImage.url || null : null,
    category: item.primaryCategory && typeof item.primaryCategory === 'object'
      ? item.primaryCategory.name || 'Uncategorised' : 'Uncategorised',
    status: item._status === 'published' ? 'published' : item.workflowStatus === 'in_review' ? 'review' : 'draft',
    updatedAt: item.updatedAt
      ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(item.updatedAt))
      : '—',
  };
}

export async function NewsroomDashboard({
  initPageResult, params, searchParams, user,
}: AdminViewServerProps) {
  const req = initPageResult.req;
  const principal = getStaff(req.user);
  if (!principal) return <Gutter><p role="alert">Please sign in to access the newsroom.</p></Gutter>;

  const reviewAccess = canReview(principal);
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const dateRanges = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(todayUTC);
    start.setUTCDate(start.getUTCDate() - 6 + index);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  });

  // Real newsroom data only. Every query honours the current staff account's
  // collection read permissions. There are no fabricated analytics records.
  const [published, drafts, review, media, recent, categories, reviewRows, ...weekCounts] = await Promise.all([
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'published' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'draft' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' } } }),
    req.payload.count({ collection: 'media', req, overrideAccess: false }),
    req.payload.find({ collection: 'articles', req, overrideAccess: false, limit: 7, sort: '-updatedAt', depth: 1, draft: true }),
    req.payload.count({ collection: 'categories', req, overrideAccess: false }),
    reviewAccess ? req.payload.find({
      collection: 'articles', req, overrideAccess: false, limit: 3, depth: 1, draft: true,
      sort: '-updatedAt',
      where: { workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' } },
    }) : Promise.resolve(null),
    ...dateRanges.map(({start,end}) => req.payload.count({
      collection: 'articles', req, overrideAccess: false,
      where: { and: [
        { _status: { equals: 'published' } },
        { updatedAt: { greater_than_equal: start } },
        { updatedAt: { less_than: end } },
      ] },
    })),
  ]);

  const safeName = user && typeof user === 'object' && 'name' in user && typeof user.name === 'string'
    ? user.name : 'team';
  const date = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos',
  }).format(new Date());

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <NewsroomHome
          name={safeName}
          date={date}
          role={principal.role || ''}
          published={published.totalDocs}
          drafts={drafts.totalDocs}
          review={review.totalDocs}
          media={media.totalDocs}
          stories={(recent.docs as ArticleRow[]).map(asStory)}
          reviewStories={reviewRows ? (reviewRows.docs as ArticleRow[]).map(asStory) : []}
          weeklyPublished={weekCounts.map((count) => count.totalDocs)}
          hasSections={categories.totalDocs > 0}
          canWrite={editorial(principal)}
          canManage={reviewAccess}
          canPublish={canPublish(principal)}
          canModerate={hasRole(principal,'administrator','editor_in_chief','editor','moderator')}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
