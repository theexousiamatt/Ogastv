import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, Clapperboard } from 'lucide-react';
import { getStudioArchive } from '@/lib/studio-archive';
import { StudioLibrary } from '@/components/StudioLibrary';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'OgasTV Studio — Video and programmes',
  description:'Watch OgasTV Nigeria video podcasts, documentaries, interviews and completed livestreams.',
  alternates:{canonical:'/watch'},
};

export default async function WatchPage(){
  const episodes=await getStudioArchive(48);
  const videos=episodes.map(item=>({
    id:item.id,title:item.title,description:item.description,
    youtubeVideoId:item.youtubeVideoId,releasedAt:item.releasedAt,
    programmeTitle:item.programmeTitle,
    thumbnail:item.thumbnail?.url||'https://i.ytimg.com/vi/'+item.youtubeVideoId+'/hqdefault.jpg',
  }));
  return <div className="ogas-watch">
    <div className="ogas-watch__hero">
      <span className="ogas-watch__eyebrow"><Clapperboard size={17}/> WATCH / OGASTV NIGERIA</span>
      <h1>OgasTV Studio<span>.</span></h1>
      <p>Conversations, community stories and reporting you can see and hear.</p>
      <Link href="/live">Watch live coverage <Radio size={16}/></Link>
    </div>
    <StudioLibrary videos={videos}/>
  </div>;
}
