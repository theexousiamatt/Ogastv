import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decode } from 'html-entities';
import { getPayload } from 'payload';
import config from '../payload.config';

if (process.env.OGASTV_RESTORE_ARCHIVE_TEN !== 'YES') {
  throw new Error('Explicit archive restore flag is required.');
}

const archivePath = new URL('../data/wordpress/2026-11-05/published-content.json.gz', import.meta.url);
const zipped = readFileSync(archivePath);
const expected = '1d7440a930877b082c62d8e732fc41f1065accf0fff7fb9d6b055d4f91404443';
if (createHash('sha256').update(zipped).digest('hex') !== expected) {
  throw new Error('WordPress archive checksum mismatch — refusing to import.');
}
type WP = {
  id: number; slug: string; link: string; date_gmt?: string; date?: string;
  title?: {rendered?: string}; excerpt?: {rendered?: string}; content?: {rendered?: string};
  categories?: number[]; tags?: number[]; author?: number; featured_media?: number;
  _embedded?: {'wp:featuredmedia'?: Array<{source_url?: string; alt_text?: string}>; author?: Array<{name?: string}>};
};
type Category = {id:number;slug:string;name:string};
type Tag = {id:number;slug:string;name:string};
type Media = {id:number;source_url?:string;alt_text?:string};
type Author = {id:number;name:string};
const snapshot = JSON.parse(gunzipSync(zipped).toString('utf8')) as {
  records: {posts:WP[];categories:Category[];tags:Tag[];media:Media[];users:Author[]};
};
if (snapshot.records.posts.length !== 193) {
  throw new Error('Unexpected archived post count. Aborting.');
}
const clean = (html:string) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
const iso = (post:WP) => {
  const raw = post.date_gmt && post.date_gmt !== '0000-00-00T00:00:00' ? post.date_gmt+'Z' : post.date||'';
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};
const lexical = (html:string,fallback:string) => {
  const text = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi,'\n\n')
    .replace(/<[^>]*>/g,' ').trim());
  return { root: {type:'root',version:1,direction:'ltr',format:'',indent:0,
    children:(text||fallback).split(/\n{2,}/).map(s=>s.trim()).filter(Boolean).map(s=>({
      type:'paragraph',version:1,direction:'ltr',format:'',indent:0,textFormat:0,textStyle:'',
      children:[{type:'text',text:s,mode:'normal',detail:0,format:0,style:'',version:1}]
    })) } };
};
const selected = [...snapshot.records.posts].sort((a,b) =>
  (Date.parse(iso(b)||'')||0)-(Date.parse(iso(a)||'')||0) || b.id-a.id).slice(0,10);
if (selected.length !== 10 || new Set(selected.map(p=>p.id)).size!==10) throw new Error('Ten unique posts required.');
const cms = await getPayload({config});
const categoryMap = new Map<number,number|string>();
const tagMap = new Map<number,number|string>();
const categoryLookup = new Map(snapshot.records.categories.map(c=>[c.id,c]));
const tagLookup = new Map(snapshot.records.tags.map(t=>[t.id,t]));
async function term(kind:'categories'|'tags',slug:string,name:string) {
  const prior = await cms.find({collection:kind,where:{slug:{equals:slug}},limit:1,depth:0,overrideAccess:true});
  if (prior.docs[0]) return prior.docs[0].id;
  const created = await cms.create({collection:kind,data:{slug,name},overrideAccess:true});
  return created.id;
}
for (const post of selected) {
  for (const id of post.categories||[]) if (!categoryMap.has(id)) {
    const item=categoryLookup.get(id);
    if (item) categoryMap.set(id,await term('categories',item.slug,clean(item.name)));
  }
  for (const id of post.tags||[]) if (!tagMap.has(id)) {
    const item=tagLookup.get(id);
    if (item) tagMap.set(id,await term('tags',item.slug,clean(item.name)));
  }
}
let imported=0, existing=0;
const media=new Map(snapshot.records.media.map(m=>[m.id,m]));
const authors=new Map(snapshot.records.users.map(u=>[u.id,u.name]));
for (const post of selected) {
  const prior=await cms.find({collection:'articles',where:{originalWordpressId:{equals:post.id}},limit:1,depth:0,overrideAccess:true});
  if (prior.docs.length) {existing++;continue;}
  const collision=await cms.find({collection:'articles',where:{slug:{equals:post.slug}},limit:1,depth:0,overrideAccess:true});
  if (collision.docs.length) throw new Error('Article slug conflict: '+post.slug);
  const category=(post.categories||[]).map(id=>categoryMap.get(id)).find(Boolean);
  if (!category) throw new Error('No category for archived post #'+post.id);
  const html=post.content?.rendered||'';
  const headline=clean(post.title?.rendered||'')||'Untitled report';
  const summary=(clean(post.excerpt?.rendered||'')||clean(html)||'Archived OgasTV Africa report.').slice(0,800);
  const featured=media.get(post.featured_media||-1);
  const embedded=post._embedded?.['wp:featuredmedia']?.[0];
  await cms.create({collection:'articles',overrideAccess:true,draft:true,data:{
    title:headline.slice(0,250),slug:post.slug,summary,body:lexical(html,summary),
    _status:'draft',workflowStatus:'draft',editorialType:'news',
    publicByline:clean(authors.get(post.author||0)||post._embedded?.author?.[0]?.name||'OgasTV Africa').slice(0,250),
    originalWordpressId:post.id,originalWordpressUrl:post.link,
    firstPublishedAt:iso(post),primaryCategory:category,
    secondaryCategories:(post.categories||[]).slice(1).map(id=>categoryMap.get(id)).filter(Boolean),
    tags:(post.tags||[]).map(id=>tagMap.get(id)).filter(Boolean),
    legacyHtml:html,
    legacyFeaturedImageUrl:featured?.source_url||embedded?.source_url||undefined,
    legacyFeaturedImageAlt:featured?.alt_text||embedded?.alt_text||headline,
    legacyMediaWordpressId:post.featured_media||undefined,
  } as any});
  imported++;
}
console.log('[OgasTV archive restore] '+JSON.stringify({selected:10,imported,existing,source:'verified 2026-11-05 archive',status:'draft'}));
const check=await cms.find({collection:'articles',where:{originalWordpressId:{in:selected.map(p=>p.id)}},limit:20,depth:0,overrideAccess:true});
if (check.totalDocs!==10) throw new Error('Archive restore reconciliation failed: expected 10, got '+check.totalDocs);
console.log('[OgasTV archive restore] Verified all 10 historical IDs in CMS.');
