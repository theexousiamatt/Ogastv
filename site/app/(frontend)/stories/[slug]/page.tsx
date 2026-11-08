import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import sanitizeHtml from 'sanitize-html';
import { notFound } from 'next/navigation';
import { Clock3, CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import { getArticle, getRelatedArticles, prettyDate } from '@/lib/content';
import { ArticleShare } from '@/components/ArticleShare';
import { SaveStory } from '@/components/SaveStory';
import { StoryCard } from '@/components/StoryCard';
import './reading.css';

export const dynamic = 'force-dynamic';
const SITE_URL = 'https://ogastvafrica.ng';
type Props = { params: Promise<{ slug: string }> };

// Deduplicate the metadata and article-page lookups within each request.
const loadStory = cache((slug: string) => getArticle(slug));
const plainWords = (html:string) => html.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').trim().split(/\s+/).filter(Boolean).length;
const minutes = (html:string) => Math.max(1,Math.ceil(plainWords(html)/220));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug=(await params).slug;
  const article=await loadStory(slug);
  if(!article)return { title:'Story unavailable', robots:{index:false,follow:false} };
  const description=article.metaDescription||article.excerpt||article.title;
  const canonical='/stories/'+encodeURIComponent(article.slug);
  const image=article.image?.url||'/ogastv-official-logo.png';
  return {
    title:article.metaTitle||article.title,
    description,
    alternates:{canonical},
    openGraph:{
      type:'article',url:new URL(canonical,SITE_URL).toString(),
      title:article.metaTitle||article.title,description,
      publishedTime:article.date,modifiedTime:article.updatedAt||article.date,
      authors:article.author?[article.author]:['OgasTV Africa'],
      images:[{url:image,alt:article.image?.alt||article.title}],
    },
    twitter:{card:'summary_large_image',title:article.title,description,images:[image]},
  };
}

export default async function ArticlePage({ params }: Props) {
  const slug=(await params).slug;
  const article=await loadStory(slug);
  if(!article)notFound();
  const html=sanitizeHtml(article.html,{
    allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','figure','figcaption','iframe','video','source','blockquote'],
    allowedAttributes:{
      ...sanitizeHtml.defaults.allowedAttributes,
      img:['src','srcset','sizes','alt','width','height','loading'],
      iframe:['src','title','width','height','allow','allowfullscreen','loading'],
      source:['src','srcset','sizes','type'],
      video:['src','controls','poster','width','height'],
      '*':['class'],
    },
    allowedSchemes:['https','http'],
    allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'],
  });
  const related=await getRelatedArticles(article,4);
  const updated=article.updatedAt?new Date(article.updatedAt).getTime():0;
  const published=new Date(article.date).getTime();
  const hasUpdate=Number.isFinite(updated)&&Number.isFinite(published)&&updated-published>24*60*60*1000;
  const canonical=SITE_URL+'/stories/'+encodeURIComponent(article.slug);
  const structuredData={
    '@context':'https://schema.org','@type':'NewsArticle',
    mainEntityOfPage:canonical,headline:article.title,
    description:article.metaDescription||article.excerpt,
    image:article.image?[article.image.url]:undefined,
    datePublished:article.date,dateModified:article.updatedAt||article.date,
    author:{'@type':'Person',name:article.author||'OgasTV Africa'},
    publisher:{'@type':'Organization',name:'OgasTV Africa',
      url:SITE_URL,logo:{'@type':'ImageObject',url:SITE_URL+'/ogastv-official-logo.png'}},
    articleSection:article.category?.name||'News',
    wordCount:plainWords(html),
    inLanguage:'en-NG',
    isAccessibleForFree:true,
  };
  return <>
    <div className="ogas-reading-progress" aria-hidden="true"/>
    <article className="ogas-reading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,'\\u003c')}}/>
      <nav aria-label="Breadcrumb" className="ogas-reading__breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        {article.category?<><Link href={'/latest?category='+encodeURIComponent(article.category.slug)}>{article.category.name}</Link><span aria-hidden="true">/</span></>:null}
        <span aria-current="page">Article</span>
      </nav>
      <header className="ogas-reading__header">
        <div className="ogas-reading__kickers">
          {article.category&&<Link className="ogas-reading__category" href={'/latest?category='+encodeURIComponent(article.category.slug)}>{article.category.name}</Link>}
          {article.editorialType&&article.editorialType!=='news'&&
            <span className="ogas-reading__type">{article.editorialType==='sponsored'?'Sponsored content':article.editorialType}</span>}
        </div>
        <h1>{article.title}</h1>
        {article.subtitle&&<p className="ogas-reading__subtitle">{article.subtitle}</p>}
        {article.excerpt&&<p className="ogas-reading__summary">{article.excerpt}</p>}
        <div className="ogas-reading__byline">
          <span><strong>{article.author?
            <Link href={'/authors/'+encodeURIComponent(article.author)}>{article.author}</Link>:
            'OgasTV Africa Newsroom'}</strong><small>Reporting for OgasTV Africa</small></span>
          <div className="ogas-reading__meta">
            <span><CalendarDays size={14} aria-hidden="true"/><time dateTime={article.date}>{prettyDate(article.date)}</time></span>
            <span><Clock3 size={14} aria-hidden="true"/>{minutes(html)} min read</span>
          </div>
        </div>
        {hasUpdate&&<p className="ogas-reading__updated">Updated <time dateTime={article.updatedAt}>{prettyDate(article.updatedAt!)}</time></p>}
        <SaveStory story={{slug:article.slug,title:article.title,date:article.date,
          category:article.category?.name||''}}/>
        {article.locations?.length?<div className="ogas-reading__locations"><MapPin size={14} aria-hidden="true"/>
          {article.locations.map((place,i)=><span key={place.slug}>{i>0?' · ':''}<Link href={'/latest?location='+encodeURIComponent(place.slug)}>{place.name}</Link></span>)}
        </div>:null}
      </header>
      {article.image&&<figure className="ogas-reading__figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ogas-reading__cover" src={article.image.url} alt={article.image.alt||article.title} fetchPriority="high" decoding="async"/>
        {(article.image.caption||article.image.credit)&&
          <figcaption>{article.image.caption||''}{article.image.credit?' — '+article.image.credit:''}</figcaption>}
      </figure>}
      <div className="ogas-reading__content-grid">
        <aside className="ogas-reading__share"><span>SHARE THIS STORY</span><ArticleShare title={article.title}/></aside>
        <div className="ogas-reading__article-body">
          <div className="article-content" dangerouslySetInnerHTML={{__html:html}}/>
          {article.correctionNotice&&<aside className="ogas-reading__correction" aria-label="Editorial correction">
            <strong>Correction or clarification</strong><p>{article.correctionNotice}</p>
          </aside>}
          <div className="ogas-reading__end"><span>End of article</span><ArticleShare title={article.title}/></div>
        </div>
      </div>
    </article>
    {related.length>0&&<section className="ogas-reading__related" aria-labelledby="ogas-related-heading">
      <div className="ogas-reading__related-heading"><div>
        <span className="ogas-reading__eyebrow">CONTINUE READING</span>
        <h2 id="ogas-related-heading">More stories worth your time.</h2></div>
        <Link href={article.category?'/latest?category='+encodeURIComponent(article.category.slug):'/latest'}>Explore more <ArrowUpRight size={17}/></Link>
      </div>
      <div className="ogas-reading__related-grid">{related.map(item=><StoryCard key={item.id} article={item}/>)}</div>
    </section>}
  </>;
}
