import { isYouTubeLiveVideoId } from './youtube-live';
/** Derive the newsroom display label from the canonical (non-draft) event.
 * Historical Payload version records may still say "live" after a stream ends.
 * Do not treat a stale or missing Cloudflare publisher session as actively on air.
 */
export type StudioBroadcastEvent = {
  broadcastStatus?: string | null;
  sourceType?: string | null;
  publisherSessionId?: string | null;
  youtubeVideoId?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  updatedAt?: string | null;
};

export type StudioBroadcastStatus = 'live' | 'ended' | 'scheduled' | 'interrupted';

export function studioBroadcastStatus(event: StudioBroadcastEvent, now = Date.now()): StudioBroadcastStatus {
  if (event.broadcastStatus === 'ended' || event.actualEnd) return 'ended';
  if (event.broadcastStatus !== 'live') return 'scheduled';
  if (event.sourceType === 'youtube') return isYouTubeLiveVideoId(event.youtubeVideoId)?'live':'interrupted';
  if (event.sourceType !== 'cloudflare') return 'interrupted';
  if (!event.publisherSessionId?.trim()) return 'interrupted';
  const started = Date.parse(event.actualStart || event.updatedAt || '');
  // A stale client can leave a Cloudflare SFU event marked live after closing its tab.
  // This is a display safety check, not an automatic database mutation.
  if (!Number.isFinite(started) || started > now + 5 * 60 * 1000 ||
    now - started > 24 * 60 * 60 * 1000) return 'interrupted';
  return 'live';
}
