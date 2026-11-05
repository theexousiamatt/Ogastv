import Link from 'next/link';
import { StoryCard } from '@/components/StoryCard';
import { getArticles, getArticlesInCategory, getCategories } from '@/lib/content';
import type { Article, Category } from '@/lib/content';

const featureSections = [
  {
    id: 'government',
    eyebrow: 'Decisions & impact',
    title: 'Government & Policies',
    preferred: ['government-policies', 'government-and-policies', 'politics'],
    description: 'Government decisions, policy explainers and the impact on everyday life.',
  },
  {
    id: 'grassroots',
    eyebrow: 'People first',
    title: 'Grassroots Voices',
    preferred: ['grassroots-voices', 'community', 'grassroots'],
    description: 'Local experiences, interviews and community perspectives.',
  },
  {
    id: 'business',
    eyebrow: 'Enterprise & opportunity',
    title: 'Business & Investment',
    preferred: ['business-investment', 'business-and-investment', 'business'],
    description: 'Local businesses, entrepreneurs and economic developments.',
  },
  {
    id: 'personalities',
    eyebrow: 'People creating impact',
    title: 'Personalities',
    preferred: ['personalities', 'interviews', 'profiles'],
    description: 'Interviews and profiles of the people shaping our communities.',
  },
] as const;

function categorySlug(categories: Category[], candidates: readonly string[]): string {
  return candidates.find((slug) => categories.some((c) => c.slug === slug)) || candidates[0];
}

function EditorialSection({
  id, eyebrow, title, slug, description, articles,
}: {
  id: string;
  eyebrow: string;
  title: string;
  slug: string;
  description: string;
  articles: Article[];
}) {
  return (
    <section className="section-block wrap" aria-labelledby={id + '-heading'}>
      <div className="section-heading section-heading--large">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={id + '-heading'}>{title}<span className="heading-period">.</span></h2>
        </div>
        <Link className="inline-arrow" href={'/section/' + slug}>View all stories ↗</Link>
      </div>
      {articles.length ? <div className="story-grid story-grid--feature">
        {articles.slice(0, 3).map((article) => <StoryCard article={article} key={article.id} />)}
      </div> : <p className="empty-state">{description} Stories from this section will appear here when they are available.</p>}
    </section>
  );
}

export default async function HomePage() {
  const categories = await getCategories();
  const slugs = featureSections.map((section) => categorySlug(categories, section.preferred));
  const [articles, lagos, government, grassroots, business, personalities] = await Promise.all([
    getArticles(24),
    getArticlesInCategory('lagos-watch', 4),
    ...slugs.map((slug) => getArticlesInCategory(slug, 4)),
  ]);

  const [lead, ...rest] = articles;
  const highlights = rest.slice(0, 5);
  const sectionArticles = [government, grassroots, business, personalities];

  return (
    <>
      <header className="page-intro wrap">
        <div className="eyebrow"><span className="rule-dot" /> Independent stories from the ground</div>
        <div className="intro-line">
          <h1>Stories that <em>move us.</em></h1>
          <p>Reporting from the streets of Lagos to the conversations shaping Nigeria and beyond.</p>
        </div>
      </header>

      <section className="lead-grid wrap" aria-label="Lead story and latest highlights">
        <div className="lead-column">
          <div className="section-heading"><h2>01 / The lead story</h2><span>Editor's selection</span></div>
          {lead ? <StoryCard article={lead} variant="lead" /> :
            <p className="empty-state">The lead story will appear when the editorial archive is connected.</p>}
        </div>
        <div className="highlights-column">
          <div className="section-heading"><h2>Latest / The briefing</h2><Link className="inline-arrow" href="/latest">All stories ↗</Link></div>
          {highlights.length ? highlights.map((article) => <StoryCard article={article} key={article.id} variant="compact" />)
            : <p className="empty-state">The five latest highlights will appear here.</p>}
        </div>
      </section>

      <section className="section-block wrap" aria-labelledby="lagos-watch-heading">
        <div className="section-heading section-heading--large">
          <div><span className="eyebrow">Close to home</span><h2 id="lagos-watch-heading">Lagos Watch<span className="heading-period">.</span></h2></div>
          <Link className="inline-arrow" href="/section/lagos-watch">Explore Lagos reporting ↗</Link>
        </div>
        <div className="lagos-discovery">
          <div>
            <h3>Where&apos;s your story?</h3>
            <p>Follow verified reporting from Lagos communities and local governments.</p>
          </div>
          <Link href="/section/lagos-watch">Explore Lagos Watch ↗</Link>
        </div>
        {lagos.length ? <div className="story-grid story-grid--feature">{lagos.slice(0, 3).map((article) => <StoryCard article={article} key={article.id} />)}</div>
          : <p className="empty-state">Stories from Lagos LGAs and LCDAs will appear here.</p>}
      </section>

      {featureSections.map((section, index) =>
        <EditorialSection key={section.id}
          id={section.id}
          eyebrow={section.eyebrow}
          title={section.title}
          slug={slugs[index]}
          description={section.description}
          articles={sectionArticles[index]} />
      )}

      <section className="studio-panel" id="studio" aria-labelledby="studio-heading">
        <div className="wrap studio-inner">
          <div>
            <span className="eyebrow">OGASTV / Studio & broadcast</span>
            <h2 id="studio-heading">OgasTV <em>Studio.</em></h2>
            <p>Live reporting, community conversations and documentary features in a dedicated broadcast space.</p>
            <Link href="/live" className="button-dark">Explore the Studio ↗</Link>
          </div>
          <div className="studio-art" aria-hidden="true"><div className="studio-play">▶</div><span>OGASTV / STUDIO</span></div>
        </div>
      </section>
    </>
  );
}
