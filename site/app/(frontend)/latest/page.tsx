import type { Metadata } from 'next';
import { StoryCard } from '@/components/StoryCard';
import { getArticles } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Latest News',
  description: 'The latest reporting, interviews and developments from OgasTV Africa.',
};

export default async function LatestNews() {
  const articles = await getArticles(100);
  return <>
    <header className="archive-heading wrap">
      <span className="eyebrow">From the newsroom</span>
      <h1 className="archive-title">Latest News<span className="heading-period">.</span></h1>
      <p className="archive-description">Reporting from communities across Lagos, Nigeria and beyond.</p>
    </header>
    <section className="archive-grid wrap" aria-label="Latest stories">
      {articles.length ? <div className="story-grid">{articles.map((a) => <StoryCard key={a.id} article={a} />)}</div>
        : <p className="empty-state">There are no published articles to display yet.</p>}
    </section>
  </>;
}
