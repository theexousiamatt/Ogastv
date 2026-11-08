import Link from 'next/link';
import { Play, Search, UserRound } from 'lucide-react';

// Homepage editorial sections are the source of truth for the primary menu.
// Link to anchored sections, including from article pages, until standalone
// category archives are available for every editorial desk.
export const editorialNav = [
  { title: 'Home', href: '/' },
  { title: 'Latest Highlights', href: '/#ogas-highlights' },
  { title: 'Lagos Watch', href: '/#ogas-lagos' },
  { title: 'Government & Policies', href: '/#ogas-government' },
  { title: 'Grassroots Voices', href: '/#ogas-voices' },
  { title: 'Business & Investment', href: '/#ogas-business' },
  { title: 'Personalities', href: '/#ogas-personalities' },
  { title: 'OgasTV Studio', href: '/#ogas-studio' },
];

export function SiteHeader() {
  return (
    <header className="ogas-public-header">
      <div className="ogas-public-header__inner">
        <Link href="/" className="ogas-public-brand" aria-label="OgasTV Africa home">
          <span className="ogas-brand-symbol" aria-hidden="true"><Play size={18} fill="currentColor" strokeWidth={1.7}/></span>
          <span className="ogas-brand-word">
            <strong>OgasTV <em>Africa</em></strong>
            <small>News · People · Culture · Africa</small>
          </span>
        </Link>
        <div className="ogas-public-header__tools">
          <form action="/latest" method="get" role="search" className="ogas-public-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" name="q" placeholder="Search stories, topics..." aria-label="Search stories"/>
          </form>
          <Link href="/admin" className="ogas-user-link" aria-label="Open newsroom"><UserRound size={17}/></Link>
        </div>
      </div>
      <nav className="ogas-public-nav ogas-public-nav--sections" aria-label="Editorial categories">
        {editorialNav.map((item) => (
          <Link href={item.href} key={item.title} className={item.href === '/' ? 'ogas-public-nav__active' : ''}>{item.title}</Link>
        ))}
        <Link href="/latest">All Stories</Link>
        <Link href="/live" className="ogas-live-nav">Live <span className="ogas-live-dot" aria-hidden="true" /></Link>
      </nav>
    </header>
  );
}
