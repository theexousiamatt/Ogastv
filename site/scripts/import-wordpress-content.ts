/**
 * WordPress -> Payload importer for OgasTV Africa.
 *
 * Read-only source. Writes exclusively to the OgasTV Payload database.
 * Idempotent by WordPress ID (or taxonomy slug). NEVER deletes/overwrites
 * existing documents and NEVER marks imported posts as published.
 *
 * Run: WORDPRESS_IMPORT_EXECUTE=YES payload run ./scripts/import-wordpress-content.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { getPayload } from 'payload';
import { decode } from 'html-entities';
import config from '../payload.config';

type Rendered = { rendered?: string };
type WordPressCategory = { id: number; name: string; slug: string; description?: string };
type WordPressTag = { id: number; name: string; slug: string };
type WordPressAuthor = { id: number; name: string };
type WordPressMedia = {
  id: number; source_url?: string; link?: string; mime_type?: string;
  alt_text?: string; caption?: Rendered; date_gmt?: string; date?: string;
  title?: Rendered;
};
type WordPressPage = {
  id: number; slug: string; link: string; title: Rendered;
  content?: Rendered; excerpt?: Rendered; parent?: number; date_gmt?: string; date?: string;
};
type WordPressPost = {
  id: number; slug: string; link: string; status?: string; title: Rendered;
  excerpt: Rendered; content: Rendered; date_gmt?: string; date?: string;
  categories?: number[]; tags?: number[]; author?: number; featured_media?: number;
  _embedded?: { author?: WordPressAuthor[]; 'wp:featuredmedia'?: WordPressMedia[] };
};

const SOURCE = 'https://ogastvafrica.ng/wp-json/wp/v2';
let reportedMediaTotal = 0;
let inaccessibleMediaCount = 0;
const execute = process.env.WORDPRESS_IMPORT_EXECUTE === 'YES';
const limit = Number(process.env.WORDPRESS_IMPORT_LIMIT || '0');
if (!Number.isSafeInteger(limit) || limit < 0 || limit > 100000) {
  throw new Error('Invalid WORDPRESS_IMPORT_LIMIT');
}
if (execute) {
  const isCi = process.env.CI === 'true'
    && process.env.NEXT_PUBLIC_SERVER_URL === 'http://localhost:3000'
    && process.env.DATABASE_URL?.includes('@localhost:5432/ogastv_ci');
  const isStaging = process.env.NEXT_PUBLIC_SERVER_URL === 'https://ogastv-cms.inspirarestudio.com'
    && process.env.DATABASE_URL?.includes('cjyhayrxadyadaqdrlot');
  if (!isCi && !isStaging) {
    throw new Error('Refusing WordPress migration outside approved disposable CI or OgasTV staging database');
  }
}

function textValue(html = ''): string {
  return decode(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
}
function timestamp(item: { date_gmt?: string; date?: string }): string | undefined {
  const sourceDate = item.date_gmt && item.date_gmt !== '0000-00-00T00:00:00'
    ? item.date_gmt + 'Z'
    : item.date ? item.date + '+01:00' : '';
  const date = new Date(sourceDate);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
function asString(value: string | undefined, max: number): string {
  return (value || '').slice(0, max);
}
const summary = (rawExcerpt: string, html: string): string =>
  asString(textValue(rawExcerpt) || textValue(html) || 'Archived OgasTV Africa report.', 800);

// Lossless article rendering uses legacyHtml. This lightweight Lexical view
// gives editors readable paragraphs without requiring a DOM emulation package.
function toLegacyLexical(html: string, fallback: string) {
  const text = decode(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article)>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .trim());
  const paragraphs = (text || fallback).split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  return {
    root: {
      type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
      children: paragraphs.map(s => ({
        type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
        textFormat: 0, textStyle: '',
        children: [{ type: 'text', text: s, mode: 'normal', detail: 0, format: 0, style: '', version: 1 }],
      })),
    },
  };
}

async function fetchAll<T extends { id: number }>(resource: string, options: Record<string, string> = {}): Promise<T[]> {
  const docs: T[] = [];
  const pageSize = resource === 'media' ? 25 : 100;
  const pageStats: string[] = [];
  let total: number | undefined;
  for (let page = 1; ; page++) {
    if (page > 1000) throw new Error(resource + ': pagination limit exceeded');
    const url = new URL(SOURCE + '/' + resource);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(pageSize));
    url.searchParams.set('orderby', 'id');
    url.searchParams.set('order', 'asc');
    for (const [key, value] of Object.entries(options)) url.searchParams.set(key, value);

    let response: Response | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(url, {
          method: 'GET', redirect: 'follow',
          headers: { Accept: 'application/json', 'User-Agent': 'OgasTVContentMigration/1.0 (read only)' },
          signal: AbortSignal.timeout(45000),
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        break;
      } catch (error) {
        if (attempt === 3) throw new Error(resource + ' page ' + page + ': ' + String(error));
        await new Promise((resolve) => setTimeout(resolve, attempt * 800));
      }
    }
    if (!response) throw new Error(resource + ': missing response');
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error(resource + ' page ' + page + ': not a JSON array');
    const headerTotal = Number(response.headers.get('x-wp-total'));
    const pageCount = Number(response.headers.get('x-wp-totalpages'));
    if (!Number.isSafeInteger(headerTotal) || !Number.isSafeInteger(pageCount) || pageCount < 1) {
      throw new Error(resource + ': missing WordPress pagination headers');
    }
    if (total === undefined) total = headerTotal;
    docs.push(...payload as T[]);
    pageStats.push('p' + page + ':' + payload.length);
    if (page >= pageCount) break;
  }
  if (docs.length !== total) {
    const missing = (total || 0) - docs.length;
    if (resource === 'media' && missing > 0 && missing <= 8) {
      reportedMediaTotal = total || 0;
      inaccessibleMediaCount = missing;
      console.warn('WordPress MEDIA discrepancy: reported=' + total + ', accessible=' + docs.length + ', missing=' + missing + '; pages=' + pageStats.join(','));
    } else {
      throw new Error(resource + ': count mismatch. Expected ' + total + ', fetched ' + docs.length + '; page sizes=' + pageStats.join(','));
    }
  }
  if (new Set(docs.map((item) => item.id)).size !== docs.length) {
    throw new Error(resource + ': duplicate WordPress IDs in source');
  }
  return docs;
}

const [categories, tags, authors, media, pages, posts] = await Promise.all([
  fetchAll<WordPressCategory>('categories', { hide_empty: '0' }),
  fetchAll<WordPressTag>('tags', { hide_empty: '0' }),
  fetchAll<WordPressAuthor>('users'),
  fetchAll<WordPressMedia>('media'),
  fetchAll<WordPressPage>('pages', { status: 'publish' }),
  fetchAll<WordPressPost>('posts', { status: 'publish', _embed: '1' }),
]);
const sourceCounts = {
  posts: posts.length, pages: pages.length, media: media.length,
  mediaReported: reportedMediaTotal || media.length, inaccessibleMediaCount,
  categories: categories.length, tags: tags.length, authors: authors.length,
};
console.log('OgasTV WordPress source snapshot:', JSON.stringify(sourceCounts));
if (!posts.length || !categories.length) throw new Error('Source contains no posts or categories; aborting');

const counters: Record<string, { created: number; alreadyPresent: number; failed: number }> = {};
for (const kind of ['categories', 'tags', 'media', 'pages', 'articles']) {
  counters[kind] = { created: 0, alreadyPresent: 0, failed: 0 };
}
const failures: { collection: string; wordpressId: number; reason: string }[] = [];

if (execute) {
  const cms = await getPayload({ config });
  const categoryIds = new Map<number, number | string>();
  const tagIds = new Map<number, number | string>();
  const authorNames = new Map(authors.map((a) => [a.id, textValue(a.name)]));
  const mediaById = new Map(media.map((asset) => [asset.id, asset]));

  async function existsBy(collection: string, field: string, value: string | number) {
    const result = await cms.find({
      collection: collection as 'articles',
      where: { [field]: { equals: value } },
      overrideAccess: true, depth: 0, limit: 1,
    });
    return result.docs[0] || null;
  }
  async function record(kind: string, wpId: number, action: () => Promise<void>) {
    try { await action(); }
    catch (error) {
      counters[kind].failed++;
      failures.push({
        collection: kind, wordpressId: wpId,
        reason: error instanceof Error ? error.message.slice(0, 220) : 'unknown error',
      });
      if (failures.length <= 4) console.error(kind + ': cannot import WordPress #' + wpId);
    }
  }

  for (const term of categories) await record('categories', term.id, async () => {
    const previous = await existsBy('categories', 'slug', term.slug);
    if (previous) {
      categoryIds.set(term.id, previous.id);
      counters.categories.alreadyPresent++;
      return;
    }
    const created = await cms.create({
      collection: 'categories', overrideAccess: true,
      data: {
        name: asString(textValue(term.name), 120),
        slug: term.slug,
        description: textValue(term.description || ''),
      },
    });
    categoryIds.set(term.id, created.id);
    counters.categories.created++;
  });

  if (!categoryIds.size) throw new Error('No valid categories imported. Aborting article migration.');

  for (const term of tags) await record('tags', term.id, async () => {
    const previous = await existsBy('tags', 'slug', term.slug);
    if (previous) {
      tagIds.set(term.id, previous.id);
      counters.tags.alreadyPresent++;
      return;
    }
    const created = await cms.create({
      collection: 'tags', overrideAccess: true,
      data: { name: textValue(term.name), slug: term.slug },
    });
    tagIds.set(term.id, created.id);
    counters.tags.created++;
  });

  // The 313+ source attachments are inventoried, NOT silently claimed as uploaded.
  // Durable media storage and checksums must be completed before production cutover.
  for (const file of media) await record('media', file.id, async () => {
    if (await existsBy('wordpress-media', 'wordpressId', file.id)) {
      counters.media.alreadyPresent++;
      return;
    }
    await cms.create({
      collection: 'wordpress-media',
      overrideAccess: true,
      data: {
        wordpressId: file.id, sourceUrl: file.source_url || file.link || SOURCE,
        originalUrl: file.link || '',
        mimeType: file.mime_type || '',
        alt: asString(textValue(file.alt_text || ''), 4000),
        caption: asString(textValue(file.caption?.rendered || ''), 15000),
        publishedAt: timestamp(file),
      } as any,
    });
    counters.media.created++;
  });

  for (const page of pages) await record('pages', page.id, async () => {
    if (await existsBy('wordpress-pages', 'wordpressId', page.id)) {
      counters.pages.alreadyPresent++;
      return;
    }
    await cms.create({
      collection: 'wordpress-pages', overrideAccess: true,
      data: {
        wordpressId: page.id, title: textValue(page.title?.rendered || '') || 'Untitled page',
        slug: page.slug, originalUrl: page.link,
        originalHtml: page.content?.rendered || '',
        excerpt: summary(page.excerpt?.rendered || '', page.content?.rendered || ''),
        publishedAt: timestamp(page), parentWordpressId: page.parent || undefined,
      } as any,
    });
    counters.pages.created++;
  });

  const chosenPosts = limit ? posts.slice(0, limit) : posts;
  for (const post of chosenPosts) await record('articles', post.id, async () => {
    if (await existsBy('articles', 'originalWordpressId', post.id)) {
      counters.articles.alreadyPresent++;
      return;
    }
    if (await existsBy('articles', 'slug', post.slug)) {
      throw new Error('Slug conflict with an unrelated article: ' + post.slug);
    }
    const primary = (post.categories || []).map((id) => categoryIds.get(id)).find(Boolean) ?? categoryIds.values().next().value;
    if (!primary) throw new Error('No category available for article');
    const byline = authorNames.get(post.author || 0)
      || post._embedded?.author?.[0]?.name
      || 'OgasTV Africa';
    const featured = mediaById.get(post.featured_media || -1)
      || post._embedded?.['wp:featuredmedia']?.[0];
    const html = post.content?.rendered || '';
    const richText = toLegacyLexical(html, summary(post.excerpt?.rendered || '', html));


    await cms.create({
      collection: 'articles', overrideAccess: true, draft: true,
      data: {
        title: asString(textValue(post.title?.rendered || '') || 'Untitled report', 250),
        slug: post.slug, summary: summary(post.excerpt?.rendered || '', html),
        body: richText, _status: 'draft', workflowStatus: 'draft', editorialType: 'news',
        publicByline: asString(textValue(byline), 250),
        originalWordpressId: post.id,
        originalWordpressUrl: post.link,
        firstPublishedAt: timestamp(post),
        primaryCategory: primary,
        secondaryCategories: (post.categories || []).slice(1).map((id) => categoryIds.get(id)).filter(Boolean),
        tags: (post.tags || []).map((id) => tagIds.get(id)).filter(Boolean),
        legacyHtml: html,
        legacyFeaturedImageUrl: featured?.source_url || undefined,
        legacyFeaturedImageAlt: featured?.alt_text || textValue(post.title?.rendered || ''),
        legacyMediaWordpressId: post.featured_media || undefined,
      } as any,
    });
    counters.articles.created++;
  });
}

const totals = { sourceCounts, executed: execute, importLimit: limit || null, counters, failures };
await mkdir('reports', { recursive: true });
await writeFile('reports/wordpress-import-reconciliation.json', JSON.stringify(totals, null, 2) + '\n');
console.log('Migration reconciliation:', JSON.stringify(totals));
if (failures.length) {
  throw new Error('WordPress import failed for ' + failures.length + ' records; reconciliation is incomplete');
}
