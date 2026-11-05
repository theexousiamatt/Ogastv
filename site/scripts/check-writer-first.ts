/**
 * Runs ONLY against a disposable CI PostgreSQL database.
 * Validates that the simplified editor still creates drafts in Payload.
 * Never run this against production: it creates test records.
 */
import { getPayload } from 'payload';
import config from '../payload.config';

const source = process.env.DATABASE_URL || '';
if (!source.includes('ogastv_ci') || process.env.NODE_ENV === 'production') {
  throw new Error('Writer-desk integration test is restricted to disposable CI.');
}

const payload = await getPayload({ config });
try {
  const administrator = await payload.create({
    collection: 'staff-users',
    data: {
      name: 'CI Editor',
      email: 'ops@inspirarestudio.com',
      password: 'ci-only-protected-test-password-2026',
      role: 'administrator',
    },
    overrideAccess: true,
    disableVerificationEmail: true,
    context: { verifiedFirstAdminInvite: true },
  });

  const section = await payload.create({
    collection: 'categories',
    data: { name: 'News', slug: 'news' },
    overrideAccess: true,
  });

  const article = await payload.create({
    collection: 'articles',
    overrideAccess: true,
    data: {
      title: 'Community report from Lagos',
      summary: 'A test of the new story-first writing and review workflow.',
      body: {
        root: {
          type: 'root',
          children: [{
            type: 'paragraph',
            version: 1,
            format: '',
            indent: 0,
            direction: 'ltr',
            children: [{
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'This story was written in an isolated test database.',
            }],
          }],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      primaryCategory: section.id,
      author: administrator.id,
      workflowStatus: 'draft',
      _status: 'draft',
    },
  });

  if (article.slug !== 'community-report-from-lagos') {
    throw new Error('Article slug was not generated from the headline.');
  }
  const updated = await payload.update({
    collection: 'articles',
    id: article.id,
    overrideAccess: true,
    data: { workflowStatus: 'in_review' },
    draft: true,
  });
  if (updated.workflowStatus !== 'in_review') {
    throw new Error('Story failed to move to editorial review.');
  }
  const found = await payload.findByID({
    collection: 'articles',
    id: article.id,
    draft: true,
    overrideAccess: true,
  });
  if (!found || found.title !== article.title) {
    throw new Error('Saved article was not retrievable.');
  }
  console.log('Writer-first CI: draft saved, URL generated, review status updated, and article retrieved.');
} finally {
  await payload.db.destroy();
}
