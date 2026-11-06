import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpenText, BriefcaseBusiness, Clock3, Landmark, MapPin, Radio, UsersRound, Newspaper, Play, Clapperboard } from 'lucide-react';
import { getArticles, getHomepageCuration, prettyDate } from '@/lib/content';
import type { Article } from '@/lib/content';
import { FeaturedHero } from '@/components/FeaturedHero';
import { HomeBannerAd } from '@/components/HomeBannerAd';

export const dynamic = 'force-dynamic';

const sections = [
  { name: 'All Stories', href: '/latest', Icon: Newspaper },
  { name: 'News', href: '/latest?category=news', Icon: BookOpenText },
  { name: 'Lagos', href: '/latest?category=lagos-watch', Icon: MapPin },
  { name: 'Politics', href: '/latest?category=politics', Icon: Landmark },
  { name: 'Culture', href: '/latest?category=culture', Icon: Clapperboard },
  { name: 'Business', href: '/latest?category=business', Icon: BriefcaseBusiness },
  { name: 'Community', href: '/latest?category=community', Icon: UsersRound },
  { name: 'Live', href: '/live', Icon: Radio },
];

function ArticleThumb({ story, className = '' }: { story?: Article; className?: string }) {
  return <div className={'ogas-editorial-thumb ' + className}>
    {story?.image ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" src={story.image.url} alt={story.image.alt || ''}/>
    </> : <span aria-hidden="true" className="ogas-editorial-thumb__placeholder"><BookOpenText size={20}/></span>}
  </div>;
}

function ArticleDate({ story }: { story: Article }) {
  return <span className="ogas-public-date"><Clock3 size={12}/><time dateTime={story.date}>{prettyDate(story.date)}</time></span>;
}

function NewsRow({ story }: { story: Article }) {
  return <article className="ogas-news-row">
    <Link href={'/stories/' + encodeURIComponent(story.slug)} className="ogas-news-row__image" aria-label={'Read ' + story.title}>
      <ArticleThumb story={story}/>
    </Link>
    <div>
      <ArticleDate story={story}/>
      <h3><Link href={'/stories/' + encodeURIComponent(story.slug)}>{story.title}</Link></h3>
      {story.category && <Link href={'/latest?category=' + encodeURIComponent(story.category.slug)} className="ogas-category-label">{story.category.name}</Link>}
    </div>
  </article>;
}

function NewsCard({ story }: { story: Article }) {
  return <article className="ogas-home-news-card">
    <Link href={'/stories/' + encodeURIComponent(story.slug)} className="ogas-home-news-card__image" aria-label={'Read '+story.title}><ArticleThumb story={story}/></Link>
    <div className="ogas-home-news-card__content">
      {story.category && <Link href={'/latest?category='+encodeURIComponent(story.category.slug)} className="ogas-category-label">{story.category.name}</Link>}
      <h3><Link href={'/stories/' + encodeURIComponent(story.slug)}>{story.title}</Link></h3>
      <ArticleDate story={story}/>
    </div>
  </article>;
}

function ServiceCard({ name, heading, copy, href, variant }: { name:string; heading:string; copy:string; href:string; variant:string }) {
  return <Link href={href} className={'ogas-home-service-card ogas-home-service-card--'+variant}>
    <span className="ogas-home-service-card__eyebrow">{name}</span>
    <div className="ogas-home-service-card__symbol" aria-hidden="true"><span/><span/><span/></div>
    <strong>{heading}</strong>
    <span className="ogas-home-service-card__footer">{copy}<ArrowUpRight size={16}/></span>
  </Link>;
}

