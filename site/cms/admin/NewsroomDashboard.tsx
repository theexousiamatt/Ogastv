import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { canReview, editorial, getStaff } from '../access';
import { NewsroomHome, type NewsroomStory } from './NewsroomHome';

type ArticleRow = {
  id: number | string;
  title?: string;
  publicByline?: string;
  author?: number | { name?: string } | null;
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
  // Dashboard queries only essential editorial data. The writing desk should
  // not block on seven separate analytics queries for a chart no one needs.
  const [published, drafts, review, recent, categories, reviewRows] = await Promise.all([
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'published' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'draft' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: {
      workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' },
    } }),
    req.payload.find({ collection: 'articles', req, overrideAccess: false, limit: 8, sort: '-updatedAt', depth: 1, draft: true }),
    req.payload.count({ collection: 'categories', req, overrideAccess: false }),
    reviewAccess ? req.payload.find({
      collection: 'articles', req, overrideAccess: false, limit: 3, depth: 1, draft: true,
      sort: '-updatedAt',
      where: { workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' } },
    }) : Promise.resolve(null),
  ]);

  const safeName = user && typeof user === 'object' && 'name' in user && typeof user.name === 'string'
    ? user.name : 'team';

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
          published={published.totalDocs}
          drafts={drafts.totalDocs}
          review={review.totalDocs}
          stories={(recent.docs as ArticleRow[]).map(asStory)}
          reviewStories={reviewRows ? (reviewRows.docs as ArticleRow[]).map(asStory) : []}
          hasSections={categories.totalDocs > 0}
          canWrite={editorial(principal)}
          canManage={reviewAccess}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
