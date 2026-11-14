import type { Metadata } from 'next';
import { getStudioArchive } from '@/lib/studio-archive';
import { StudioLibrary } from '@/components/StudioLibrary';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'OgasTV Studio — Video library',
  description:'Explore OgasTV Nigeria video programmes, interviews and past livestreams.',
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
  return <div className="ogas-watch"><StudioLibrary videos={videos}/></div>;
}
