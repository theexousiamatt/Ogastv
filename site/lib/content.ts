// Public-facing content provider. WordPress stays read-only until migration is reconciled.
// Set CMS_CONTENT_SOURCE=payload only after the Payload database is populated.
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import * as wp from './wordpress';
import sanitizeHtml from 'sanitize-html';
import type { Article, Category } from './wordpress';
import { homepageCategoryDefinitions, preferredSectionSlug, archiveCategoryAliases } from './editorial-sections';
import type { HomepageCategoryKey } from './editorial-sections';

export type { Article, Category } from './wordpress';
export { prettyDate } from './wordpress';

type Relation = number | string | { id: number | string; name?: string; slug?: string; url?: string; alt?: string; caption?: string; credit?: string } | null;
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
  updatedAt?: string;
  publishedAt?: string;
  subtitle?: string;
  editorialType?: string;
  correctionNotice?: string;
  metaTitle?: string;
  metaDescription?: string;
  locations?: Relation[];
  originalWordpressUrl?: string;
  primaryCategory?: Relation;
  featuredImage?: Relation;
  publicByline?: string;
};

/** Selecting story-card fields avoids loading rich-text bodies and revisions
 * into every homepage and archive card. Populated image/category relations stay. */
const CARD_FIELDS = {
  title:true,slug:true,summary:true,firstPublishedAt:true,createdAt:true,
  updatedAt:true,primaryCategory:true,featuredImage:true,publicByline:true,
  editorialType:true,legacyFeaturedImageUrl:true,legacyFeaturedImageAlt:true,
  originalWordpressUrl:true,
} as const;

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

function mapArticle(doc: CmsArticle, includeBody = false): Article {
  const category = doc.primaryCategory && typeof doc.primaryCategory === 'object' ? doc.primaryCategory : null;
  const image = doc.featuredImage && typeof doc.featuredImage === 'object' ? doc.featuredImage : null;
  const legacyMedia = doc.legacyFeaturedImageUrl && doc.legacyFeaturedImageUrl.startsWith('https://ogastvafrica.ng/')
    ? doc.legacyFeaturedImageUrl : null;
  const importedBody = includeBody && doc.legacyHtml ? sanitizeHtml(doc.legacyHtml, {
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
    // Archive and homepage cards never need rich text HTML conversion.
    html: includeBody ? (importedBody ?? (doc.body ? convertLexicalToHTML({ data: doc.body }) : '')) : '',
    date: doc.firstPublishedAt || doc.publishedAt || doc.createdAt || new Date(0).toISOString(),
    originalUrl: doc.originalWordpressUrl || '',
    category: category?.slug && category?.name ? { slug: category.slug, name: category.name } : null,
    author: doc.publicByline || null,
    image: image?.url ? { url: image.url, alt: image.alt || doc.title, caption: image.caption, credit: image.credit }
      : legacyMedia ? { url: legacyMedia, alt: doc.legacyFeaturedImageAlt || doc.title } : null,
    updatedAt: doc.updatedAt,
    subtitle: doc.subtitle,
    editorialType: doc.editorialType || 'news',
    correctionNotice: doc.correctionNotice,
    metaTitle: doc.metaTitle,
    metaDescription: doc.metaDescription,
    locations: Array.isArray(doc.locations) ? doc.locations
      .filter((item): item is Extract<Relation, object> => item !== null && typeof item === 'object')
      .filter(item => Boolean(item.slug && item.name))
      .map(item => ({slug:item.slug!,name:item.name!})) : [],
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
    collection: 'articles', overrideAccess: false, depth: 2, select: CARD_FIELDS,
    where: { _status: { equals: 'published' } }, sort: '-firstPublishedAt',
    limit: Math.min(limit, 100),
  });
  return (result.docs as CmsArticle[]).map((doc)=>mapArticle(doc));
}

export async function getArticle(slug: string): Promise<Article | null> {
  if (!payloadEnabled()) return wp.getArticle(slug);
  const api = await cms();
  const result = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2, limit: 1,
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
  });
  return result.docs[0] ? mapArticle(result.docs[0] as CmsArticle, true) : null;
}

