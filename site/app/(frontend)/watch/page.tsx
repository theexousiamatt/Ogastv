import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, ArrowUpRight, Clapperboard, CalendarDays } from 'lucide-react';
import { prettyDate } from '@/lib/content';
import { getStudioArchive } from '@/lib/studio-archive';
import { YouTubeArchivePlayer } from '@/components/YouTubeArchivePlayer';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'OgasTV Studio — Video and programmes',
  description:'Watch OgasTV Nigeria video podcasts, documentaries, interviews and completed livestreams.',
  alternates:{canonical:'/watch'},
};

export default async function WatchPage(){
  const episodes=await getStudioArchive(36);
  return <div className="ogas-watch">
    <div className="ogas-watch__hero">
      <span className="ogas-watch__eyebrow"><Clapperboard size={17}/> WATCH / OGASTV NIGERIA</span>
      <h1>OgasTV Studio<span>.</span></h1>
      <p>Conversations, community stories and reporting you can see and hear.</p>
      <Link href="/live">Watch live coverage <Radio size={16}/></Link>
    </div>
    <section aria-labelledby="watch-episodes-heading" className="ogas-watch__listing">
      <div className="ogas-watch__heading"><div><span>VIDEO JOURNALISM</span><h2 id="watch-episodes-heading">Latest programmes</h2></div>
        <span>{episodes.length} published {episodes.length===1?'video':'videos'}</span>
      </div>
      {episodes.length?<div className="ogas-watch__grid">
        {episodes.map(episode=><article className="ogas-watch__episode" key={episode.id}>
          <YouTubeArchivePlayer videoId={episode.youtubeVideoId} title={episode.title}
            thumbnail={episode.thumbnail?.url||'https://i.ytimg.com/vi/'+episode.youtubeVideoId+'/hqdefault.jpg'}/>
          <div className="ogas-watch__episode-copy">
            {episode.programmeTitle&&<span className="ogas-watch__programme">{episode.programmeTitle}</span>}
            <h3>{episode.title}</h3>
            {episode.description&&<p>{episode.description}</p>}
            {episode.releasedAt&&<span className="ogas-watch__date"><CalendarDays size={13}/>{prettyDate(episode.releasedAt)}</span>}
            <p style={{marginTop:12}}>
              <a href={'https://www.youtube.com/watch?v='+episode.youtubeVideoId} target="_blank"
                rel="noopener noreferrer" aria-label={'Open '+episode.title+' on YouTube'}>
                Open on YouTube <ArrowUpRight size={14} aria-hidden="true"/>
              </a>
            </p>
          </div>
        </article>)}
      </div>:<div className="ogas-watch__empty"><Clapperboard size={29}/>
        <h3>Our video archive is growing.</h3>
        <p>Completed YouTube broadcasts and published programmes will appear here.</p>
        <Link href="/live">Explore live coverage <ArrowUpRight size={15}/></Link>
      </div>}
    </section>
  </div>;
}
