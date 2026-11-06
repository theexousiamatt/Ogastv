import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { canReview, getStaff } from '../access';

type ReviewRow = {
  id: string | number;
  title?: string;
  updatedAt?: string;
  primaryCategory?: { name?: string } | string | number | null;
  publicByline?: string;
};

export async function ReviewQueue({
  initPageResult, params, searchParams, user,
}: AdminViewServerProps) {
  const req = initPageResult.req;
  const principal = getStaff(req.user);
  const allowed = Boolean(principal && canReview(principal));

  // No data is fetched with elevated permissions, even if the URL is guessed.
  const stories = allowed ? await req.payload.find({
    collection: 'articles',
    where: { workflowStatus: { equals: 'in_review' }, _status: { not_equals: 'published' } },
    sort: '-updatedAt',
    limit: 30,
    depth: 1,
    draft: true,
    overrideAccess: false,
    req,
  }) : null;

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
        <main className="ogas-review-page">
          <a className="ogas-review-back" href="/admin">← Newsroom</a>
          <header className="ogas-review-heading">
            <div>
              <p className="ogas-review-eyebrow">EDITORIAL DESK</p>
              <h1>Review queue</h1>
              <p>Stories waiting for an editor’s attention.</p>
            </div>
            <a href="/admin/collections/articles" className="ogas-review-all">All stories ↗</a>
          </header>
          {!allowed ? (
            <div className="ogas-review-empty">
              <h2>Editorial permission required</h2>
              <p>Only editors and administrators can review submitted stories.</p>
            </div>
          ) : !stories?.docs.length ? (
            <div className="ogas-review-empty">
              <div className="ogas-review-empty__icon" aria-hidden="true">✓</div>
              <h2>All caught up.</h2>
              <p>No stories are waiting for review. New submissions will appear here automatically.</p>
              <a href="/admin/collections/articles">Browse all stories →</a>
            </div>
          ) : (
            <div className="ogas-review-list">
              <div className="ogas-review-list__top">{stories.totalDocs} {stories.totalDocs === 1 ? 'story' : 'stories'} awaiting review</div>
              <table>
                <thead><tr><th>Story</th><th>Section</th><th>Updated</th><th>Action</th></tr></thead>
                <tbody>{(stories.docs as ReviewRow[]).map((story) => (
                  <tr key={String(story.id)}>
                    <td data-label="Story"><strong>{story.title || 'Untitled story'}</strong>{story.publicByline && <small>{story.publicByline}</small>}</td>
                    <td data-label="Section">{story.primaryCategory && typeof story.primaryCategory === 'object' ? story.primaryCategory.name || '—' : '—'}</td>
                    <td data-label="Updated">{story.updatedAt ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(story.updatedAt)) : '—'}</td>
                    <td data-label="Action"><a href={'/admin/collections/articles/' + encodeURIComponent(story.id)}>Open story ↗</a></td>
                  </tr>
                ))}</tbody>
              </table>
              {stories.hasNextPage && <p className="ogas-review-more">Showing the 30 latest submissions. View all stories for older entries.</p>}
            </div>
          )}
        </main>
      </Gutter>
    </DefaultTemplate>
  );
}
