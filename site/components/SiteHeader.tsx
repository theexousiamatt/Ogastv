import Link from 'next/link';

const sections = [
  ['Latest News', '/latest'],
  ['Lagos Watch', '/section/lagos-watch'],
  ['Government & Policies', '/section/government-policies'],
  ['Grassroots Voices', '/section/grassroots-voices'],
  ['Business & Investment', '/section/business-investment'],
  ['Personalities', '/section/personalities'],
  ['OgasTV Studio', '/live'],
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

        </div>
      </nav>
    </header>
  );
}
