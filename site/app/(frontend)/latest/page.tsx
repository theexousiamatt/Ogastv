import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search, Newspaper, MapPin, SlidersHorizontal } from 'lucide-react';
import { StoryCard } from '@/components/StoryCard';
import { searchPublicArticles } from '@/lib/content';
import { getPublicDirectoryData } from '@/lib/public-cache';
import { homepageCategoryDefinitions } from '@/lib/editorial-sections';

export const dynamic='force-dynamic';
type Props={searchParams:Promise<{q?:string;category?:string;location?:string;sort?:string;page?:string}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{
  const query=await searchParams;
  const filtered=Boolean(query.q||query.category||query.location||query.page||query.sort);
  return {
    title:'Latest Stories',
    description:'Reporting from Lagos, Nigeria and beyond. Discover people-first OgasTV Nigeria journalism.',
    alternates:{canonical:'/latest'},
    ...(filtered?{robots:{index:false,follow:true}}:{}),
  };
}

export default async function LatestNews({searchParams}:Props){
  const query=await searchParams;
  const q=(query.q||'').trim().slice(0,120);
  const category=(query.category||'').trim().slice(0,120).toLowerCase();
  const selectedLocation=(query.location||'').trim().slice(0,120).toLowerCase();
  const sort=query.sort==='oldest'?'oldest':'newest';
  const page=/^\d{1,5}$/.test(query.page||'')?Math.max(1,Number(query.page)):1;
  const [categories,locations]=await getPublicDirectoryData();
  const location=locations.some(item=>item.slug===selectedLocation)?selectedLocation:'';
  const results=await searchPublicArticles({query:q,category,location,sort,page,limit:24});
  const filtered=results.stories;
  const urlFor=(values:{category?:string;page?:number;location?:string;sort?:string})=>{
    const params=new URLSearchParams();
    if(q)params.set('q',q);
    if(values.category)params.set('category',values.category);
    if(values.location)params.set('location',values.location);
    if(values.sort==='oldest')params.set('sort','oldest');
    if(values.page&&values.page>1)params.set('page',String(values.page));
    const str=params.toString();
    return '/latest'+(str?'?'+str:'');
  };
  const selectedTitle=homepageCategoryDefinitions.find(def=>def.slug===category)?.title||
    categories.find(item=>item.slug===category)?.name||'All stories';
  return <div className="ogas-latest-v2">
    <div className="ogas-latest-v2__top">
      <div><span className="eyebrow">FROM THE NEWSROOM</span>
        <h1>Latest Stories<span className="heading-period">.</span></h1>
        <p>People, places and perspectives from Lagos and across Nigeria.</p>
      </div>
      <form action="/latest" method="get" role="search" className="ogas-latest-v2__search">
        <Search size={18} aria-hidden="true"/>
        <input name="q" defaultValue={q} maxLength={120} type="search" placeholder="Search headlines or topics…" aria-label="Search stories"/>
        {category&&<input type="hidden" name="category" value={category}/>}
        {location&&<input type="hidden" name="location" value={location}/>}
        {sort==='oldest'&&<input type="hidden" name="sort" value="oldest"/>}
        <button type="submit">Search <ArrowRight size={14}/></button>
      </form>
    </div>
    <nav className="ogas-latest-v2__filters" aria-label="News categories">
      <Link href={urlFor({location,sort})} className={!category?'selected':''}>All stories</Link>
      {homepageCategoryDefinitions.map(def=><Link key={def.key} className={category===def.slug?'selected':''}
        href={'/section/'+encodeURIComponent(def.slug)}>{def.title}</Link>)}
      <details className="ogas-latest-v2__more">
        <summary>More topics</summary>
        <div className="ogas-latest-v2__more-content">
          {categories.filter(item=>!homepageCategoryDefinitions.some(def=>def.slug===item.slug))
            .map(item=><Link key={item.slug} href={'/section/'+encodeURIComponent(item.slug)}>{item.name}</Link>)}
        </div>
      </details>
    </nav>
    <form className="ogas-latest-v2__tools" action="/latest" method="get">
      {q&&<input type="hidden" name="q" value={q}/>}
      {category&&<input type="hidden" name="category" value={category}/>}
      <label><MapPin size={15} aria-hidden="true"/><span className="sr-only">Filter stories by Lagos location</span>
        <select name="location" defaultValue={location}><option value="">All locations</option>
          {locations.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label><SlidersHorizontal size={15} aria-hidden="true"/><span className="sr-only">Sort articles</span>
        <select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </label>
      <button type="submit">Apply</button>
    </form>
    <div className="ogas-latest-v2__results">
      <div className="ogas-latest-v2__result-label"><strong>{results.total} {results.total===1?'story':'stories'}</strong>
        <span>{q?'Matching “'+q+'”':category?'In '+selectedTitle:location?'Filtered by '+(locations.find(l=>l.slug===location)?.name||'location'):'Latest newsroom coverage'}</span>
      </div>
      {filtered.length?<><div className="story-grid">{filtered.map(article=><StoryCard article={article} key={article.id}/>)}</div>
        {results.totalPages>1&&<nav className="ogas-latest-v2__pagination" aria-label="Story result pages">
          {results.page>1?<Link href={urlFor({category,location,sort,page:results.page-1})}>← Previous</Link>:<span/>}
          <span>Page {results.page} of {results.totalPages}</span>
          {results.page<results.totalPages?<Link href={urlFor({category,location,sort,page:results.page+1})}>Next →</Link>:<span/>}
        </nav>}</>:
        <div className="ogas-latest-v2__empty"><span><Newspaper size={27}/></span>
          <h2>{q||category||location?'No matching reports yet.':'Stories are on their way.'}</h2>
          <p>Try another search, location or category.</p>
          <Link href="/latest">Clear filters <ArrowRight size={15}/></Link>
        </div>}
    </div>
  </div>;
}
