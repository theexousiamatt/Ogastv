// Public-facing content provider. WordPress stays read-only until migration is reconciled.
// Set CMS_CONTENT_SOURCE=payload only after the Payload database is populated.
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import * as wp from './wordpress';
import sanitizeHtml from 'sanitize-html';
import type { Article, Category } from './wordpress';

export type { Article, Category } from './wordpress';
export { prettyDate } from './wordpress';

type Relation = number | string | { id: number | string; name?: string; slug?: string; url?: string; alt?: string } | null;
type CmsArticle = {
  id: number | string;
  slug: string;
  title: string;
  summary?: string;
  body?: SerializedEditorState;
  legacyHtml?: string | null;
  legacyFeaturedImageUrl?: string | null;
  legacyFeaturedImageAlt?: string | null;
  firstPublishedAt?: string;
  createdAt?: string;
  publishedAt?: string;
  originalWordpressUrl?: string;
  primaryCategory?: Relation;
  featuredImage?: Relation;
  publicByline?: string;
};

// The original WordPress site is retired. A stale Hostinger environment
// setting must not make production fetch the deleted WordPress endpoint.
const payloadEnabled = () =>
  process.env.CMS_CONTENT_SOURCE === 'payload' ||
  process.env.NEXT_PUBLIC_SERVER_URL === 'https://ogastv-cms.inspirarestudio.com' ||
  process.env.NEXT_PUBLIC_SERVER_URL === 'https://ogastvafrica.ng';

async function cms() {
  const [{ getPayload }, module] = await Promise.all([import('payload'), import('@payload-config')]);
  return getPayload({ config: module.default });
}

function mapArticle(doc: CmsArticle): Article {
  const category = doc.primaryCategory && typeof doc.primaryCategory === 'object' ? doc.primaryCategory : null;
  const image = doc.featuredImage && typeof doc.featuredImage === 'object' ? doc.featuredImage : null;
  const legacyMedia = doc.legacyFeaturedImageUrl && doc.legacyFeaturedImageUrl.startsWith('https://ogastvafrica.ng/')
    ? doc.legacyFeaturedImageUrl : null;
  const importedBody = doc.legacyHtml ? sanitizeHtml(doc.legacyHtml, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'figure', 'figcaption', 'img', 'picture', 'source', 'iframe', 'video', 'audio'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
      source: ['src', 'srcset', 'type', 'media', 'sizes'],
      iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
      video: ['src', 'controls', 'poster'],
      audio: ['src', 'controls'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com'],
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'], iframe: ['https'], source: ['https'], video: ['https'], audio: ['https'] },
  }) : null;
  return {
    id: Number(doc.id),
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.summary || '',
    html: importedBody ?? (doc.body ? convertLexicalToHTML({ data: doc.body }) : ''),
    date: doc.firstPublishedAt || doc.publishedAt || doc.createdAt || new Date(0).toISOString(),
    originalUrl: doc.originalWordpressUrl || '',
    category: category?.slug && category?.name ? { slug: category.slug, name: category.name } : null,
    author: doc.publicByline || null,
    image: image?.url ? { url: image.url, alt: image.alt || doc.title } : legacyMedia ? { url: legacyMedia, alt: doc.legacyFeaturedImageAlt || doc.title } : null,
  };
}

export async function getCategories(): Promise<Category[]> {
  if (!payloadEnabled()) return wp.getCategories();
  const api = await cms();
  const result = await api.find({ collection: 'categories', overrideAccess: false, limit: 100, sort: 'name', depth: 0 });
  return result.docs.map((category) => ({ id: Number(category.id), name: category.name, slug: category.slug }));
}

export async function getArticles(limit = 24): Promise<Article[]> {
  if (!payloadEnabled()) return wp.getArticles(limit);
  const api = await cms();
  const result = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2,
    where: { _status: { equals: 'published' } }, sort: '-createdAt',
    limit: Math.min(limit, 100),
  });
  return (result.docs as CmsArticle[]).map(mapArticle);
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!payloadEnabled()) return wp.getArticle(slug);
  const api = await cms();
  const result = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2, limit: 1,
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
  });
  return result.docs[0] ? mapArticle(result.docs[0] as CmsArticle) : null;
}

export async function getArticlesInCategory(slug: string, limit = 24): Promise<Article[]> {
  if (!payloadEnabled()) return wp.getArticlesInCategory(slug, limit);
  const api = await cms();
  const categories = await api.find({
    collection: 'categories', overrideAccess: false, limit: 1,
    where: { slug: { equals: slug } },
  });
  const category = categories.docs[0];
  if (!category) return [];
  const result = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2, limit: Math.min(limit, 100),
    where: { and: [{ primaryCategory: { equals: category.id } }, { _status: { equals: 'published' } }] },
    sort: '-createdAt',
  });
  return (result.docs as CmsArticle[]).map(mapArticle);
}
