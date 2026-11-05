import Link from 'next/link';
import { StoryCard } from '@/components/StoryCard';
import { getArticles, getArticlesInCategory } from '@/lib/content';

export default async function HomePage() {
  const [articles, lagosArticles] = await Promise.all([
    getArticles(24),
    getArticlesInCategory('lagos-watch', 4),
  ]);
  const [lead, ...more] = articles;
  const highlights = more.slice(0, 5);
  const latest = more.slice(5, 13);

  return (
    <>
      <section className="page-intro wrap">
        <div className="eyebrow"><span className="rule-dot" /> Independent perspectives from Nigeria and beyond</div>
        <div className="intro-line">
          <h1>Stories that <em>move us.</em></h1>
          <p>Local voices. Important developments. A closer look at the people and places shaping our world.</p>
        </div>
      </section>

      {lead ? (
        <section className="lead-grid wrap" aria-labelledby="lead-heading">
          <div className="lead-column">
            <div className="section-heading"><h2 id="lead-heading">Today's lead story</h2><span>01 / Cover Story</span></div>
            <StoryCard article={lead} variant="lead" />
          </div>
          <div className="highlights-column">
            <div className="section-heading"><h2>Latest highlights</h2><span>What matters now</span></div>
            {highlights.length ? highlights.map(article => (
              <StoryCard key={article.id} article={article} variant="compact" />
            )) : <p className="empty-state">More reporting will appear here as it is published.</p>}
          </div>
        </section>
      ) : (
        <section className="wrap" aria-label="Content connection status">
          <div className="empty-state prominent">
            <span className="eyebrow">Editorial archive</span>
            <h2>We're preparing the next chapter of OgasTV Africa.</h2>
            <p>The new site has not loaded its articles yet. Existing stories remain available on the current publication.</p>
            <a href="https://ogastvafrica.ng/" target="_blank" rel="noopener noreferrer" className="inline-arrow">Visit the current website ↗</a>
          </div>
        </section>
      )}

      <section className="section-block wrap" aria-labelledby="lagos-heading">
        <div className="section-heading section-heading--large">
          <div><span className="eyebrow">Close to home</span><h2 id="lagos-heading">Lagos Watch<span className="heading-period">.</span></h2></div>
          <Link className="inline-arrow" href="/section/lagos-watch">Explore Lagos Watch ↗</Link>
        </div>
        {lagosArticles.length ?
          <div className="story-grid">{lagosArticles.map(article => <StoryCard article={article} key={article.id} />)}</div>
          : <p className="empty-state">Lagos Watch stories will appear when the section is connected to the archive.</p>
        }
      </section>

      <section id="studio" className="studio-panel">
        <div className="wrap studio-inner">
          <div><span className="eyebrow">Broadcast & conversation</span><h2>Beyond the <em>headline.</em></h2><p>Interviews, conversations, live coverage and the voices behind the news. Watch stories unfold with OgasTV Studio.</p><Link href="/live" className="button-dark">Explore OgasTV Live ↗</Link></div>
          <div className="studio-art" aria-hidden="true"><div className="studio-play">▶</div><span>OGASTV / STUDIO</span></div>
        </div>
      </section>

      <section className="section-block wrap" aria-labelledby="latest-heading">
        <div className="section-heading section-heading--large"><div><span className="eyebrow">From the newsroom</span><h2 id="latest-heading">More stories<span className="heading-period">.</span></h2></div></div>
        {latest.length ? <div className="story-grid">{latest.map(article => <StoryCard article={article} key={article.id} />)}</div> : <p className="empty-state">More stories will appear here when available.</p>}
      </section>
    </>
  );
}
