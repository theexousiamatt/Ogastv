import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock3, Play, Clapperboard, MapPin } from 'lucide-react';
import { getPublicHomepageData, getPublicDirectoryData } from '@/lib/public-cache';
import { prioritiseLagosCouncils } from '@/lib/editorial-sections';
import { prettyDate } from '@/lib/content';
import type { Article, StudioEpisode } from '@/lib/content';
import { FeaturedHero } from '@/components/FeaturedHero';
import { HomeBannerAd } from '@/components/HomeBannerAd';
import './home-sections.css';

export const dynamic='force-dynamic';

function Thumb({story}:{story:Article}){
  return <span className="ogas-editorial-thumb">
    {story.image?
      // eslint-disable-next-line @next/next/no-img-element
      <img loading="lazy" decoding="async" src={story.image.url} alt={story.image.alt||''}/>:
      <span aria-hidden="true" className="ogas-editorial-thumb__placeholder">
        <span className="ogas-editorial-thumb__brand">OGAS<strong>TV</strong></span>
        <span className="ogas-editorial-thumb__type">COMMUNITY REPORT</span>
      </span>}
  </span>;
}
function ArticleDate({story}:{story:Article}){
  return <span className="ogas-public-date"><Clock3 size={12}/><time dateTime={story.date}>{prettyDate(story.date)}</time></span>;
}
function CompactStory({story}:{story:Article}){
  return <article className="ogas-home-compact">
    <Link href={'/stories/'+encodeURIComponent(story.slug)} className="ogas-home-compact__image" aria-label={'Read '+story.title}><Thumb story={story}/></Link>
    <div>{story.category&&<span className="ogas-home-compact__category">{story.category.name}</span>}
      <h3><Link href={'/stories/'+encodeURIComponent(story.slug)}>{story.title}</Link></h3><ArticleDate story={story}/>
    </div>
  </article>;
}
function EditorialCard({story,feature=false}:{story:Article;feature?:boolean}){
  return <article className={'ogas-home-news-card'+(feature?' ogas-home-news-card--feature':'')}>
    <Link href={'/stories/'+encodeURIComponent(story.slug)} className="ogas-home-news-card__image" aria-label={'Read '+story.title}><Thumb story={story}/></Link>
    <div className="ogas-home-news-card__content">
      {story.category&&<span className="ogas-category-label">{story.category.name}</span>}
      <h3><Link href={'/stories/'+encodeURIComponent(story.slug)}>{story.title}</Link></h3>
      {feature&&story.excerpt&&<p className="ogas-home-news-card__excerpt">{story.excerpt}</p>}
      <ArticleDate story={story}/>
    </div>
  </article>;
}
type SectionMode='feature'|'voices'|'grid'|'profiles';
function EditorialSection({id,title,description,stories,href,mode='grid',emptyText,accent=false,children}:{
  id:string;title:string;description:string;stories:Article[];href:string;mode?:SectionMode;
  emptyText:string;accent?:boolean;children?:React.ReactNode;
}){
  return <section className={'ogas-home-section ogas-home-section--'+mode+(accent?' ogas-home-section--accent':'')} aria-labelledby={id}>
    <div className="ogas-home-section__heading">
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
      <Link href={href}>All {title.toLowerCase()} <ArrowUpRight size={16}/></Link>
    </div>
    {children}
    {stories.length?mode==='feature'?
      <div className="ogas-home-section__feature-grid">
        <EditorialCard story={stories[0]} feature/>
        <div className="ogas-home-section__supporting">{stories.slice(1,4).map(story=><CompactStory key={story.id} story={story}/>)}</div>
      </div>:
      <div className={'ogas-home-section__grid ogas-home-section__grid--'+mode}>
        {stories.slice(0,mode==='profiles'?3:4).map((story,index)=>
          <EditorialCard story={story} key={story.id} feature={mode==='voices'&&index===0}/>)}
      </div>:
      <div className="ogas-home-section__empty"><p>{emptyText}</p><Link href={href}>Explore stories <ArrowRight size={14}/></Link></div>}
  </section>;
}
function VideoCard({episode}:{episode:StudioEpisode}){
  return <a className="ogas-home-studio-card" href={'https://www.youtube.com/watch?v='+encodeURIComponent(episode.youtubeVideoId)}
    target="_blank" rel="noopener noreferrer" aria-label={'Watch '+episode.title+' on YouTube'}>
    <div className="ogas-home-studio-card__image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src={episode.thumbnail?.url||'https://i.ytimg.com/vi/'+episode.youtubeVideoId+'/hqdefault.jpg'} alt={episode.thumbnail?.alt||''}/>
      <span className="ogas-home-studio-card__play" aria-hidden="true"><Play size={20} fill="currentColor"/></span>
    </div>
    <span className="ogas-home-studio-card__label">OGASTV STUDIO · VIDEO</span>
    <strong>{episode.title}</strong>
    {episode.description&&<p>{episode.description}</p>}
  </a>;
}

