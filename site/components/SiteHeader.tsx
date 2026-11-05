import Link from 'next/link';

const sections = [
  ['Lagos Watch', '/section/lagos-watch'],
  ['Politics', '/section/politics'],
  ['Business', '/section/business'],
  ['Entertainment', '/section/entertainment'],
  ['Sports', '/section/sports'],
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-top wrap">
        <Link className="wordmark" href="/" aria-label="OgasTV Africa home">
          OGAS<span>TV</span><small>AFRICA</small>
        </Link>
        <div className="header-actions">
          <span className="editorial-motto">Grassroots stories. Wider perspectives.</span>
          <Link className="watch-link" href="/live">Watch Live <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <nav className="nav-strip" aria-label="Primary navigation">
        <div className="wrap nav-inner">
          <Link href="/">Home</Link>
          {sections.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/#studio">OgasTV Studio</Link>
        </div>
      </nav>
    </header>
  );
}
