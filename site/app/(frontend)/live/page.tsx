import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Live Broadcasts', description: 'Watch OgasTV Africa live coverage and events.' };
export default function LivePage() {
  const raw = process.env.NEXT_PUBLIC_OGASTV_LIVE_YOUTUBE_ID || '';
  const videoId = /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : '';
  return <>
    <section className="live-heading wrap"><span className="eyebrow">OgasTV / On Air</span><h1>Live from the story.</h1><p>Follow live events, important conversations and breaking developments with OgasTV Africa.</p></section>
    <section className="wrap"><div className="live-player">
      {videoId ? <iframe title="OgasTV live broadcast" src={'https://www.youtube-nocookie.com/embed/' + videoId} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      : <div className="live-placeholder"><span aria-hidden="true">◉</span><h2>Off air for now.</h2><p>Our next broadcast will appear here when we go live.</p></div>}
    </div></section>
  </>;
}
