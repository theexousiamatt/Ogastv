import { getPayload } from 'payload';
import config from '../payload.config';
import { getWatchEpisodes, type StudioEpisode } from './content';
import { isYouTubeLiveVideoId } from './youtube-live';

/**
 * Public video archive: editorial episodes + finished YouTube livestreams.
 * Live events are eligible only after a recorded end; merely storing a video ID
 * or marking an event LIVE must not publish a replay.
 */
export async function getStudioArchive(limit = 36): Promise<StudioEpisode[]> {
  const max = Math.max(1, Math.min(48, Math.floor(limit)));
  const episodes = await getWatchEpisodes(max);
  try {
    const cms = await getPayload({ config });
    const result = await cms.find({
      collection: 'live-events',
      overrideAccess: true,
      draft: false,
      depth: 0,
      limit: max,
      sort: '-actualEnd',
      where: { and: [
        { _status: { equals: 'published' } },
        { sourceType: { equals: 'youtube' } },
        { broadcastStatus: { in: ['ended', 'replay_available'] } },
        { actualEnd: { exists: true } },
      ] },
    });
    const recordings: StudioEpisode[] = result.docs.flatMap(event => {
      if (!isYouTubeLiveVideoId(event.youtubeVideoId) || !event.actualEnd ||
          typeof event.title !== 'string' || !event.title.trim()) return [];
      return [{
        id: 'live-' + event.id,
        title: event.title,
        description: typeof event.description === 'string' ? event.description : '',
        youtubeVideoId: event.youtubeVideoId,
        thumbnail: null,
        releasedAt: event.actualEnd,
        programmeTitle: 'Past live coverage',
      }];
    });
    // An editor may also publish a broadcast as a curated episode. Prefer the
    // editorial episode to avoid displaying the same YouTube video twice.
    const seen = new Set<string>();
    return [...episodes, ...recordings]
      .sort((a,b) => Date.parse(b.releasedAt || '') - Date.parse(a.releasedAt || '') || 0)
      .filter(item => {
        if (seen.has(item.youtubeVideoId)) return false;
        seen.add(item.youtubeVideoId);
        return true;
      }).slice(0, max);
  } catch (error) {
    console.error('[OgasTV] Could not retrieve completed YouTube broadcasts', error);
    return episodes;
  }
}
