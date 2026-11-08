import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Radio, ArrowUpRight, Clapperboard, CalendarDays } from 'lucide-react';
import { getWatchEpisodes, prettyDate } from '@/lib/content';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'OgasTV Studio — Video and programmes',
  description:'Watch OgasTV Africa video podcasts, documentaries, interviews and presenter-led coverage.',
  alternates:{canonical:'/watch'},
};
export default async function WatchPage(){
  const episodes=await getWatchEpisodes(36);
  return <div className="ogas-watch">
    <div className="ogas-watch__hero">
      <span className="ogas-watch__eyebrow"><Clapperboard size={17}/> WATCH / OGASTV AFRICA</span>
      <h1>OgasTV Studio<span>.</span></h1>
      <p>Conversations, community stories and reporting you can see and hear.</p>
      <Link href="/live">Watch live coverage <Radio size={16}/></Link>
    </div>
    <section aria-labelledby="watch-episodes-heading" className="ogas-watch__listing">
      <div className="ogas-watch__heading"><div><span>VIDEO JOURNALISM</span><h2 id="watch-episodes-heading">Latest programmes</h2></div>
        <span>{episodes.length} published {episodes.length===1?'episode':'episodes'}</span>
      </div>
      {episodes.length?<div className="ogas-watch__grid">
        {episodes.map(episode=><a className="ogas-watch__episode" key={episode.id}
          href={'https://www.youtube.com/watch?v='+encodeURIComponent(episode.youtubeVideoId)} target="_blank" rel="noopener noreferrer"
          aria-label={'Watch '+episode.title+' on YouTube'}>
          <div className="ogas-watch__image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" alt={episode.thumbnail?.alt||''}
              src={episode.thumbnail?.url||'https://i.ytimg.com/vi/'+episode.youtubeVideoId+'/hqdefault.jpg'}/>
            <span aria-hidden="true"><Play size={19} fill="currentColor"/></span>
          </div>
          <div className="ogas-watch__episode-copy">
            {episode.programmeTitle&&<span className="ogas-watch__programme">{episode.programmeTitle}</span>}
            <h3>{episode.title}</h3>
            {episode.description&&<p>{episode.description}</p>}
            {episode.releasedAt&&<span className="ogas-watch__date"><CalendarDays size={13}/>{prettyDate(episode.releasedAt)}</span>}
          </div>
        </a>)}
      </div>:<div className="ogas-watch__empty"><Clapperboard size={29}/>
        <h3>Our video archive is growing.</h3>
        <p>Published podcasts, interviews and reports will appear here.</p>
        <Link href="/live">Explore live coverage <ArrowUpRight size={15}/></Link>
      </div>}
    </section>
  </div>;
}
