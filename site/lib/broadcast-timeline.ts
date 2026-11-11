/** Time values for the OgasTV newsroom. Never infer historic end times. */
export function formatLagosTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp=Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat('en-NG',{
    day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',
    hour12:true,timeZone:'Africa/Lagos',
  }).format(new Date(timestamp))+' WAT';
}
export function formatBroadcastDuration(start: string | null | undefined,end:string|null|undefined):string|null{
  if(!start||!end)return null;
  const a=Date.parse(start),b=Date.parse(end);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return null;
  let seconds=Math.floor((b-a)/1000);
  const hours=Math.floor(seconds/3600);seconds%=3600;
  const minutes=Math.floor(seconds/60);seconds%=60;
  return [hours?hours+' hr':null,minutes?minutes+' min':null,
    seconds||(!hours&&!minutes)?seconds+' sec':null].filter(Boolean).join(' ');
}
/** Canonical event timestamp rules, called from Payload beforeChange.
 * Only transitions to ENDED get the current time; old records are not backfilled.
 */
export function addBroadcastTransitionTimes(
  changed:Record<string,unknown>,
  previous:{broadcastStatus?:unknown;actualEnd?:unknown}|null,
  now:string,
):Record<string,unknown>{
  const data={...changed};
  const wasEnded=previous?.broadcastStatus==='ended';
  if(data.broadcastStatus==='ended'&&!wasEnded){
    if(!data.actualEnd&&!previous?.actualEnd)data.actualEnd=now;
    data.publisherSessionId='';
    data.broadcasterStaffId='';
  }
  if(data.broadcastStatus==='live'&&previous?.broadcastStatus!=='live'){
    if(!data.actualStart)data.actualStart=now;
    data.actualEnd=null;
  }
  return data;
}
