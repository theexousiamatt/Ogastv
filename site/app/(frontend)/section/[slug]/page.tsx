import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { searchPublicArticles } from '@/lib/content';
import { getPublicDirectoryData } from '@/lib/public-cache';
import { homepageCategoryDefinitions, archiveCategoryAliases } from '@/lib/editorial-sections';
import { StoryCard } from '@/components/StoryCard';

export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{q?:string;location?:string;page?:string;sort?:string}>};

function titleFromSlug(slug:string,categories:{name:string;slug:string}[]):string{
  return homepageCategoryDefinitions.find(def=>def.slug===slug)?.title||
    categories.find(item=>item.slug===slug)?.name||'';
}
function href(slug:string,query:Record<string,string>){
  const params=new URLSearchParams(Object.entries(query).filter(([,v])=>Boolean(v)));
  const suffix=params.toString();
  return '/section/'+encodeURIComponent(slug)+(suffix?'?'+suffix:'');
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const slug=(await params).slug;
  const [categories]=await getPublicDirectoryData();
  const title=titleFromSlug(slug,categories);
  if(!title)return {title:'Section unavailable',robots:{index:false,follow:false}};
  return {title:title+' News',description:'Latest '+title.toLowerCase()+' reporting and perspectives from OgasTV Africa.',
    alternates:{canonical:'/section/'+encodeURIComponent(slug)}};
}
export default async function SectionPage({params,searchParams}:Props){
  const slug=(await params).slug;
  const query=await searchParams;
  const [categories,locations]=await getPublicDirectoryData();
  const title=titleFromSlug(slug,categories);
  if(!title)notFound();
  const q=(query.q||'').trim().slice(0,120);
  const selectedLocation=(query.location||'').trim().slice(0,120).toLowerCase();
  const location=locations.some(item=>item.slug===selectedLocation)?selectedLocation:'';
  const sort=query.sort==='oldest'?'oldest':'newest';
  const page=/^\d{1,5}$/.test(query.page||'')?Math.max(1,Number(query.page)):1;
  const results=await searchPublicArticles({query:q,category:slug,location,sort,page,limit:24});
  const nextPage=(num:number)=>href(slug,{q,location,sort:sort==='oldest'?'oldest':'',page:String(num)});
  const isLocal=archiveCategoryAliases('lagos-watch').includes(slug);
  return <div className="ogas-archive">
    <nav aria-label="Breadcrumb" className="ogas-archive__breadcrumb">
      <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/latest">News</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span>
    </nav>
    <header className="ogas-archive__heading">
      <span className="ogas-archive__eyebrow">OGASTV AFRICA / EDITORIAL DESK</span>
      <h1>{title}<span>.</span></h1>
      <p>{isLocal?'Stories and decisions shaping everyday life across Lagos councils.':'Reporting, context and perspectives from our '+title+' desk.'}</p>
    </header>
    {isLocal&&<nav aria-label="Lagos council shortcuts" className="ogas-archive__shortcuts">
      <Link href={href(slug,{q,sort:sort==='oldest'?'oldest':''})} className={!location?'active':''}>All Lagos</Link>
      {locations.filter(item=>item.kind==='lga'||item.kind==='lcda').slice(0,12).map(item=>
        <Link key={item.slug} className={location===item.slug?'active':''} href={href(slug,{q,location:item.slug,sort:sort==='oldest'?'oldest':''})}>{item.name}</Link>)}
    </nav>}
    <form action={'/section/'+encodeURIComponent(slug)} method="get" role="search" className="ogas-archive__filters">
      <label className="ogas-archive__search"><Search size={18} aria-hidden="true"/>
        <input type="search" name="q" placeholder={'Search '+title+' stories'} defaultValue={q} maxLength={120}/>
      </label>
      {isLocal&&<label className="ogas-archive__select"><MapPin size={15} aria-hidden="true"/>
        <span className="sr-only">Filter by council</span>
        <select name="location" defaultValue={location}>
          <option value="">All councils</option>
          {locations.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>}
      <label className="ogas-archive__select"><SlidersHorizontal size={15} aria-hidden="true"/>
        <span className="sr-only">Sort stories</span>
        <select name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
      </label>
      <button type="submit">Apply filters <ArrowRight size={15}/></button>
    </form>
    <div className="ogas-archive__results-header"><strong>{results.total} {results.total===1?'story':'stories'}</strong>
      <span>{location?'In '+(locations.find(item=>item.slug===location)?.name||'Lagos'):q?'Matching your search':'Latest reports'}</span>
    </div>
    {results.stories.length?
      <div className="ogas-archive__grid">{results.stories.map(item=><StoryCard article={item} key={item.id}/>)}</div>:
      <div className="ogas-archive__empty"><h2>No reports found for these filters.</h2><p>Try another council or browse all {title.toLowerCase()} coverage.</p>
        <Link href={'/section/'+encodeURIComponent(slug)}>Clear filters <ArrowRight size={15}/></Link></div>}
    {results.totalPages>1&&<nav className="ogas-archive__pagination" aria-label="Archive pages">
      {results.page>1?<Link href={nextPage(results.page-1)}>← Previous</Link>:<span/>}
      <span>Page {results.page} of {results.totalPages}</span>
      {results.page<results.totalPages?<Link href={nextPage(results.page+1)}>Next →</Link>:<span/>}
    </nav>}
  </div>;
}
