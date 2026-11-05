import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getArticlesInCategory } from '@/lib/content';
import { StoryCard } from '@/components/StoryCard';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const category = (await getCategories()).find(item => item.slug === slug);
  return { title: category ? category.name + ' News' : 'Section unavailable' };
}

export default async function SectionPage({ params }: Props) {
  const slug = (await params).slug;
  const category = (await getCategories()).find(item => item.slug === slug);
  if (!category) notFound();
  const articles = await getArticlesInCategory(slug, 48);
  return <>
    <header className="archive-heading wrap">
      <span className="eyebrow"><Link href="/">Home</Link> / Sections</span>
      <h1 className="archive-title">{category.name}<span className="heading-period">.</span></h1>
      <p className="archive-description">Reporting and perspectives from our {category.name} desk.</p>
    </header>
    <div className="archive-grid wrap">
      {articles.length ? <div className="story-grid">{articles.map(article => <StoryCard key={article.id} article={article} />)}</div>
      : <p className="empty-state">No stories were loaded for this section.</p>}
    </div>
  </>;
}
