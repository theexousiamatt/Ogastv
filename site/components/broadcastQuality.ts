// Browser-independent WebRTC statistics interpreter. No media, tokens or viewer data leaves the phone.
export type BroadcastStat = {
  id?: string;
  type: string;
  kind?: string;
  mediaType?: string;
  isRemote?: boolean;
  timestamp?: number;
  bytesSent?: number;
  framesEncoded?: number;
  framesPerSecond?: number;
  frameWidth?: number;
  frameHeight?: number;
  qualityLimitationReason?: string;
  localId?: string;
  fractionLost?: number;
  roundTripTime?: number;
  currentRoundTripTime?: number;
  selected?: boolean;
  nominated?: boolean;
  state?: string;
};

export type OutboundSnapshot = {
  id: string;
  timestamp: number;
  bytesSent: number;
  framesEncoded: number | null;
};

export type BroadcastQuality = {
  level: 'good' | 'fair' | 'poor' | 'measuring';
  bitrateKbps: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  packetLossPercent: number | null;
  rttMs: number | null;
  limitation: string | null;
};

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function round(value: number, places = 0) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function measureBroadcastQuality(
  rows: readonly BroadcastStat[],
  previous: OutboundSnapshot | null,
  connected: boolean,
): { snapshot: OutboundSnapshot | null; quality: BroadcastQuality } {
  // Only the published video track matters. Audio statistics must not be confused with video.
  const video = rows
    .filter(row => row.type === 'outbound-rtp' && !row.isRemote &&
      (row.kind === 'video' || row.mediaType === 'video') && finite(row.bytesSent))
    .sort((a, b) => (b.bytesSent ?? 0) - (a.bytesSent ?? 0))[0];

  const snapshot: OutboundSnapshot | null =
    video && video.id && finite(video.timestamp) && finite(video.bytesSent)
      ? {
        id: video.id,
        timestamp: video.timestamp,
        bytesSent: video.bytesSent,
        framesEncoded: finite(video.framesEncoded) ? video.framesEncoded : null,
      }
      : null;

  let bitrateKbps: number | null = null;
  let fps: number | null = null;
  if (snapshot && previous && snapshot.id === previous.id &&
    snapshot.timestamp > previous.timestamp && snapshot.bytesSent >= previous.bytesSent) {
    const seconds = (snapshot.timestamp - previous.timestamp) / 1000;
    bitrateKbps = round(((snapshot.bytesSent - previous.bytesSent) * 8) / seconds / 1000);
    if (snapshot.framesEncoded !== null && previous.framesEncoded !== null &&
      snapshot.framesEncoded >= previous.framesEncoded) {
      fps = round((snapshot.framesEncoded - previous.framesEncoded) / seconds, 1);
    }
  }
  if (fps === null && video && finite(video.framesPerSecond)) {
    fps = round(video.framesPerSecond, 1);
  }

  const remote = rows.find(row => row.type === 'remote-inbound-rtp' &&
    row.localId === video?.id);
  const pair = rows.find(row => row.type === 'candidate-pair' &&
    row.state === 'succeeded' && (row.selected === true || row.nominated === true));
  const packetLossPercent = finite(remote?.fractionLost) && remote.fractionLost >= 0
    ? round(Math.min(remote.fractionLost, 1) * 100, 1) : null;
  const rttSeconds = finite(remote?.roundTripTime) ? remote.roundTripTime
    : (finite(pair?.currentRoundTripTime) ? pair.currentRoundTripTime : null);
  const rttMs = rttSeconds !== null && rttSeconds >= 0 ? round(rttSeconds * 1000) : null;

  const limitation = typeof video?.qualityLimitationReason === 'string' &&
    video.qualityLimitationReason !== 'none' ? video.qualityLimitationReason : null;

  let level: BroadcastQuality['level'] = 'measuring';
  if (!connected) level = 'poor';
  else if (bitrateKbps !== null || fps !== null || packetLossPercent !== null) {
    // A low bitrate alone is not evidence of bad quality: stationary scenes compress well.
    // RTT and packet loss are additional evidence, not a substitute for motion testing.
    if ((fps !== null && fps < 15) || (packetLossPercent !== null && packetLossPercent >= 8) ||
      (rttMs !== null && rttMs >= 500)) {
      level = 'poor';
    } else if ((fps !== null && fps < 24) ||
      (packetLossPercent !== null && packetLossPercent >= 3) ||
      (rttMs !== null && rttMs >= 250) ||
      limitation === 'bandwidth' || limitation === 'cpu') {
      level = 'fair';
    } else {
      level = 'good';
    }
  }

  return {
    snapshot,
    quality: {
      level,
      bitrateKbps,
      fps,
      width: finite(video?.frameWidth) ? video.frameWidth : null,
      height: finite(video?.frameHeight) ? video.frameHeight : null,
      packetLossPercent,
      rttMs,
      limitation,
    },
  };
}

export function formatBroadcastDiagnostics(quality: BroadcastQuality, capture: string) {
  const show = (value: number | null, unit = '') => value === null ? 'unavailable' : value + unit;
  return [
    'OgasTV broadcast diagnostics',
    'Time: ' + new Date().toISOString(),
    'Capture: ' + capture,
    'Connection quality: ' + quality.level,
    'Encoded video: ' + (quality.width && quality.height ? quality.width + 'x' + quality.height : 'unavailable'),
    'Outgoing video bitrate: ' + show(quality.bitrateKbps, ' kbps'),
    'Encoded frames per second: ' + show(quality.fps),
    'Reported packet loss: ' + show(quality.packetLossPercent, '%'),
    'Round-trip time: ' + show(quality.rttMs, ' ms'),
    'Encoder limitation: ' + (quality.limitation ?? 'none reported'),
    'Note: bitrate is measured video traffic, not an internet speed test.',
  ].join('\n');
}
