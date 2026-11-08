import Link from 'next/link';
import { Menu, Search, UserRound, Radio } from 'lucide-react';
import { homepageCategoryDefinitions } from '@/lib/editorial-sections';

const navigation=[
  {title:'Home',href:'/'},
  {title:'Latest',href:'/latest'},
  ...homepageCategoryDefinitions.map(def=>({title:def.title,href:'/section/'+encodeURIComponent(def.slug)})),
  {title:'OgasTV Studio',href:'/watch'},
  {title:'Live',href:'/live'},
];

export function SiteHeader(){
  return <header className="ogas-public-header">
    <div className="ogas-public-header__inner">
      <Link href="/" className="ogas-public-brand" aria-label="OgasTV Nigeria home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ogas-public-brand__logo" src="/ogastv-official-logo.png" alt="OgasTV Nigeria" width={405} height={125}/>
      </Link>
      <div className="ogas-public-header__tools">
        <form action="/latest" method="get" role="search" className="ogas-public-search">
          <Search size={16} aria-hidden="true"/>
          <input type="search" name="q" placeholder="Search stories, topics…" aria-label="Search news stories" maxLength={120}/>
        </form>
        <Link href="/latest" className="ogas-header-mobile-search" aria-label="Search stories"><Search size={19}/></Link>
        <Link href="/studio" className="ogas-user-link" aria-label="Open staff newsroom"><UserRound size={18}/></Link>
      </div>
    </div>
    <nav className="ogas-public-nav ogas-public-nav--sections" aria-label="News categories">
      {navigation.map(item=><Link key={item.href} href={item.href}
        className={item.href==='/'?'ogas-public-nav__active':item.href==='/live'?'ogas-live-nav':''}>
        {item.title}{item.href==='/live'&&<span className="ogas-live-dot" aria-hidden="true"/>}
      </Link>)}
    </nav>
    <nav className="ogas-public-mobile-navigation" aria-label="Mobile news navigation">
      <Link href="/latest">Latest</Link>
      <Link href="/section/lagos-watch">Lagos Watch</Link>
      <Link href="/live" className="ogas-public-mobile-navigation__live"><Radio size={14}/> Live</Link>
      <details className="ogas-public-mobile-menu">
        <summary><Menu size={17} aria-hidden="true"/> Categories</summary>
        <div className="ogas-public-mobile-menu__panel">
          <span>EXPLORE OGASTV NIGERIA</span>
          {navigation.map(item=><Link key={item.href} href={item.href}>{item.title}</Link>)}
        </div>
      </details>
    </nav>
  </header>;
}
