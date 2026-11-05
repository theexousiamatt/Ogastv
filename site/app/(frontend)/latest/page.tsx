import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search, Newspaper } from 'lucide-react';
import { StoryCard } from '@/components/StoryCard';
import { getArticles, getCategories } from '@/lib/content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Latest Stories',
  description: 'Reporting from Lagos, Nigeria and beyond. Explore OgasTV Africa news and community reporting.',
};

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function LatestNews({searchParams}:Props) {
  const {q = '', category = ''} = await searchParams;
  const term = q.trim().slice(0,120).toLocaleLowerCase();
  const slug = category.trim().slice(0,120).toLocaleLowerCase();
  const [stories,categories] = await Promise.all([getArticles(100),getCategories()]);
  const filtered = stories.filter(article=>
    (!slug || article.category?.slug === slug) &&
    (!term || [article.title,article.excerpt,article.category?.name||''].some(s=>s.toLocaleLowerCase().includes(term)))
  );
  return <div className="ogas-latest-v2">
    <div className="ogas-latest-v2__top">
      <div><span className="eyebrow">FROM THE NEWSROOM</span><h1>Latest Stories<span className="heading-period">.</span></h1>
        <p>People, places and perspectives from Lagos and across Africa.</p></div>
      <form action="/latest" method="get" role="search" className="ogas-latest-v2__search">
        <Search size={18}/><input name="q" defaultValue={q} type="search" placeholder="Search headlines or topics..." aria-label="Search stories"/>
        {category && <input type="hidden" name="category" value={category}/>}
        <button type="submit">Search <ArrowRight size={14}/></button>
      </form>
    </div>
    <nav className="ogas-latest-v2__filters" aria-label="Filter news by category">
      <Link href={term?'/latest?q='+encodeURIComponent(q):'/latest'} className={!slug?'selected':''}>All stories</Link>
      {[{name:'News',slug:'news'},{name:'Politics',slug:'politics'},{name:'Business',slug:'business'},{name:'Culture',slug:'culture'},{name:'Community',slug:'community'},{name:'Lagos',slug:'lagos-watch'}].map(c=>
        <Link key={c.slug} href={'/latest?category='+encodeURIComponent(c.slug)+(term?'&q='+encodeURIComponent(q):'')} className={slug===c.slug?'selected':''}>{c.name}</Link>)}
      {categories.filter(c=>!['news','politics','business','culture','community','lagos-watch'].includes(c.slug)).slice(0,5).map(c=>
        <Link key={c.slug} href={'/latest?category='+encodeURIComponent(c.slug)+(term?'&q='+encodeURIComponent(q):'')} className={slug===c.slug?'selected':''}>{c.name}</Link>)}
    </nav>
    <div className="ogas-latest-v2__results">
      <div className="ogas-latest-v2__result-label"><strong>{filtered.length} {filtered.length===1?'story':'stories'}</strong><span>{term?'Matching “'+q.trim()+'”':slug?'In '+(categories.find(c=>c.slug===slug)?.name||slug):'Latest newsroom coverage'}</span></div>
      {filtered.length ? <div className="story-grid">{filtered.map(article=><StoryCard article={article} key={article.id}/>)}</div> :
      <div className="ogas-latest-v2__empty"><span><Newspaper size={27}/></span><h2>{term||slug?'No matching reports yet.':'Stories are on their way.'}</h2>
        <p>{term||slug?'Try another search or browse all stories.':'Our editors are preparing the first reports for the new OgasTV newsroom.'}</p>
        <Link href="/latest">Browse all stories <ArrowRight size={15}/></Link></div>}
    </div>
  </div>;
}
