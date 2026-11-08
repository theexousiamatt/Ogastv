import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpenText, Clock3, Radio, Play, Clapperboard } from 'lucide-react';
import { getArticles, getHomepageCuration, getHomepageCategorySections, prettyDate } from '@/lib/content';
import type { Article, StudioEpisode } from '@/lib/content';
import { FeaturedHero } from '@/components/FeaturedHero';
import { HomeBannerAd } from '@/components/HomeBannerAd';
import './home-sections.css';

export const dynamic = 'force-dynamic';

function ArticleThumb({ story }: { story?: Article }) {
  return <div className="ogas-editorial-thumb">
    {story?.image ?
      // eslint-disable-next-line @next/next/no-img-element
      <img loading="lazy" src={story.image.url} alt={story.image.alt || ''}/> :
      <span aria-hidden="true" className="ogas-editorial-thumb__placeholder"><BookOpenText size={20}/></span>}
  </div>;
}

function ArticleDate({ story }: { story: Article }) {
  return <span className="ogas-public-date"><Clock3 size={12}/><time dateTime={story.date}>{prettyDate(story.date)}</time></span>;
}

function NewsRow({ story }: { story: Article }) {
  return <article className="ogas-news-row">
    <Link href={'/stories/'+encodeURIComponent(story.slug)} className="ogas-news-row__image" aria-label={'Read '+story.title}><ArticleThumb story={story}/></Link>
    <div><ArticleDate story={story}/><h3><Link href={'/stories/'+encodeURIComponent(story.slug)}>{story.title}</Link></h3>
      {story.category && <Link href={'/latest?category='+encodeURIComponent(story.category.slug)} className="ogas-category-label">{story.category.name}</Link>}
    </div>
  </article>;
}

function NewsCard({ story }: { story: Article }) {
  return <article className="ogas-home-news-card">
    <Link href={'/stories/'+encodeURIComponent(story.slug)} className="ogas-home-news-card__image" aria-label={'Read '+story.title}><ArticleThumb story={story}/></Link>
    <div className="ogas-home-news-card__content">
      {story.category && <Link href={'/latest?category='+encodeURIComponent(story.category.slug)} className="ogas-category-label">{story.category.name}</Link>}
      <h3><Link href={'/stories/'+encodeURIComponent(story.slug)}>{story.title}</Link></h3><ArticleDate story={story}/>
    </div>
  </article>;
}

function EditorialSection({ id, title, description, stories, href, emptyText, accent }: {
  id:string; title:string; description:string; stories: Article[]; href:string; emptyText:string; accent?:boolean;
}) {
  return <section className={'ogas-home-section'+(accent?' ogas-home-section--accent':'')} aria-labelledby={id}>
    <div className="ogas-home-section__heading">
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
      <Link href={href}>Explore coverage <ArrowUpRight size={16}/></Link>
    </div>
    {stories.length ?
      <div className="ogas-home-section__grid">{stories.slice(0,4).map(story=><NewsCard story={story} key={story.id}/>)}</div> :
      <div className="ogas-home-section__empty"><p>{emptyText}</p><Link href={href}>Browse all stories <ArrowRight size={14}/></Link></div>}
  </section>;
}

