#!/usr/bin/env node
// Strict, read-only audit of OgasTV's PUBLIC WordPress API; no credentials or mutations.
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.WORDPRESS_API_BASE || 'https://ogastvafrica.ng/wp-json/wp/v2').replace(/\/+$/, '');
if (!base.startsWith('https://ogastvafrica.ng/wp-json/wp/v2')) {
  throw new Error('Refusing to inventory any site other than the approved OgasTV source');
}
const resources = ['posts', 'pages', 'media', 'categories', 'tags', 'users'];
const report = { source: base, auditedAt: new Date().toISOString(), method: 'public read-only REST API', resources: {} };
let sourcePostsAvailable = false;

for (const resource of resources) {
  const u = new URL(base + '/' + resource);
  u.searchParams.set('per_page', '1');
  if (resource === 'posts' || resource === 'pages') u.searchParams.set('status', 'publish');
  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(u, {
        method: 'GET', redirect: 'follow',
        headers: { Accept: 'application/json', 'User-Agent': 'OgasTVMigrationAudit/1.0 (read only)' },
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const firstPage = await response.json();
      if (!Array.isArray(firstPage)) throw new Error('Unexpected non-array WordPress response');
      const total = Number(response.headers.get('x-wp-total'));
      const pages = Number(response.headers.get('x-wp-totalpages'));
      if (!Number.isSafeInteger(total) || total < 0) throw new Error('Missing or malformed X-WP-Total header');
      result = { accessible: true, total, pages, example: firstPage[0] ? {
        id: firstPage[0].id, slug: firstPage[0].slug,
        date: firstPage[0].date,
        hasBody: typeof firstPage[0].content?.rendered === 'string',
        hasFeaturedMedia: Boolean(firstPage[0].featured_media),
      } : null };
      break;
    } catch (error) {
      result = { accessible: false, error: error instanceof Error ? error.message : 'unknown error' };
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  report.resources[resource] = result;
  console.log(resource.padEnd(12), JSON.stringify(result));
  if (resource === 'posts' && result.accessible) sourcePostsAvailable = true;
}
await mkdir('reports', { recursive: true });
await writeFile('reports/wordpress-inventory.json', JSON.stringify(report, null, 2) + '\n');
console.log('Report archived at reports/wordpress-inventory.json');
if (!sourcePostsAvailable) {
  console.error('Published WordPress posts unavailable. Stop migration; no database changes permitted.');
  process.exitCode = 1;
}
