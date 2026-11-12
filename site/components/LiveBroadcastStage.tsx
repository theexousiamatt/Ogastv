'use client';
import { useState } from 'react';
import { LiveViewer } from './LiveViewer';

function lagosDate(timestamp:string|null){
  if(!timestamp||!Number.isFinite(Date.parse(timestamp)))return null;
  return new Intl.DateTimeFormat('en-NG',{
    dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Lagos'
  }).format(new Date(timestamp));
}

/** Keeps the player overlay and the nearby editorial status in sync when an
 * already-connected viewer receives the server's ended state. */
export function LiveBroadcastStage({eventId,title,description}:{
  eventId:number;title:string;description?:string|null;
}){
  const [ended,setEnded]=useState(false);
  const [endTimestamp,setEndTimestamp]=useState<string|null>(null);
  const onEnded=(timestamp:string|null)=>{setEnded(true);setEndTimestamp(timestamp)};
  return <>
    <div className="live-player ogas-live-page__player">
      <LiveViewer eventId={eventId} onEnded={onEnded}/>
    </div>
    <div className="ogas-live-page__details">
      {ended?
        <span className="ogas-live-page__status ogas-live-page__status--ended">Broadcast ended</span>:
        <span className="ogas-live-page__status"><span aria-hidden="true"/> Live now</span>}
      <h2>{title}</h2>
      {ended&&<p aria-live="polite">
        {lagosDate(endTimestamp)?'Ended '+lagosDate(endTimestamp)+' (Lagos time)':'This broadcast is no longer live.'}
      </p>}
      {description&&<p>{description}</p>}
    </div>
  </>;
}
