import { decode } from 'html-entities';

const DEFAULT_API = 'https://ogastvafrica.ng/wp-json/wp/v2';
const API_BASE = (process.env.WORDPRESS_API_BASE || DEFAULT_API).replace(/\/+$/, '');
const CACHE_SECONDS = 300;

type Rendered = { rendered: string };
type WPImage = { source_url?: string; alt_text?: string; media_details?: { sizes?: Record<string, { source_url?: string }> } };
type WPTerm = { id: number; slug: string; name: string };
type WPPost = {
  id: number;
  slug: string;
  date: string;
  link: string;
  title: Rendered;
  excerpt: Rendered;
  content: Rendered;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: WPImage[];
    author?: { name: string }[];
  };
};

export type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  date: string;
  originalUrl: string;
  category: { name: string; slug: string } | null;
  author: string | null;
  image: { url: string; alt: string; caption?: string; credit?: string } | null;
  updatedAt?: string;
  subtitle?: string;
  editorialType?: string;
  correctionNotice?: string;
  metaTitle?: string;
  metaDescription?: string;
  locations?: { name: string; slug: string }[];
};

export type Category = { id: number; slug: string; name: string };

function plainText(value: string): string {
  return decode(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
}

async function wordpressGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(API_BASE + '/' + path.replace(/^\/+/, ''));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error('WordPress REST API returned ' + response.status + ' for ' + path);
  return (await response.json()) as T;
}

function normalize(post: WPPost, categories: Category[]): Article {
  const category = categories.find(item => post.categories.includes(item.id)) ?? null;
  const featured = post._embedded?.['wp:featuredmedia']?.[0];
  const imageUrl = featured?.media_details?.sizes?.large?.source_url || featured?.source_url;
  return {
    id: post.id,
    slug: post.slug,
    title: plainText(post.title?.rendered || ''),
    excerpt: plainText(post.excerpt?.rendered || ''),
    html: post.content?.rendered || '',
    date: post.date,
    originalUrl: post.link,
    category: category ? { name: category.name, slug: category.slug } : null,
    author: post._embedded?.author?.[0]?.name || null,
    image: imageUrl ? { url: imageUrl, alt: featured?.alt_text || plainText(post.title?.rendered || '') } : null,
  };
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await wordpressGet<WPTerm[]>('categories', { per_page: 100, hide_empty: 0 });
    return categories.map(category => ({ id: category.id, slug: category.slug, name: plainText(category.name) }));
  } catch (error) {
    console.error('OgasTV category fetch failed:', error);
    return [];
  }
}

export async function getArticles(limit = 24): Promise<Article[]> {
  try {
    const [posts, categories] = await Promise.all([
      wordpressGet<WPPost[]>('posts', { per_page: Math.min(Math.max(1, limit), 100), _embed: 1 }),
      getCategories(),
    ]);
    return posts.map(post => normalize(post, categories));
  } catch (error) {
    console.error('OgasTV article fetch failed:', error);
    return [];
  }
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    const [posts, categories] = await Promise.all([
      wordpressGet<WPPost[]>('posts', { slug, per_page: 1, _embed: 1 }),
      getCategories(),
    ]);
    return posts[0] ? normalize(posts[0], categories) : null;
  } catch (error) {
    console.error('OgasTV article lookup failed:', error);
    return null;
  }
}

export async function getArticlesInCategory(slug: string, limit = 24): Promise<Article[]> {
  const categories = await getCategories();
  const category = categories.find(item => item.slug === slug);
  if (!category) return [];
  try {
    const posts = await wordpressGet<WPPost[]>('posts', {
      categories: category.id,
      per_page: Math.min(Math.max(1, limit), 100),
      _embed: 1,
    });
    return posts.map(post => normalize(post, categories));
  } catch (error) {
    console.error('OgasTV category article fetch failed:', error);
    return [];
  }
}

export function prettyDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}
