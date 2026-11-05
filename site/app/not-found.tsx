import Link from 'next/link';
export default function NotFound() {
  return <div className="wrap empty-state prominent" style={{marginTop:80,marginBottom:80}}>
    <span className="eyebrow">404 / Story not found</span>
    <h1 className="archive-title">This page isn’t here.</h1>
    <p>It may have moved or it may not have been migrated yet.</p>
    <Link className="inline-arrow" href="/">Return to the homepage ↗</Link>
  </div>;
}
