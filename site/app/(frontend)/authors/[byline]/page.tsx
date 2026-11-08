import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoryCard } from '@/components/StoryCard';
import { getPublishedBylineArticles } from '@/lib/content';

export const dynamic='force-dynamic';
type Props={params:Promise<{byline:string}>;searchParams:Promise<{page?:string}>};
const storiesByAuthor=cache((byline:string,page:number)=>getPublishedBylineArticles(byline,page,24));

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const byline=(await params).byline;
  if(!byline||byline.length>100)return {title:'Author unavailable',robots:{index:false}};
  const result=await storiesByAuthor(byline,1);
  if(!result.total)return {title:'Author unavailable',robots:{index:false}};
  return {title:'Stories by '+byline,description:'Published reporting by '+byline+' for OgasTV Nigeria.',
    alternates:{canonical:'/authors/'+encodeURIComponent(byline)}};
}

export default async function AuthorPage({params,searchParams}:Props){
  const byline=(await params).byline;
  if(!byline||byline.length>100)notFound();
  const query=await searchParams;
  const page=/^\d{1,5}$/.test(query.page||'')?Math.max(1,Number(query.page)):1;
  const result=await storiesByAuthor(byline,page);
  if(!result.total)notFound();
  const url=(p:number)=>'/authors/'+encodeURIComponent(byline)+'?page='+String(p);
  return <div className="ogas-author-page">
    <nav aria-label="Breadcrumb" className="ogas-archive__breadcrumb"><Link href="/">Home</Link><span>/</span>
      <Link href="/latest">Stories</Link><span>/</span><span aria-current="page">{byline}</span></nav>
    <header><span className="ogas-archive__eyebrow">OGASTV NIGERIA / BYLINE ARCHIVE</span>
      <h1>Stories by {byline}<span>.</span></h1>
      <p>{result.total} published {result.total===1?'story':'stories'} from this byline.</p>
    </header>
    <div className="ogas-archive__grid">{result.stories.map(article=><StoryCard article={article} key={article.id}/>)}</div>
    {result.totalPages>1&&<nav className="ogas-archive__pagination" aria-label="Author archive pages">
      {result.page>1?<Link href={url(result.page-1)}>← Previous</Link>:<span/>}
      <span>Page {result.page} of {result.totalPages}</span>
      {result.page<result.totalPages?<Link href={url(result.page+1)}>Next →</Link>:<span/>}
    </nav>}
  </div>;
}
