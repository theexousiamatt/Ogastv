import { isYouTubeLiveVideoId } from './youtube-live';

export type SourceHealth =
  | { status:'live'; startedAt?:string }
  | { status:'ended'; endedAt:string; startedAt?:string }
  | { status:'offline' }
  | { status:'unknown'; reason:string };

const validTime=(value:unknown):string|undefined=>
  typeof value==='string' && Number.isFinite(Date.parse(value)) ? value : undefined;

/** YouTube videos.list uses one quota unit and does not require a channel OAuth
 * token for publicly accessible broadcasts. Do not confuse video availability
 * with a confirmed end: private videos, API outages and quota errors are unknown.
 */
export async function youtubeBroadcastHealth(videoId:string):Promise<SourceHealth>{
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return {status:'unknown',reason:'youtube_api_key_missing'};
  if(!isYouTubeLiveVideoId(videoId))return {status:'unknown',reason:'invalid_video_id'};
  try{
    const url=new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part','snippet,liveStreamingDetails,status');
    url.searchParams.set('id',videoId);
    url.searchParams.set('key',key);
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(9000)});
    if(!response.ok)return {status:'unknown',reason:'youtube_http_'+response.status};
    const data=await response.json() as {
      items?:Array<{
        snippet?:{liveBroadcastContent?:string};
        liveStreamingDetails?:{actualStartTime?:string;actualEndTime?:string};
        status?:{privacyStatus?:string;embeddable?:boolean};
      }>
    };
    const video=data.items?.[0];
    if(!video)return {status:'unknown',reason:'youtube_video_unavailable'};
    const startedAt=validTime(video.liveStreamingDetails?.actualStartTime);
    const endedAt=validTime(video.liveStreamingDetails?.actualEndTime);
    if(endedAt)return {status:'ended',endedAt,startedAt};
    if(video.snippet?.liveBroadcastContent==='live' && startedAt)
      return {status:'live',startedAt};
    // A scheduled, private, processing or inaccessible broadcast is NOT proof
    // that a previously active stream has ended.
    if(video.snippet?.liveBroadcastContent==='upcoming')return {status:'offline'};
    return {status:'unknown',reason:'youtube_not_confirmed_live_or_ended'};
  }catch{
    return {status:'unknown',reason:'youtube_unreachable'};
  }
}

/** GET session reports publisher track status, not RTP packet delivery.
 * Both local camera and microphone must be active to indicate a healthy SFU
 * publication. This is a presence signal; true media quality needs client
 * getStats()/outbound-rtp counters.
 */
export async function cloudflareBroadcastHealth(sessionId:string):Promise<SourceHealth>{
  const app=process.env.CLOUDFLARE_REALTIME_APP_ID;
  const key=process.env.CLOUDFLARE_REALTIME_API_TOKEN;
  if(!app||!key)return {status:'unknown',reason:'cloudflare_credentials_missing'};
  if(!/^[A-Za-z0-9-]{8,128}$/.test(sessionId))return {status:'unknown',reason:'invalid_session'};
  try{
    const response=await fetch('https://rtc.live.cloudflare.com/v1/apps/'+encodeURIComponent(app)+
      '/sessions/'+encodeURIComponent(sessionId),{
      headers:{Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000),
    });
    if(response.status===404||response.status===410)return {status:'offline'};
    if(!response.ok)return {status:'unknown',reason:'cloudflare_http_'+response.status};
    const data=await response.json() as {tracks?:Array<{location?:string;trackName?:string;status?:string}>;errorCode?:string};
    if(data.errorCode||!Array.isArray(data.tracks))
      return {status:'unknown',reason:'cloudflare_invalid_response'};
    const own=data.tracks.filter(track=>track.location==='local');
    const camera=own.find(track=>track.trackName==='camera');
    const audio=own.find(track=>track.trackName==='microphone');
    return camera?.status==='active'&&audio?.status==='active'
      ? {status:'live'} : {status:'offline'};
  }catch{
    return {status:'unknown',reason:'cloudflare_unreachable'};
  }
}
