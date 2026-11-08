import Link from 'next/link';
import type { Article } from '@/lib/wordpress';
import { prettyDate } from '@/lib/wordpress';

type Props = { article: Article; variant?: 'standard' | 'lead' | 'compact' };

export function StoryCard({ article, variant = 'standard' }: Props) {
  return (
    <article className={'story-card story-card--' + variant}>
      {article.image ? (
        <Link className="story-image" href={'/stories/' + encodeURIComponent(article.slug)} tabIndex={-1} aria-hidden="true">
          {/* Source images stay on WordPress until media is migrated to owned storage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image.url} alt="" loading={variant === 'lead' ? 'eager' : 'lazy'} />
        </Link>
      ) : <div className="story-image story-image--empty" aria-hidden="true">OGAS<span>TV</span></div>}
      <div className="story-copy">
        <div className="story-meta">
          {article.category && article.category.slug!=='uncategorized' && <Link href={'/section/' + encodeURIComponent(article.category.slug)}>{article.category.name}</Link>}
          <time dateTime={article.date}>{prettyDate(article.date)}</time>
        </div>
        <h3><Link href={'/stories/' + encodeURIComponent(article.slug)}>{article.title}</Link></h3>
        {variant !== 'compact' && article.excerpt && <p>{article.excerpt}</p>}
      </div>
    </article>
  );
}
