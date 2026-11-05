import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { canPublish, canReview, editorial, getStaff, hasRole } from '../access';
import { NewsroomHome, type NewsroomStory } from './NewsroomHome';

type ArticleRow = {
  id: number | string;
  title?: string;
  updatedAt?: string;
  _status?: string;
  workflowStatus?: string;
  primaryCategory?: { name?: string } | number | string | null;
};

export async function NewsroomDashboard({
  initPageResult, params, searchParams, user,
}: AdminViewServerProps) {
  const req = initPageResult.req;
  const principal = getStaff(req.user);

  // Payload views are not authenticated by default. Do not query or render
  // editorial records for an unauthenticated visitor.
  if (!principal) {
    return <Gutter><p role="alert">Please sign in to access the newsroom.</p></Gutter>;
  }

  // Only use the req-scoped API with access enforcement. Do not bypass role
  // checks to populate dashboard metrics.
  const [published, drafts, review, media, recent] = await Promise.all([
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'published' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { _status: { equals: 'draft' } } }),
    req.payload.count({ collection: 'articles', req, overrideAccess: false, where: { workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' } } }),
    req.payload.count({ collection: 'media', req, overrideAccess: false }),
    req.payload.find({ collection: 'articles', req, overrideAccess: false, limit: 7, sort: '-updatedAt', depth: 1 }),
  ]);

  const stories: NewsroomStory[] = (recent.docs as ArticleRow[]).map((item) => ({
    id: String(item.id),
    title: item.title || 'Untitled story',
    category: item.primaryCategory && typeof item.primaryCategory === 'object'
      ? item.primaryCategory.name || 'Uncategorised'
      : 'Uncategorised',
    status: item._status === 'published' ? 'published' : item.workflowStatus === 'in_review' ? 'review' : 'draft',
    updatedAt: item.updatedAt
      ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(item.updatedAt))
      : '—',
  }));

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
          stories={stories}
          canWrite={editorial(principal)}
          canManage={canReview(principal)}
          canPublish={canPublish(principal)}
          canModerate={hasRole(principal,'administrator','editor_in_chief','editor','moderator')}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