export async function getArticlesInCategory(slug: string, limit = 24): Promise<Article[]> {
  if (!payloadEnabled()) return wp.getArticlesInCategory(slug, limit);
  const api = await cms();
  const categories = await api.find({
    collection: 'categories', overrideAccess: false, limit: 30,
    where: { slug: { in: archiveCategoryAliases(slug) } },
  });
  if (!categories.docs.length) return [];
  const ids = categories.docs.map(category => category.id);
  const result = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2, select: CARD_FIELDS, limit: Math.min(limit, 100),
    where: { and: [{ _status: { equals: 'published' } }, { or: [
      { primaryCategory: { in: ids } },
      { secondaryCategories: { in: ids } },
    ] }] },
    sort: '-firstPublishedAt',
  });
  return (result.docs as CmsArticle[]).map((doc)=>mapArticle(doc));
}


/**
 * Editorial priority is controlled by Payload's Homepage settings. Only
 * published stories are returned; draft relationships are never exposed.
 * When no stories are selected, the public layout falls back to recent posts.
 */
export type HomepageCuration = {
  lead: Article | null;
  highlights: Article[];
  lagosWatch: Article[];
  government: Article[];
  grassrootsVoices: Article[];
  business: Article[];
  personalities: Article[];
  studioEpisodes: StudioEpisode[];
};

export type StudioEpisode = {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
  thumbnail: { url: string; alt: string } | null;
  releasedAt?: string;
  programmeTitle?: string;
};

const emptyHomepageCuration = (): HomepageCuration => ({
  lead: null, highlights: [], lagosWatch: [], government: [],
  grassrootsVoices: [], business: [], personalities: [], studioEpisodes: [],
});

/**
 * Editors curate the homepage from the existing Payload Homepage global.
 * Exclude drafts, unpopulated relationships and invalid YouTube IDs.
 */
export async function getHomepageCuration(): Promise<HomepageCuration> {
  if (!payloadEnabled()) return emptyHomepageCuration();
  try {
    const api = await cms();
    const homepage = await api.findGlobal({ slug: 'homepage', depth: 2, overrideAccess: false, draft: false });
    const published = (item: unknown): Article | null => {
      if (!item || typeof item !== 'object') return null;
      const article = item as CmsArticle & { _status?: string };
      if (article._status !== 'published' || !article.slug || !article.title) return null;
      return mapArticle(article);
    };
    const publishedList = (value: unknown, limit = 6): Article[] =>
      (Array.isArray(value) ? value : []).map(published)
        .filter((item): item is Article => item !== null).slice(0, limit);

    type CmsEpisode = {
      id: string | number; title?: string; description?: string;
      youtubeVideoId?: string; thumbnail?: Relation; programme?: Relation & {title?:string};
      releasedAt?: string; _status?: string;
    };
    const episode = (value: unknown): StudioEpisode | null => {
      if (!value || typeof value !== 'object') return null;
      const item = value as CmsEpisode;
      if (item._status !== 'published' || !item.title || !/^[\\w-]{11}$/.test(item.youtubeVideoId || '')) return null;
      const thumbnail = item.thumbnail && typeof item.thumbnail === 'object' ? item.thumbnail : null;
      return {
        id: String(item.id), title: item.title, description: item.description || '',
        youtubeVideoId: item.youtubeVideoId!,
        thumbnail: thumbnail?.url ? { url: thumbnail.url, alt: thumbnail.alt || item.title } : null,
        releasedAt: item.releasedAt, programmeTitle: item.programme && typeof item.programme==='object' ? item.programme.title : undefined,
      };
    };
    const featuredEpisode = episode(homepage.featuredEpisode);
    let studioEpisodes: StudioEpisode[] = featuredEpisode ? [featuredEpisode] : [];
    try {
      const recent = await api.find({
        collection: 'episodes', overrideAccess: false, depth: 2, limit: 8,
        where: { _status: { equals: 'published' } }, sort: '-releasedAt',
      });
      for (const item of recent.docs) {
        const valid = episode(item);
        if (valid && !studioEpisodes.some(existing => existing.id === valid.id)) studioEpisodes.push(valid);
        if (studioEpisodes.length >= 3) break;
      }
    } catch (error) {
      console.error('[OgasTV] Could not load studio episodes', error);
    }
    return {
      lead: published(homepage.leadStory),
      highlights: publishedList(homepage.latestHighlights, 5),
      lagosWatch: publishedList(homepage.lagosWatchStories),
      government: publishedList(homepage.governmentStories),
      grassrootsVoices: publishedList(homepage.grassrootsVoices),
      business: publishedList(homepage.businessStories),
      personalities: publishedList(homepage.personalities),
      studioEpisodes,
    };
  } catch (error) {
    console.error('[OgasTV] Could not load curated homepage selections', error);
    return emptyHomepageCuration();
  }
}

