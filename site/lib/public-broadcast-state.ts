/** Minimal public event state. Never expose Cloudflare session IDs or newsroom metadata. */
export type PublicBroadcastRecord = {
  broadcastStatus?: string | null;
  sourceType?: string | null;
  publisherSessionId?: string | null;
  _status?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
};
export type PublicBroadcastState = {
  state: 'live' | 'ended' | 'offline';
  actualStart: string | null;
  actualEnd: string | null;
};
const timestamp = (v: unknown): string | null =>
  typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;

export function publicBroadcastState(event: PublicBroadcastRecord | null): PublicBroadcastState {
  if (!event || event._status !== 'published') {
    return {state:'offline',actualStart:null,actualEnd:null};
  }
  const actualStart = timestamp(event.actualStart);
  const actualEnd = timestamp(event.actualEnd);
  if (event.broadcastStatus === 'ended' || actualEnd) {
    return {state:'ended',actualStart,actualEnd};
  }
  const activeCloudflare = event.broadcastStatus === 'live' &&
    event.sourceType === 'cloudflare' && !!event.publisherSessionId?.trim();
  return {state:activeCloudflare?'live':'offline',actualStart,actualEnd:null};
}
