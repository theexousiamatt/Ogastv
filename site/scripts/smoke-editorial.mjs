import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Destructive tests ONLY on the disposable, loopback-bound GitHub Actions database.
// Never run against any public hostname or any customer database.
const base = 'http://127.0.0.1:3100';
if (process.env.CI !== 'true' ||
    !process.env.DATABASE_URL?.includes('@localhost:5432/ogastv_ci') ||
    process.env.DATABASE_TLS_REQUIRED !== 'false') {
  throw new Error('OgasTV editorial smoke tests require disposable CI PostgreSQL and loopback server');
}

const credential = { email: 'ops@inspirarestudio.com', password: 'local-test-password-very-long-2026' };
async function api(path, { method = 'GET', data, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'JWT ' + token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method, headers, body: form || (data === undefined ? undefined : JSON.stringify(data)),
    redirect: 'manual', cache: 'no-store',
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw: raw.slice(0, 150) }; }
  return { status: response.status, body };
}
const requireStatus = (result, desired, label) => {
  assert.equal(result.status, desired, label + ' HTTP ' + result.status + ': ' + JSON.stringify(result.body).slice(0, 650));
  return result.body;
};
async function login(email, password) {
  const r = await api('/api/staff-users/login', { method: 'POST', data: { email, password } });
  const b = requireStatus(r, 200, 'staff login');
  assert.ok(b.token && b.user?.id, 'Login returns a token and actor id');
  return b;
}
const richText = {
  root: {
    type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
    children: [{
      type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '',
      children: [{ type: 'text', text: 'Internal CI editorial test content.', mode: 'normal', detail: 0, format: 0, style: '', version: 1 }],
    }],
  },
};
const unique = 'ci-' + Date.now().toString(36);
const admin = await login(credential.email, credential.password);

// Anonymous users cannot mutate categories or upload new media.
const deniedCategory = await api('/api/categories', { method: 'POST', data: { name: 'Forbidden', slug: unique + '-forbidden' } });
assert.ok([401, 403].includes(deniedCategory.status), 'Anonymous category mutation denied');

const categoryResponse = await api('/api/categories', {
  method: 'POST', token: admin.token, data: { name: 'CI Editorial QA', slug: unique + '-category' },
});
const category = requireStatus(categoryResponse, 201, 'admin creates category').doc;
assert.ok(category?.id, 'Category saved');

async function newArticle(token, authorId, name, extra = {}) {
  const slug = unique + '-' + name;
  const response = await api('/api/articles?draft=true', {
    method: 'POST', token, data: {
      title: 'Internal CI ' + name, slug,
      summary: 'A temporary article used only in disposable CI.',
      body: richText, author: authorId,
      primaryCategory: category.id, editorialType: 'news',
      workflowStatus: 'draft', _status: 'draft', ...extra,
    },
  });
  const doc = requireStatus(response, 201, name + ' draft creation').doc;
  assert.ok(doc?.id, 'Article id exists');
  return { ...doc, slug };
}
const article = await newArticle(admin.token, admin.user.id, 'admin-draft');
const getPublicArticle = async (slug) => api('/api/articles?where[slug][equals]=' + encodeURIComponent(slug) + '&depth=0');

let publicResult = await getPublicArticle(article.slug);
requireStatus(publicResult, 200, 'public draft query');
assert.equal(publicResult.body.totalDocs, 0, 'Drafts are hidden from anonymous readers');

const prematurePublish = await api('/api/articles/' + article.id, {
  method: 'PATCH', token: admin.token, data: { _status: 'published' },
});
assert.ok(prematurePublish.status >= 400, 'Admin cannot publish before editorial approval');

requireStatus(await api('/api/articles/' + article.id, {
  method: 'PATCH', token: admin.token, data: { workflowStatus: 'approved' },
}), 200, 'admin approves draft');

requireStatus(await api('/api/articles/' + article.id, {
  method: 'PATCH', token: admin.token, data: { _status: 'published' },
}), 200, 'admin publishes approved draft');

publicResult = await getPublicArticle(article.slug);
requireStatus(publicResult, 200, 'public published article query');
assert.ok(publicResult.body.docs?.length === 1, 'Approved, published article is visible to readers');

// Create limited staff roles through the administrator, not anonymous registration.
async function makeStaff(role) {
  const email = unique + '-' + role + '@example.invalid';
  const password = 'ci-role-test-unique-password-2026';
  const result = await api('/api/staff-users', {
    method: 'POST', token: admin.token,
    data: { name: 'CI ' + role, email, role, password },
  });
  requireStatus(result, 201, 'admin creates ' + role);
  // Test-only database operation, NEVER enabled outside an ephemeral CI database.
  execFileSync('psql', ['-h', 'localhost', '-U', 'postgres', '-d', 'ogastv_ci',
    '-v', 'ON_ERROR_STOP=1', '-c',
    "UPDATE ogastv.staff_users SET _verified=true WHERE email='" + email + "'"],
    { env: { ...process.env, PGPASSWORD: 'temporary-ci-db-password' }, stdio: 'ignore' });
  return login(email, password);
}
const journalist = await makeStaff('journalist');
const editor = await makeStaff('editor');

// Journalists cannot edit published articles or approve/publish their own drafts.
const writerEditPublished = await api('/api/articles/' + article.id, {
  method: 'PATCH', token: journalist.token, data: { title: 'Not authorized change' },
});
assert.ok(writerEditPublished.status >= 400, 'Journalist cannot edit published content');

const writerArticle = await newArticle(journalist.token, journalist.user.id, 'reporter-draft');
const writerPublish = await api('/api/articles/' + writerArticle.id, {
  method: 'PATCH', token: journalist.token, data: { _status: 'published', workflowStatus: 'approved' },
});
assert.ok(writerPublish.status >= 400, 'Journalist cannot approve or publish');

const writerToReview = await api('/api/articles/' + writerArticle.id, {
  method: 'PATCH', token: journalist.token, data: { workflowStatus: 'in_review' },
});
requireStatus(writerToReview, 200, 'journalist submits article for review');

const editorReview = await api('/api/articles/' + writerArticle.id, {
  method: 'PATCH', token: editor.token, data: { workflowStatus: 'approved' },
});
requireStatus(editorReview, 200, 'editor approves article');

const editorPublish = await api('/api/articles/' + writerArticle.id, {
  method: 'PATCH', token: editor.token, data: { _status: 'published' },
});
assert.ok(editorPublish.status >= 400, 'Editor cannot publish, even when approved');

const editorMutatePublished = await api('/api/articles/' + article.id, {
  method: 'PATCH', token: editor.token, data: { title: 'Unauthorized published edit' },
});
assert.ok(editorMutatePublished.status >= 400, 'Editor cannot silently change already published article');

requireStatus(await api('/api/articles/' + writerArticle.id, {
  method: 'PATCH', token: admin.token, data: { _status: 'published' },
}), 200, 'administrator publishes reviewed journalist article');

const uploaded = new FormData();
uploaded.append('_payload', JSON.stringify({ alt: '1x1 CI image upload test' }));
uploaded.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nQAAAABJRU5ErkJggg==','base64')], { type: 'image/png' }), 'qa-1px.png');
const media = await api('/api/media', { method: 'POST', token: admin.token, form: uploaded });
requireStatus(media, 201, 'editorial media image upload');
assert.ok(media.body.doc?.id, 'Media record created');

console.log('PASS: draft visibility, editorial review, role access, published edits, image uploads');