/**
 * Automatically show published posts in the matching homepage category,
 * including posts tagged with an additional (secondary) category.
 *
 * A story may appear in several desks, as it does in WordPress. Homepage
 * editors do not need to assign each story to a separate placement.
 */
export type HomepageCategorySection = { stories: Article[]; archiveSlug: string };
export type HomepageCategorySections = Record<HomepageCategoryKey, HomepageCategorySection>;

export async function getHomepageCategorySections(limit = 4): Promise<HomepageCategorySections> {
  const max = Math.max(1, Math.min(8, Math.floor(limit)));
  const blank = (): HomepageCategorySections => Object.fromEntries(homepageCategoryDefinitions.map(def => [
    def.key, { stories: [] as Article[], archiveSlug: def.slug },
  ])) as unknown as HomepageCategorySections;
  if (!payloadEnabled()) {
    const [all, categories] = await Promise.all([wp.getArticles(100), wp.getCategories()]);
    return Object.fromEntries(homepageCategoryDefinitions.map(def => [
      def.key, {
        stories: all.filter(story => def.aliases.some(alias => story.category?.slug === alias)).slice(0, max),
        archiveSlug: preferredSectionSlug(def.aliases, categories, def.slug),
      },
    ])) as HomepageCategorySections;
  }
  try {
    const api = await cms();
    const categories = await api.find({
      collection: 'categories', overrideAccess: false, depth: 0, limit: 100,
      where: { slug: { in: [...new Set(homepageCategoryDefinitions.flatMap(def => [...def.aliases]))] } },
    });
    const sections = await Promise.all(homepageCategoryDefinitions.map(async def => {
      const matching = categories.docs.filter(category => def.aliases.some(slug => category.slug === slug));
      const archiveSlug = preferredSectionSlug(def.aliases, matching.map(category => ({ slug: String(category.slug || '') })), def.slug);
      if (!matching.length) return [def.key, { stories: [], archiveSlug }] as const;
      try {
        const result = await api.find({
          collection: 'articles', overrideAccess: false, depth: 2,
          // Homepage cards need only editorial metadata, never full rich-text bodies.
          select: {
            title: true, slug: true, summary: true, firstPublishedAt: true,
            createdAt: true, primaryCategory: true, featuredImage: true,
            publicByline: true, legacyFeaturedImageUrl: true,
            legacyFeaturedImageAlt: true, originalWordpressUrl: true,
          },
          where: { and: [
            { _status: { equals: 'published' } },
            { or: [
              { primaryCategory: { in: matching.map(category => category.id) } },
              { secondaryCategories: { in: matching.map(category => category.id) } },
            ] },
          ] },
          sort: '-firstPublishedAt', limit: max,
        });
        return [def.key, { stories: (result.docs as CmsArticle[]).map((doc)=>mapArticle(doc)), archiveSlug }] as const;
      } catch (error) {
        console.error('[OgasTV] Could not load homepage category '+def.key, error);
        return [def.key, { stories: [], archiveSlug }] as const;
      }
    }));
    return Object.fromEntries(sections) as HomepageCategorySections;
  } catch (error) {
    console.error('[OgasTV] Could not load homepage categories', error);
    return blank();
  }
}

/**
 * Search the full published Payload archive on the server. Unlike filtering
 * getArticles(100), results are not restricted to the first 100 stories.
 */
