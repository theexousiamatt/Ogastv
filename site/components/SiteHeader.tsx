import Link from 'next/link';
import { Play, Search, UserRound } from 'lucide-react';

export const editorialNav = [
  { title: 'Home', href: '/' },
  { title: 'News', href: '/latest' },
  { title: 'Politics', href: '/latest?category=politics' },
  { title: 'Business', href: '/latest?category=business' },
  { title: 'Culture', href: '/latest?category=culture' },
  { title: 'Community', href: '/latest?category=community' },
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
        <nav className="ogas-public-nav" aria-label="Primary navigation">
          {editorialNav.map((item) => (
            <Link href={item.href} key={item.title} className={item.href === '/' ? 'ogas-public-nav__active' : ''}>{item.title}</Link>
          ))}
          <Link href="/live" className="ogas-live-nav">Live <span className="ogas-live-dot" aria-hidden="true" /></Link>
        </nav>
        <div className="ogas-public-header__tools">
          <form action="/latest" method="get" role="search" className="ogas-public-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" name="q" placeholder="Search stories, topics..." aria-label="Search stories"/>
          </form>
          <Link href="/admin" className="ogas-user-link" aria-label="Open newsroom"><UserRound size={17}/></Link>
        </div>
      </div>
      <nav className="ogas-mobile-nav" aria-label="Mobile navigation">
        <Link href="/">Home</Link><Link href="/latest">News</Link><Link href="/latest?category=politics">Politics</Link>
        <Link href="/latest?category=culture">Culture</Link><Link href="/latest?category=community">Community</Link><Link href="/live">Live <span className="ogas-live-dot"/></Link>
      </nav>
    </header>
  );
}
