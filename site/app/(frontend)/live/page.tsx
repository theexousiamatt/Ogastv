import type { Metadata } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';

export const metadata: Metadata = {
  title: 'Studio & Live Broadcasts',
  description: 'Watch verified OgasTV Africa live coverage, community events and broadcast replays.',
};

// Event status comes from published CMS records. Never infer "live" from a
// configured video ID or present fictional update timelines and viewer counts.
export const revalidate = 30;
type Broadcast = {
  id: number | string;
  title: string;
  description?: string | null;
  venue?: string | null;
  scheduledStart: string;
  broadcastStatus: 'scheduled' | 'live' | 'interrupted' | 'ended' | 'replay_available' | 'cancelled';
  youtubeVideoId?: string | null;
};
const validVideoId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);

async function publishedBroadcasts(): Promise<Broadcast[]> {
  try {
    const cms = await getPayload({ config });
    const result = await cms.find({
      collection: 'live-events',
      overrideAccess: false,
      depth: 0,
      where: { _status: { equals: 'published' } },
      sort: '-scheduledStart',
      limit: 25,
    });
    return result.docs.map((event) => ({
      id: event.id, title: event.title, description: event.description,
      venue: event.venue, scheduledStart: event.scheduledStart,
      broadcastStatus: event.broadcastStatus, youtubeVideoId: event.youtubeVideoId,
    }));
  } catch (error) {
    console.error('OgasTV public live schedule unavailable:', error instanceof Error ? error.message : 'unknown');
    return [];
  }
}
function displayDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Time to be confirmed'
    : new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
      }).format(parsed) + ' WAT';
}
function BroadcastSymbol() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="2"/>
    <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9m9-9a6.4 6.4 0 0 1 0 9M4 4a11.3 11.3 0 0 0 0 16m16-16a11.3 11.3 0 0 1 0 16"/>
  </svg>;
}
const statusNames: Record<Broadcast['broadcastStatus'], string> = {
  scheduled: 'Scheduled', live: 'Live', interrupted: 'Interrupted',
  ended: 'Ended', replay_available: 'Replay', cancelled: 'Cancelled',
};
const messages: Record<Broadcast['broadcastStatus'], { headline: string; detail: string }> = {
  scheduled: {
    headline: 'Coverage is scheduled.',
    detail: 'The video will be available when the OgasTV editorial team starts broadcasting.',
  },
  live: {
    headline: 'Broadcast in progress.',
    detail: 'The broadcast player is temporarily unavailable. Please check back.',
  },
  interrupted: {
    headline: 'Coverage is temporarily interrupted.',
    detail: 'The team is working to restore the stream. Updates will appear here when available.',
  },
  ended: {
    headline: 'This broadcast has ended.',
    detail: 'A replay will appear here if one becomes available.',
  },
  replay_available: {
    headline: 'Replay is temporarily unavailable.',
    detail: 'Please check back to watch the recording.',
  },
  cancelled: {
    headline: 'This broadcast was cancelled.',
    detail: 'Follow the Studio for upcoming coverage.',
  },
};

export default async function LivePage() {
  const events = await publishedBroadcasts();
  const featured =
    events.find((event) => event.broadcastStatus === 'live') ??
    events.find((event) => event.broadcastStatus === 'interrupted') ??
    events.find((event) => event.broadcastStatus === 'scheduled' && new Date(event.scheduledStart).getTime() >= Date.now()) ??
    events.find((event) => event.broadcastStatus === 'replay_available') ??
    events.find((event) => event.broadcastStatus === 'ended');
  const upcoming = events.filter((event) => event.broadcastStatus === 'scheduled' && event.id !== featured?.id).slice(0, 3);
  const canPlay = featured &&
    (featured.broadcastStatus === 'live' || featured.broadcastStatus === 'replay_available') &&
    validVideoId(featured.youtubeVideoId);

  return <div className="live-page">
    <div className="wrap">
      <header className="live-heading">
        <span className="eyebrow">OGASTV / STUDIO & BROADCAST</span>
        <h1>Reporting as<br /><em>it happens.</em></h1>
        <p>Watch original reporting, verified live coverage and community conversations from Lagos and beyond.</p>
      </header>
      <div className="live-broadcast-grid">
        <section className="live-broadcast-media" aria-label="Featured broadcast">
          <div className="live-player">
            {canPlay ? (
              <iframe
                title={featured.title}
                src={'https://www.youtube-nocookie.com/embed/' + featured.youtubeVideoId}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : <div className="live-placeholder" role="status">
              <BroadcastSymbol />
              <h2>{featured ? messages[featured.broadcastStatus].headline : 'Off air for now.'}</h2>
              <p>{featured
                ? messages[featured.broadcastStatus].detail
                : 'OgasTV will publish its next confirmed live event here.'}</p>
            </div>}
          </div>
          <div className="live-broadcast-caption">
            <div>
              <h2>{featured?.title || 'From the community to the screen.'}</h2>
              <p>{featured?.venue || 'OgasTV Africa · Studio'}</p>
            </div>
            {featured && <span className="live-status" data-status={featured.broadcastStatus}>
              {statusNames[featured.broadcastStatus]}
            </span>}
          </div>
        </section>
        <aside className="live-context" aria-label="Broadcast details">
          <span className="eyebrow">THE COVERAGE</span>
          <h3>{featured ? 'About this broadcast.' : 'Stories worth watching.'}</h3>
          <p>{featured
            ? (featured.description || 'Follow verified reporting as the story develops.')
            : 'The Studio brings together interviews, community stories, live reports and recorded conversations.'}</p>
          {featured && <p><strong>Scheduled:</strong> {displayDate(featured.scheduledStart)}</p>}
          <p>Verified live-text updates will be available when the editorial timeline is implemented. No viewer counts or commentary are simulated.</p>
        </aside>
      </div>
      <section className="live-upcoming" aria-labelledby="upcoming-broadcasts">
        <h2 id="upcoming-broadcasts">Upcoming coverage</h2>
        {upcoming.length ? <div className="live-upcoming-list">
          {upcoming.map((event) => <article className="live-upcoming-item" key={String(event.id)}>
            <span className="eyebrow">UPCOMING / {displayDate(event.scheduledStart)}</span>
            <strong>{event.title}</strong>
            <p>{event.venue || 'OgasTV Africa'}</p>
          </article>)}
        </div> : <p>New broadcast dates will appear here once confirmed by the editorial team.</p>}
      </section>
    </div>
  </div>;
}