export async function searchPublicArticles(options: {
  query?: string; category?: string; location?: string; sort?: 'newest'|'oldest'; page?: number; limit?: number;
}): Promise<{ stories: Article[]; total: number; page: number; totalPages: number }> {
  const query = (options.query || '').trim().slice(0, 120);
  const categorySlug = (options.category || '').trim().slice(0, 120);
  const locationSlug = (options.location || '').trim().slice(0, 120);
  const sort = options.sort === 'oldest' ? 'firstPublishedAt' : '-firstPublishedAt';
  const page = Math.max(1, Math.min(10000, Math.floor(options.page || 1)));
  const limit = Math.max(1, Math.min(48, Math.floor(options.limit || 24)));

  if (!payloadEnabled()) {
    const all = await wp.getArticles(100);
    const filtered = all.filter(article =>
      (!categorySlug || archiveCategoryAliases(categorySlug).includes(article.category?.slug || '')) && !locationSlug &&
      (!query || [article.title, article.excerpt, article.category?.name || '']
        .some(value => value.toLowerCase().includes(query.toLowerCase())))
    );
    return { stories: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length, page, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) };
  }
  const api = await cms();
  const where: import('payload').Where = { and: [{ _status: { equals: 'published' } }] };
  if (categorySlug) {
    const categoryResult = await api.find({
      collection: 'categories', overrideAccess: false, depth: 0, limit: 30,
      where: { slug: { in: archiveCategoryAliases(categorySlug) } },
    });
    if (!categoryResult.docs.length) return { stories: [], total: 0, page, totalPages: 1 };
    const ids = categoryResult.docs.map(category => category.id);
    where.and!.push({ or: [
      { primaryCategory: { in: ids } },
      { secondaryCategories: { in: ids } },
    ] });
  }
  if (locationSlug) {
    const locationResult=await api.find({collection:'locations',overrideAccess:false,depth:0,limit:1,
      where:{and:[{slug:{equals:locationSlug}},{state:{equals:'Lagos'}}]}});
    if(!locationResult.docs.length)return {stories:[],total:0,page,totalPages:1};
    where.and!.push({locations:{in:[locationResult.docs[0].id]}});
  }
  if (query) {
    where.and!.push({ or: [
      { title: { like: query } },
      { summary: { like: query } },
    ] });
  }
  const results = await api.find({
    collection: 'articles', overrideAccess: false, depth: 2, select: CARD_FIELDS,
    where, page, limit, sort,
  });
  return { stories: (results.docs as CmsArticle[]).map((doc)=>mapArticle(doc)),
    total: results.totalDocs, page: results.page || page, totalPages: results.totalPages };
}

/** Public Lagos locality options are read-only; never use precise user location. */
export type PublicLocation = {id:number; name:string; slug:string; kind:string};
export async function getPublicLagosLocations(): Promise<PublicLocation[]> {
  if(!payloadEnabled())return [];
  try{
    const api=await cms();
    const result=await api.find({collection:'locations',depth:0,overrideAccess:false,sort:'name',limit:100,
      where:{and:[{state:{equals:'Lagos'}},{kind:{in:['lga','lcda','community']}}]}});
    return result.docs.map(item=>({id:Number(item.id),name:item.name,slug:item.slug,kind:item.kind})).filter(item=>item.slug&&item.name);
  }catch(error){
    console.error('[OgasTV] Could not load public locations',error);
    return [];
  }
}

export async function getRelatedArticles(article:Article,limit=4):Promise<Article[]>{
  const count=Math.max(1,Math.min(8,Math.floor(limit)));
  const category=article.category?.slug;
  const primary=category?await getArticlesInCategory(category,count+4):[];
  const other=primary.filter(item=>item.id!==article.id);
  if(other.length>=count)return other.slice(0,count);
  const latest=await getArticles(14);
  return [...other,...latest.filter(item=>item.id!==article.id&&!other.some(existing=>existing.id===item.id))].slice(0,count);
}

/** Published-only archive for OgasTV Studio videos; never expose draft episodes. */
export async function getWatchEpisodes(limit=24):Promise<StudioEpisode[]>{
  if(!payloadEnabled())return [];
  try{
    const api=await cms();
    const result=await api.find({collection:'episodes',overrideAccess:false,depth:2,
      where:{_status:{equals:'published'}},sort:'-releasedAt',limit:Math.max(1,Math.min(48,Math.floor(limit)))});
    return result.docs.flatMap(doc=>{
      const episode=doc as typeof doc & {youtubeVideoId?:string;thumbnail?:Relation;programme?:Relation & {title?:string};releasedAt?:string};
      if(!episode.title||!/^[\\w-]{11}$/.test(episode.youtubeVideoId||''))return [];
      const media=episode.thumbnail&&typeof episode.thumbnail==='object'?episode.thumbnail:null;
      return [{
        id:String(episode.id),title:episode.title,description:episode.description||'',
        youtubeVideoId:episode.youtubeVideoId!,
        thumbnail:media?.url?{url:media.url,alt:media.alt||episode.title}:null,
        releasedAt:episode.releasedAt,
        programmeTitle:episode.programme&&typeof episode.programme==='object'?episode.programme.title:undefined,
      }];
    });
  }catch(error){
    console.error('[OgasTV] Could not load public programme archive',error);
    return [];
  }
}
