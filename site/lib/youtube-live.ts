/** Accept only YouTube video IDs or well-known video URL formats.
 * Never insert arbitrary URLs from newsroom input into an iframe.
 */
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com']);
const SHORT_HOSTS=new Set(['youtu.be','www.youtu.be']);
export function parseYouTubeLiveId(raw: unknown):string|null {
  if(typeof raw!=='string')return null;
  const value=raw.trim();
  if(VIDEO_ID.test(value))return value;
  if(!value || value.length>512)return null;
  let url:URL;
  try{url=new URL(value)}catch{return null}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();
  let id:string|undefined;
  const parts=url.pathname.split('/').filter(Boolean);
  if(SHORT_HOSTS.has(host)&&parts.length===1)id=parts[0];
  else if(HOSTS.has(host)){
    if(url.pathname==='/watch')id=url.searchParams.get('v')||undefined;
    else if(parts.length===2&&['live','embed','shorts'].includes(parts[0]))id=parts[1];
  }
  return id&&VIDEO_ID.test(id)?id:null;
}
export function isYouTubeLiveVideoId(value:unknown):value is string{
  return typeof value==='string'&&VIDEO_ID.test(value);
}