export default async function HomePage(){
  const [[latest,curated,automatic],[,locations]]=await Promise.all([getPublicHomepageData(),getPublicDirectoryData()]);
  const lead=curated.lead||automatic.grassrootsVoices.stories.find(story=>Boolean(story.image))||
    latest.find(story=>Boolean(story.image))||latest[0]||null;
  const highlights=latest.filter(story=>String(story.id)!==String(lead?.id)).slice(0,5);
  const lagosAreas=prioritiseLagosCouncils(locations.filter(item=>['lga','lcda'].includes(item.kind))).slice(0,8);
  return <div className="ogas-public-home">
    <FeaturedHero stories={lead?[lead]:[]}/>
    <section className="ogas-home-section ogas-home-highlights" aria-labelledby="ogas-highlights">
      <div className="ogas-home-section__heading">
        <div><span className="ogas-home-section__eyebrow">The latest</span><h2 id="ogas-highlights">Latest Highlights</h2>
          <p>Five important developments, at a glance.</p></div>
        <Link href="/latest">See all stories <ArrowRight size={16}/></Link>
      </div>
      {highlights.length?<div className="ogas-home-highlights__grid">
        {highlights.map((story,index)=><div className="ogas-home-highlights__item" key={story.id}>
          <span className="ogas-home-highlights__number">{String(index+1).padStart(2,'0')}</span>
          <CompactStory story={story}/>
        </div>)}
      </div>:<div className="ogas-home-section__empty"><p>Our newsroom is preparing the latest reports.</p>
        <Link href="/latest">Explore the newsroom <ArrowRight size={14}/></Link></div>}
    </section>

    <EditorialSection id="ogas-lagos" title="Lagos Watch" mode="feature" accent
      description="From Kosofe to Ikorodu: everyday life and decisions across Lagos councils."
      stories={automatic.lagosWatch.stories} href="/section/lagos-watch"
      emptyText="Council updates will appear here as editors publish them.">
      {lagosAreas.length>0&&<nav className="ogas-home-councils" aria-label="Explore Lagos councils">
        <MapPin size={15} aria-hidden="true"/><span>Explore councils</span>
        {lagosAreas.map(area=><Link key={area.slug} href={'/section/lagos-watch?location='+encodeURIComponent(area.slug)}>{area.name}</Link>)}
      </nav>}
    </EditorialSection>
    <EditorialSection id="ogas-government" title="Government & Policies" mode="feature"
      description="Clear reporting on government decisions and what they mean for ordinary people."
      stories={automatic.government.stories} href="/section/government-policies"
      emptyText="People-first policy reporting will appear here as it is published."/>
    <EditorialSection id="ogas-voices" title="Grassroots Voices" mode="voices" accent
      description="Residents' experiences, opinions and community concerns, heard without filters."
      stories={automatic.grassrootsVoices.stories} href="/section/grassroots-voices"
      emptyText="The next voices from our communities will appear here."/>
    <EditorialSection id="ogas-business" title="Business & Investment" mode="grid"
      description="Entrepreneurs, local opportunities and investments changing communities."
      stories={automatic.business.stories} href="/section/business-investment"
      emptyText="New business and investment stories are on their way."/>
    <EditorialSection id="ogas-personalities" title="Personalities" mode="profiles" accent
      description="Meet the people shaping change, through interviews and detailed profiles."
      stories={automatic.personalities.stories} href="/section/personalities"
      emptyText="Interviews and profiles will be featured here."/>
    <section className="ogas-home-section ogas-home-studio" aria-labelledby="ogas-studio">
      <div className="ogas-home-section__heading">
        <div><span className="ogas-home-section__eyebrow"><Clapperboard size={14}/> Watch and listen</span>
          <h2 id="ogas-studio">OgasTV Studio</h2>
          <p>Video podcasts, interviews and presenter-led coverage.</p></div>
        <Link href="/watch">Explore programmes <ArrowUpRight size={16}/></Link>
      </div>
      {curated.studioEpisodes.length?<div className="ogas-home-studio__grid">
        {curated.studioEpisodes.map(episode=><VideoCard key={episode.id} episode={episode}/>)}
      </div>:<div className="ogas-home-section__empty"><p>Our latest programmes, interviews and coverage will appear here.</p>
        <Link href="/watch">Visit OgasTV Studio <ArrowRight size={14}/></Link></div>}
    </section>
    <HomeBannerAd/>
    <aside className="ogas-home-newsletter ogas-home-newsletter--wide">
      <span className="ogas-home-newsletter__mark" aria-hidden="true">✳</span>
      <h2>Stay close to the stories shaping your community.</h2>
      <p>Follow the reporting that matters, from Lagos and beyond.</p>
      <div className="ogas-home-newsletter__links">
        <Link href="/latest" className="ogas-home-newsletter__button">Explore the latest <ArrowRight size={14}/></Link>
        <Link href="/watch" className="ogas-home-newsletter__button ogas-home-newsletter__button--secondary">Watch OgasTV Studio <ArrowRight size={14}/></Link>
      </div>
    </aside>
  </div>;
}