function StudioCard({ episode }: { episode: StudioEpisode }) {
  return <a className="ogas-home-studio-card" href={'https://www.youtube.com/watch?v='+encodeURIComponent(episode.youtubeVideoId)} target="_blank" rel="noopener noreferrer" aria-label={'Watch '+episode.title+' on YouTube'}>
    <div className="ogas-home-studio-card__image">
      {/* All IDs are validated by the server. YouTube's own thumbnail is the fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" src={episode.thumbnail?.url || 'https://i.ytimg.com/vi/'+episode.youtubeVideoId+'/hqdefault.jpg'} alt={episode.thumbnail?.alt || ''}/>
      <span className="ogas-home-studio-card__play" aria-hidden="true"><Play size={20} fill="currentColor"/></span>
    </div>
    <strong>{episode.title}</strong>
    {episode.description && <p>{episode.description}</p>}
  </a>;
}

export default async function HomePage() {
  // Publishing to an article category automatically populates its homepage desk.
  // The lead story alone may be pinned manually by an editor.
  const [latest, curated, automatic] = await Promise.all([
    getArticles(8), getHomepageCuration(), getHomepageCategorySections(4),
  ]);
  const lead = curated.lead ||
    automatic.grassrootsVoices.stories.find(story => Boolean(story.image)) ||
    latest.find(story => Boolean(story.image)) || latest[0] || null;
  const highlights = latest.filter(story => String(story.id) !== String(lead?.id)).slice(0, 5);

  return <div className="ogas-public-home">
    <FeaturedHero stories={lead ? [lead] : []}/>

    <section className="ogas-home-section ogas-home-highlights" aria-labelledby="ogas-highlights">
      <div className="ogas-home-section__heading">
        <div><span className="ogas-home-section__eyebrow">The latest</span><h2 id="ogas-highlights">Latest Highlights</h2><p>Five important developments, at a glance.</p></div>
        <Link href="/latest">All news <ArrowRight size={16}/></Link>
      </div>
      {highlights.length?<div className="ogas-home-highlights__grid">{highlights.map(story=><NewsRow story={story} key={story.id}/>)}</div>:
        <div className="ogas-home-section__empty"><p>Our newsroom is preparing the latest reports.</p><Link href="/latest">Explore the newsroom <ArrowRight size={14}/></Link></div>}
    </section>

    <EditorialSection id="ogas-lagos" title="Lagos Watch" description="From Kosofe to Ikorodu: decisions and developments across Lagos councils."
      stories={automatic.lagosWatch.stories} href={'/latest?category='+encodeURIComponent(automatic.lagosWatch.archiveSlug)} emptyText="Council updates will appear here as our editors publish them." accent/>
    <EditorialSection id="ogas-government" title="Government & Policies" description="What public decisions mean for the people living with them."
      stories={automatic.government.stories} href={'/latest?category='+encodeURIComponent(automatic.government.archiveSlug)} emptyText="Clear, people-first policy reporting is on its way."/>
    <EditorialSection id="ogas-voices" title="Grassroots Voices" description="Real experiences, community concerns and perspectives from residents."
      stories={automatic.grassrootsVoices.stories} href={'/latest?category='+encodeURIComponent(automatic.grassrootsVoices.archiveSlug)} emptyText="The next voices from our communities will appear here." accent/>
    <EditorialSection id="ogas-business" title="Business & Investment" description="Entrepreneurs, local opportunities and the investments changing communities."
      stories={automatic.business.stories} href={'/latest?category='+encodeURIComponent(automatic.business.archiveSlug)} emptyText="New business and investment stories are coming."/>
    <EditorialSection id="ogas-personalities" title="Personalities" description="Profiles and conversations with people making a difference."
      stories={automatic.personalities.stories} href={'/latest?category='+encodeURIComponent(automatic.personalities.archiveSlug)} emptyText="Interviews and profiles will be featured here." accent/>

    <section className="ogas-home-section ogas-home-studio" aria-labelledby="ogas-studio">
      <div className="ogas-home-section__heading">
        <div><span className="ogas-home-section__eyebrow"><Clapperboard size={14}/> Watch & listen</span><h2 id="ogas-studio">OgasTV Studio</h2><p>Video podcasts, YouTube highlights and presenter-led coverage.</p></div>
        <Link href="/live">Live coverage <Radio size={16}/></Link>
      </div>
      {curated.studioEpisodes.length?
        <div className="ogas-home-studio__grid">{curated.studioEpisodes.map(episode=><StudioCard key={episode.id} episode={episode}/>)}</div>:
        <div className="ogas-home-section__empty"><p>Watch our programmes, interviews and live coverage as they become available.</p><Link href="/live">Explore OgasTV Studio <ArrowRight size={14}/></Link></div>}
    </section>
    <HomeBannerAd/>
    <aside className="ogas-home-newsletter ogas-home-newsletter--wide">
      <span className="ogas-home-newsletter__mark" aria-hidden="true">✳</span>
      <h2>Stay in the know with OgasTV Africa.</h2>
      <p>Get closer to the people, culture and local stories shaping our continent.</p>
      <div className="ogas-home-newsletter__form" aria-label="Newsletter availability"><span>Newsletter sign-up coming soon</span></div>
      <Link href="/latest" className="ogas-home-newsletter__button">Browse the latest <ArrowRight size={14}/></Link>
    </aside>
  </div>;
}
