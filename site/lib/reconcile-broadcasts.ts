import type { Payload } from 'payload';
import { cloudflareBroadcastHealth, youtubeBroadcastHealth } from './broadcast-health';

export type SyncResult={ checked:number; live:number; interrupted:number; ended:number; unknown:number; unknownReasons:Record<string,number> };

/** Runs on a trusted schedule. Idempotent for already-ended events. Never
 * interpret a third-party API failure as stream termination. */
export async function reconcileBroadcasts(cms:Payload):Promise<SyncResult>{
  const summary:SyncResult={checked:0,live:0,interrupted:0,ended:0,unknown:0,unknownReasons:{}};
  const events=await cms.find({
    collection:'live-events',overrideAccess:true,draft:false,depth:0,
    sort:'-updatedAt',limit:50,
    where:{and:[
      {_status:{equals:'published'}},
      {broadcastStatus:{in:['live','interrupted']}},
      {actualEnd:{exists:false}},
    ]},
  });
  const now=Date.now();
  for(const event of events.docs){
    const youtube=event.sourceType==='youtube';
    const id=youtube?event.youtubeVideoId:event.publisherSessionId;
    if(typeof id!=='string'||!id.trim()){
      summary.unknown++;summary.unknownReasons.missing_source=(summary.unknownReasons.missing_source||0)+1;continue;
    }
    const health=youtube
      ?await youtubeBroadcastHealth(id)
      :await cloudflareBroadcastHealth(id);
    summary.checked++;
    if(health.status==='unknown'){
      summary.unknown++;
      summary.unknownReasons[health.reason]=(summary.unknownReasons[health.reason]||0)+1;
      continue;
    }
    if(youtube){
      if(health.status==='ended'){
        await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{
          broadcastStatus:'ended',actualEnd:health.endedAt,
          ...(health.startedAt&&!event.actualStart?{actualStart:health.startedAt}:{}),
          publisherSessionId:'',broadcasterStaffId:'',
        }});
        summary.ended++;
      }else if(health.status==='live'){
        if(event.broadcastStatus!=='live'){
          await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{broadcastStatus:'live'}});
        }
        summary.live++;
      }else if(health.status==='offline'&&health.reason==='youtube_no_longer_live'){
        // YouTube confirmed the broadcast is no longer live, but has not yet
        // provided actualEndTime. First enter an interrupted/rechecking state
        // (which removes LIVE from public pages); end after another verification.
        if(event.broadcastStatus!=='interrupted'){
          await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{
            broadcastStatus:'interrupted',
          }});
          summary.interrupted++;
        }else{
          const firstObserved=Date.parse(event.updatedAt||'');
          if(Number.isFinite(firstObserved)&&now-firstObserved>=90_000){
            await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{
              broadcastStatus:'ended',actualEnd:new Date(now).toISOString(),
              publisherSessionId:'',broadcasterStaffId:'',
            }});
            summary.ended++;
          }else summary.interrupted++;
        }
      }else{
        summary.unknown++;
        summary.unknownReasons.youtube_unexpected_state=(summary.unknownReasons.youtube_unexpected_state||0)+1;
      }
      continue;
    }
    if(health.status==='live'){
      if(event.broadcastStatus!=='live'){
        await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{broadcastStatus:'live'}});
      }
      summary.live++;
      continue;
    }
    if(health.status==='offline'){
      // First observed drop: allow mobile networks to recover. Once interrupted,
      // updatedAt records the transition time, barring unrelated staff edits.
      if(event.broadcastStatus!=='interrupted'){
        await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{broadcastStatus:'interrupted'}});
        summary.interrupted++;
        continue;
      }
      const interruptedAt=Date.parse(event.updatedAt||'');
      if(Number.isFinite(interruptedAt)&&now-interruptedAt>=90_000){
        await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,data:{
          broadcastStatus:'ended',actualEnd:new Date(now).toISOString(),
          publisherSessionId:'',broadcasterStaffId:'',
        }});
        summary.ended++;
      }else summary.interrupted++;
    }
  }
  return summary;
}
