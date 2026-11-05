#!/usr/bin/env node
// Public, read-only WordPress archive; no secrets, no source writes.
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const base = 'https://ogastvafrica.ng/wp-json/wp/v2';
const entries = ['posts', 'pages', 'media', 'categories', 'tags', 'users'];
const records = {};
const counts = {};
let mediaMissing = 0;

for (const kind of entries) {
  const list = [];
  const size = kind === 'media' ? 25 : 100;
  let expected = 0;
  let totalPages = 0;
  for (let page = 1; ; page++) {
    const url = new URL(base + '/' + kind);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(size));
    url.searchParams.set('orderby', 'id');
    url.searchParams.set('order', 'asc');
    if (kind === 'posts' || kind === 'pages') url.searchParams.set('status', 'publish');
    if (kind === 'posts') url.searchParams.set('_embed', '1');
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error(kind + ': page ' + page + ', HTTP ' + response.status);
    expected = Number(response.headers.get('x-wp-total'));
    totalPages = Number(response.headers.get('x-wp-totalpages'));
    if (!Number.isSafeInteger(expected) || !Number.isSafeInteger(totalPages)) throw new Error(kind + ': missing pagination headers');
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error(kind + ': unexpected JSON');
    list.push(...batch);
    if (page >= totalPages) break;
  }
  if (list.length !== expected) {
    if (kind === 'media' && expected - list.length > 0 && expected - list.length <= 8) {
      mediaMissing = expected - list.length;
    } else throw new Error(kind + ': expected ' + expected + ' but retrieved ' + list.length);
  }
  if (new Set(list.map(item => item.id)).size !== list.length) throw new Error(kind + ': duplicate IDs');
  records[kind] = list;
  counts[kind] = { apiReported: expected, archived: list.length };
  console.log(kind + ': ' + list.length + ' archived (' + expected + ' reported)');
}

const snapshot = {
  exportedAt: new Date().toISOString(),
  source: base,
  scope: 'public WordPress REST API only',
  notes: { mediaMissing, containsPrivateDrafts: false, altersSource: false },
  counts,
  records,
};
const bytes = Buffer.from(JSON.stringify(snapshot));
const compressed = gzipSync(bytes, { level: 9 });
const checksum = createHash('sha256').update(compressed).digest('hex');
const folder = 'data/wordpress/2026-11-05';
await mkdir(folder, { recursive: true });
await writeFile(folder + '/published-content.json.gz', compressed);
await writeFile(folder + '/manifest.json', JSON.stringify({
  schemaVersion: 1, exportedAt: snapshot.exportedAt, source: base,
  files: { 'published-content.json.gz': { bytes: compressed.byteLength, sha256: checksum } },
  counts, mediaMissing, onlyPublicContent: true,
}, null, 2) + '\n');
console.log('Archive bytes=' + compressed.byteLength + ' sha256=' + checksum);