export default async function HomePage() {
  const [latest, curated] = await Promise.all([getArticles(40), getHomepageCuration()]);
  const featured = [
    ...(curated.lead ? [curated.lead] : []),
    ...curated.highlights,
    ...latest,
  ].filter((story, index, list) => list.findIndex((item) => item.id === story.id) === index);

  const more = latest.filter((story) => story.id !== featured[0]?.id);
  const latestList = (curated.highlights.length ? curated.highlights : more).slice(0, 4);
  const pick = more.find((story) => !latestList.some((item)=>item.id === story.id)) || more[0];
  const inFocus = more.filter((story)=>story.id !== pick?.id).slice(0,3);
  const lower = more.filter((story) => story.id !== pick?.id && !latestList.some((item)=>item.id===story.id)).slice(0,3);

  return <div className="ogas-public-home">
    <FeaturedHero stories={featured}/>
    <nav className="ogas-category-tabs" aria-label="Explore news categories">
      {sections.map(({name,href,Icon},index)=> <Link key={name} href={href} className={'ogas-category-tab'+(index===0?' ogas-category-tab--selected':'')}>
        <Icon size={14} aria-hidden="true"/>{name}{name === 'Live' && <span className="ogas-live-dot" aria-hidden="true"/>}
      </Link>)}
    </nav>

    <HomeBannerAd />
    <div className="ogas-home-feature-grid">
      <section className="ogas-home-panel ogas-home-latest" aria-labelledby="ogas-latest">
        <div className="ogas-home-panel__title"><h2 id="ogas-latest">Latest Stories</h2><Link href="/latest">View all <ArrowRight size={14}/></Link></div>
        {latestList.length ? <div className="ogas-home-latest__list">{latestList.map((story)=><NewsRow story={story} key={story.id}/>)}</div> :
        <div className="ogas-home-small-empty">
          <div className="ogas-home-small-empty__icon"><Newspaper size={24}/></div>
          <strong>Fresh stories, coming soon.</strong>
          <p>Our newsroom is preparing its first reports. Check back for local news and community voices.</p>
          <Link href="/latest">Explore the newsroom <ArrowRight size={14}/></Link>
        </div>}
      </section>

      <section className="ogas-home-panel ogas-home-picks" aria-labelledby="ogas-picks">
        <div className="ogas-home-panel__title"><h2 id="ogas-picks">Editor&apos;s Picks</h2></div>
        {pick ? <Link href={'/stories/'+encodeURIComponent(pick.slug)} className="ogas-home-spotlight">
          <ArticleThumb story={pick}/>
          <div className="ogas-home-spotlight__overlay">
            {pick.category && <span className="ogas-category-label">{pick.category.name}</span>}
            <h3>{pick.title}</h3><ArticleDate story={pick}/>
          </div>
        </Link> : <div className="ogas-home-pick-placeholder">
          <div className="ogas-home-pick-placeholder__art" aria-hidden="true"><span/><span/><span/></div>
          <span className="ogas-category-label">From the newsroom</span>
          <h3>People, perspectives, and stories worth sharing.</h3>
          <p>Our editors will spotlight standout reporting here.</p>
        </div>}
      </section>

      <section className="ogas-home-panel ogas-home-focus" aria-labelledby="ogas-focus">
        <div className="ogas-home-panel__title ogas-home-panel__title--toggle"><h2 id="ogas-focus">In Focus</h2><span className="ogas-focus-label">Latest</span></div>
        {inFocus.length ? <ol className="ogas-home-focus__list">{inFocus.map((story,index)=> <li key={story.id}>
          <span className="ogas-home-focus__number">{String(index+1).padStart(2,'0')}</span>
          <div><Link href={'/stories/'+encodeURIComponent(story.slug)}>{story.title}</Link><ArticleDate story={story}/></div>
        </li>)}</ol> : <div className="ogas-home-focus__empty">
          <span className="ogas-home-focus__number">01</span><p>Discover perspectives on communities, people and the decisions shaping Africa.</p>
          <span className="ogas-home-focus__rule"/><span className="ogas-home-focus__number">02</span><p>The latest stories will appear here as they are published.</p>
        </div>}
      </section>
    </div>

    <div className="ogas-home-bottom">
      <section className="ogas-home-bottom__stories" aria-labelledby="ogas-more">
        <div className="ogas-home-panel__title"><h2 id="ogas-more">More from OgasTV Africa</h2><Link href="/latest">More news <ArrowRight size={14}/></Link></div>
        <div className="ogas-home-bottom__grid">
          {lower.length ? lower.map((story)=><NewsCard story={story} key={story.id}/>) : <>
            <ServiceCard name="Latest reporting" heading="Stories close to home" copy="Discover the latest" href="/latest" variant="lagos"/>
            <ServiceCard name="Video & programmes" heading="OgasTV Studio" copy="Explore programmes" href="/live" variant="studio"/>
            <ServiceCard name="Community" heading="Voices that matter" copy="Explore coverage" href="/latest?category=community" variant="community"/>
          </>}
        </div>
      </section>
      <aside className="ogas-home-newsletter">
        <span className="ogas-home-newsletter__mark" aria-hidden="true">✳</span>
        <h2>Stay in the know<br/>with OgasTV Africa.</h2>
        <p>Get closer to the people, culture and local stories shaping our continent.</p>
        <div className="ogas-home-newsletter__form" aria-label="Newsletter availability">
          <span>Newsletter sign-up coming soon</span>
        </div>
        <Link href="/latest" className="ogas-home-newsletter__button">Browse the latest <ArrowRight size={14}/></Link>
      </aside>
    </div>
  </div>;
}
