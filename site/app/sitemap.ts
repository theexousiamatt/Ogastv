import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getPublicDirectoryData } from '@/lib/public-cache';
import { homepageCategoryDefinitions } from '@/lib/editorial-sections';

export const dynamic='force-dynamic';
const ORIGIN='https://ogastvafrica.ng';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const staticRoutes=['/','/latest','/watch','/live','/about','/contact','/editorial-standards','/corrections','/privacy','/advertise'];
  const result:MetadataRoute.Sitemap=staticRoutes.map(path=>({
    url:ORIGIN+path,changeFrequency:path==='/'||path==='/latest'?'daily':'monthly',
    priority:path==='/'?1:path==='/latest'?.9:.6,
  }));
  try{
    const [categories]=await getPublicDirectoryData();
    const canonical=new Set(homepageCategoryDefinitions.map(def=>def.slug));
    for(const category of categories)canonical.add(category.slug);
    for(const slug of canonical){
      result.push({url:ORIGIN+'/section/'+encodeURIComponent(slug),
        changeFrequency:'daily',priority:.7});
    }
    const payload=await getPayload({config});
    // Bounded pagination avoids constructing an unbounded sitemap in memory.
    for(let page=1;page<=25;page++){
      const response=await payload.find({
        collection:'articles',overrideAccess:false,depth:0,
        where:{_status:{equals:'published'}},limit:200,page,
        sort:'-firstPublishedAt',select:{slug:true,updatedAt:true},
      });
      for(const article of response.docs){
        if(!article.slug)continue;
        const modified=article.updatedAt?new Date(article.updatedAt):undefined;
        result.push({url:ORIGIN+'/stories/'+encodeURIComponent(article.slug),
          lastModified:modified&&Number.isFinite(modified.getTime())?modified:undefined,
          changeFrequency:'weekly',priority:.8});
      }
      if(!response.hasNextPage)break;
    }
  }catch(error){
    console.error('[OgasTV] Sitemap article discovery failed',error);
    // Static pages remain discoverable even during a CMS outage.
  }
  return result;
}
