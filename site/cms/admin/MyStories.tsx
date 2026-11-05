import React from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import { getStaff, editorial } from '../access';

type MyStory = {
  id: string | number;
  title?: string;
  updatedAt?: string;
  _status?: string;
  workflowStatus?: string;
  primaryCategory?: { name?: string } | string | number | null;
};

export async function MyStories({ initPageResult, params, searchParams, user }: AdminViewServerProps) {
  const req = initPageResult.req;
  const actor = getStaff(req.user);
  const result = actor ? await req.payload.find({
    collection: 'articles', req, overrideAccess: false,
    where: { createdBy: { equals: actor.id } },
    sort: '-updatedAt', depth: 1, draft: true, limit: 50,
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
              <p className="ogas-review-eyebrow">YOUR WRITING DESK</p>
              <h1>My stories</h1>
              <p>Continue writing, respond to feedback or revisit published reporting.</p>
            </div>
            {actor && editorial(actor) && <a className="ogas-review-all" href="/admin/collections/articles/create">＋ New story</a>}
          </header>
          {!actor ? (
            <div className="ogas-review-empty"><h2>Sign in to continue.</h2><p>Your stories are private until you sign in.</p></div>
          ) : !result?.docs.length ? (
            <div className="ogas-review-empty">
              <div className="ogas-review-empty__icon" aria-hidden="true">✎</div>
              <h2>Every good report starts somewhere.</h2>
              <p>No stories have been created from your account yet. Start a new report and save your draft as you write.</p>
              {editorial(actor) && <a href="/admin/collections/articles/create">Write your first story →</a>}
            </div>
          ) : (
            <div className="ogas-review-list">
              <div className="ogas-review-list__top">{result.totalDocs} {result.totalDocs === 1 ? 'story' : 'stories'} from your account</div>
              <table>
                <thead><tr><th>Story</th><th>Status</th><th>Last updated</th><th>Action</th></tr></thead>
                <tbody>{(result.docs as MyStory[]).map((story) => (
                  <tr key={String(story.id)}>
                    <td><strong>{story.title || 'Untitled story'}</strong>
                      <small>{story.primaryCategory && typeof story.primaryCategory === 'object' ? story.primaryCategory.name || '—' : '—'}</small>
                    </td>
                    <td><span className={'nr-status nr-status--' + (story._status === 'published' ? 'published' : story.workflowStatus === 'in_review' ? 'review' : 'draft')}>
                      {story._status === 'published' ? 'Published' : story.workflowStatus === 'in_review' ? 'In review' : story.workflowStatus === 'changes_requested' ? 'Changes requested' : 'Draft'}
                    </span></td>
                    <td>{story.updatedAt ? new Intl.DateTimeFormat('en-NG', {day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'}).format(new Date(story.updatedAt)) : '—'}</td>
                    <td><a href={'/admin/collections/articles/' + encodeURIComponent(story.id)}>Open story ↗</a></td>
                  </tr>
                ))}</tbody>
              </table>
              {result.hasNextPage && <p className="ogas-review-more">Showing the 50 most recent stories from your account.</p>}
            </div>
          )}
        </main>
      </Gutter>
    </DefaultTemplate>
  );
}
