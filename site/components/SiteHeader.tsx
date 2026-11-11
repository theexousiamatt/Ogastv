'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Menu, Search, UserRound, Radio } from 'lucide-react';
import { homepageCategoryDefinitions } from '@/lib/editorial-sections';

const navigation=[
  {title:'Home',href:'/'},
  {title:'Latest',href:'/latest'},
  ...homepageCategoryDefinitions.map(def=>({title:def.title,href:'/section/'+encodeURIComponent(def.slug)})),
  {title:'OgasTV Studio',href:'/watch'},
];

export function SiteHeader(){
  const pathname=usePathname();
  const menu=useRef<HTMLDetailsElement>(null);
  const isCurrent=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(href+'/');
  // Next.js retains the global header across route changes. Avoid leaving a
  // disclosure over the newly opened article / category / live player.
  useEffect(()=>{if(menu.current)menu.current.open=false;},[pathname]);
  const closeMenu=()=>{if(menu.current)menu.current.open=false;};
  return <header className="ogas-public-header">
    <div className="ogas-public-header__inner">
      <Link href="/" className="ogas-public-brand" aria-label="OgasTV Nigeria home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ogas-public-brand__logo" src="/ogastv-nigeria-logo.png" alt="OgasTV Nigeria" width={405} height={125}/>
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
    <div className="ogas-public-nav-shell">
      <nav className="ogas-public-nav ogas-public-nav--sections" aria-label="News categories">
        {navigation.map(item=><Link key={item.href} href={item.href}
          aria-current={isCurrent(item.href)?'page':undefined}
          className={isCurrent(item.href)?'ogas-public-nav__active':undefined}>
          {item.title}
        </Link>)}
      </nav>
      <Link href="/live" className={'ogas-public-live-entry'+(isCurrent('/live')?' ogas-public-live-entry--active':'')}
        aria-current={isCurrent('/live')?'page':undefined} aria-label="Watch OgasTV live coverage">
        <span className="ogas-live-dot" aria-hidden="true"/> Live
      </Link>
    </div>
    <nav className="ogas-public-mobile-navigation" aria-label="Mobile news navigation">
      <Link href="/latest" aria-current={isCurrent('/latest')?'page':undefined}>Latest</Link>
      <Link href="/section/lagos-watch" aria-current={isCurrent('/section/lagos-watch')?'page':undefined}>Lagos Watch</Link>
      <Link href="/live" aria-current={isCurrent('/live')?'page':undefined}
        className="ogas-public-mobile-navigation__live"><Radio size={14}/> Live</Link>
      <details ref={menu} className="ogas-public-mobile-menu">
        <summary><Menu size={17} aria-hidden="true"/> Categories</summary>
        <div className="ogas-public-mobile-menu__panel">
          <span>EXPLORE OGASTV NIGERIA</span>
          {navigation.map(item=><Link key={item.href} href={item.href}
            onClick={closeMenu}
            aria-current={isCurrent(item.href)?'page':undefined}>{item.title}</Link>)}
          <Link href="/live" onClick={closeMenu}
            aria-current={isCurrent('/live')?'page':undefined}>Live coverage</Link>
        </div>
      </details>
    </nav>
  </header>;
}
