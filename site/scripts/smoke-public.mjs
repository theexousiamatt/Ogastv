import assert from 'node:assert/strict';

if(process.env.CI!=='true'||!process.env.DATABASE_URL?.includes('@localhost:5432/ogastv_ci'))
  throw new Error('Public OgasTV smoke tests run only against disposable CI');
const base='http://127.0.0.1:'+String(process.env.PORT||'3000');
const visit=async(path)=>{
  const response=await fetch(base+path,{redirect:'manual',cache:'no-store'});
  const text=await response.text();
  return {status:response.status,headers:response.headers,text};
};
for(const path of ['/', '/latest', '/watch', '/live', '/about', '/contact', '/editorial-standards',
  '/corrections','/advertise','/privacy','/reading-list','/robots.txt','/sitemap.xml']){
  const response=await visit(path);
  assert.equal(response.status,200,path+' should render publicly');
  assert.ok(response.text.length>20,path+' should not be empty');
}
// Every editorial menu destination must load, including desks without published stories.
for(const [slug,label] of [
  ['lagos-watch','Lagos Watch'],
  ['government-policies','Government & Policies'],
  ['grassroots-voices','Grassroots Voices'],
  ['business-investment','Business & Investment'],
  ['personalities','Personalities'],
]){
  const response=await visit('/section/'+slug);
  assert.equal(response.status,200,'Menu category '+label+' should render');
  assert.ok(response.text.includes(label),'Menu category '+label+' should show the matching desk');
}
const live=await visit('/live');
assert.equal(live.status,200,'Live menu action should resolve');
assert.ok(live.text.includes('Live from the story.'),'Live menu action reaches the public broadcast page');
const headerSource=(await import('node:fs')).readFileSync(new URL('../components/SiteHeader.tsx',import.meta.url),'utf8');
assert.ok(headerSource.includes('href="/live"'),'Global header must link directly to /live');
assert.ok(headerSource.includes('ogas-public-live-entry'),'Desktop Live entry must remain visible');
assert.ok(headerSource.includes('ogas-public-mobile-navigation__live'),'Mobile Live entry must remain visible');
const liveSource=(await import('node:fs')).readFileSync(new URL('../app/(frontend)/live/page.tsx',import.meta.url),'utf8');
assert.ok(liveSource.includes('[A-Za-z0-9_-]{11}'),'YouTube fallback accepts valid video IDs');
const playerSource=(await import('node:fs')).readFileSync(new URL('../components/LiveViewer.tsx',import.meta.url),'utf8');
assert.ok(playerSource.includes('await firstVideoFrame('),
  'Live player must confirm a decoded frame before showing the playing state');

const robots=await visit('/robots.txt');
assert.match(robots.text,/Disallow: \/studio/,'Private newsroom excluded from indexing');
const sitemap=await visit('/sitemap.xml');
assert.match(sitemap.text,/ogastvafrica\.ng\/latest/,'Latest page is indexed');

const articlesResponse=await visit('/api/articles?limit=5&depth=1&where[_status][equals]=published');
const body=JSON.parse(articlesResponse.text);
assert.ok(body.docs?.length,'CI published a story for route verification');
const article=body.docs[0];
const slug=String(article.slug);
const story=await visit('/stories/'+encodeURIComponent(slug));
assert.equal(story.status,200,'Published article renders');
assert.match(story.text,/application\/ld\+json/,'Article has NewsArticle structured data');
assert.match(story.text,/Save this story/,'Article offers saved stories');
assert.match(story.text,/min read/,'Article exposes reading time');
assert.match(story.text,/ogastvafrica\.ng\/stories\//,'Article canonical link exists');

const old=await visit('/'+encodeURIComponent(slug));
assert.ok([307,308].includes(old.status),'Legacy WordPress URL redirects');
assert.equal(new URL(old.headers.get('location')||'',base).pathname,'/stories/'+encodeURIComponent(slug),
  'Legacy URL points to canonical article');
if(article.primaryCategory?.slug){
  const category=await visit('/section/'+encodeURIComponent(article.primaryCategory.slug));
  assert.equal(category.status,200,'Canonical category page renders');
  assert.ok(category.text.includes('Internal CI'),'Published article appears in its primary category archive');
}
const searched=await visit('/latest?q=Internal');
assert.equal(searched.status,200,'Latest search page renders');
assert.ok(searched.text.includes('Internal CI'),'Published article can be found in search');

// Guard against the bug where an escaped word class rejects valid YouTube IDs.
const {readFileSync}=await import('node:fs');
const contentSource=readFileSync(new URL('../lib/content.ts',import.meta.url),'utf8');
assert.ok(contentSource.includes('[A-Za-z0-9_-]{11}'),
  'Published video archive must accept all valid YouTube ID characters');
const admin=await visit('/admin');
assert.ok([307,308].includes(admin.status),'Retired native admin root redirects');
console.log('PASS: public homepage, article layout, category archives, search, video, policy pages, saved reading, sitemap, robots and WordPress redirects');
