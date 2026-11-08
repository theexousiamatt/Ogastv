import Link from 'next/link';
import { Play, Search, UserRound } from 'lucide-react';
import { homepageCategoryDefinitions } from '@/lib/editorial-sections';

/** Category links open their canonical archives. Slugs are stable, and
 * the canonical categories are already configured in the newsroom CMS.
 * Avoid querying the database in the global header on every page request.
 */
export const editorialNav = [
  { title: 'Home', href: '/' },
  { title: 'Latest Highlights', href: '/latest' },
  ...homepageCategoryDefinitions.map(def => ({
    title: def.title,
    href: '/latest?category=' + encodeURIComponent(def.slug),
  })),
  { title: 'OgasTV Studio', href: '/live' },
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
        {editorialNav.map(item => (
          <Link href={item.href} key={item.title} className={item.href === '/' ? 'ogas-public-nav__active' : ''}>{item.title}</Link>
        ))}
        <Link href="/latest">All Stories</Link>
      </nav>
    </header>
  );
}
