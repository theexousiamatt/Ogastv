import Link from 'next/link';

const sections = [
  ['Latest', '/latest'],
  ['Lagos Watch', '/section/lagos-watch'],
  ['Government', '/section/government-policies'],
  ['Grassroots Voices', '/section/grassroots-voices'],
  ['Business', '/section/business-investment'],
  ['Personalities', '/section/personalities'],
  ['Studio', '/live'],
] as const;

function ArrowUpRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 18 18 6M7 6h11v11"/>
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-utility wrap">
        <span>OGASTV AFRICA / INDEPENDENT EDITORIAL REPORTING</span>
        <span>LOCAL VOICES. WIDER PERSPECTIVES.</span>
      </div>
      <div className="header-top wrap">
        <Link className="wordmark" href="/" aria-label="OgasTV Africa — home">
          OGAS<span>TV</span><small>AFRICA</small>
        </Link>
        <div className="header-actions">
          <span className="editorial-motto">The daily briefing</span>
          <Link className="watch-link" href="/live">
            Studio & broadcast <ArrowUpRight />
          </Link>
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
