import type { Metadata } from 'next';
import Link from 'next/link';
import sanitizeHtml from 'sanitize-html';
import { notFound } from 'next/navigation';
import { getArticle, prettyDate } from '@/lib/content';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  return article ? { title: article.title, description: article.excerpt, openGraph: { title: article.title, images: article.image ? [article.image.url] : [] } } : { title: 'Story unavailable' };
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const html = sanitizeHtml(article.html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'figure', 'figcaption', 'iframe'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
      iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['https', 'http'],
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
  });
  return <article className="article-shell wrap">
    {article.category && <div className="eyebrow"><Link href={'/section/' + encodeURIComponent(article.category.slug)}>{article.category.name}</Link></div>}
    <h1 className="article-title">{article.title}</h1>
    <div className="article-byline"><span>{article.author ? 'By ' + article.author : 'OgasTV Africa'}</span><time dateTime={article.date}>{prettyDate(article.date)}</time></div>
    {article.image && <img className="article-cover" src={article.image.url} alt={article.image.alt} />}
    <div className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
  </article>;
}
