import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../../payload.config';
import { editorial, getStaff } from '../../../../../cms/access';
import { youtubeBroadcastHealth } from '../../../../../lib/broadcast-health';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const json=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

export async function POST(req:NextRequest){
  const origin=req.headers.get('origin');
  if(!origin||!['https://ogastvafrica.ng','https://www.ogastvafrica.ng'].includes(origin))
    return json({error:'Origin not allowed'},403);
  try{
    const cms=await getPayload({config});
    const auth=await cms.auth({headers:req.headers});
    const actor=getStaff(auth.user);
    if(!actor||!editorial(actor))return json({error:'Authorized newsroom login required'},403);
    const results=await cms.find({collection:'live-events',overrideAccess:true,draft:false,depth:0,
      limit:50,where:{and:[
        {sourceType:{equals:'youtube'}},
        {broadcastStatus:{equals:'live'}},
        {actualEnd:{exists:false}},
        {_status:{equals:'published'}},
      ]}});
    let checked=0,ended=0,unavailable=0;
    for(const event of results.docs){
      if(!event.youtubeVideoId){unavailable++;continue}
      const health=await youtubeBroadcastHealth(event.youtubeVideoId);
      checked++;
      if(health.status==='ended'){
        // Refetch before updating: a broadcaster may have ended or replaced it
        // while the external YouTube request was in flight.
        const latest=await cms.findByID({collection:'live-events',id:event.id,overrideAccess:true,depth:0,draft:false});
        if(latest.broadcastStatus!=='live'||latest.actualEnd)continue;
        await cms.update({collection:'live-events',id:event.id,overrideAccess:true,draft:false,
          data:{broadcastStatus:'ended',actualEnd:health.endedAt,
            ...(!latest.actualStart&&health.startedAt?{actualStart:health.startedAt}:{}),
            publisherSessionId:'',broadcasterStaffId:''}});
        ended++;
      }else if(health.status==='unknown')unavailable++;
    }
    return json({ok:true,checked,ended,unavailable});
  }catch(error){
    console.error('[Live event newsroom refresh]',error instanceof Error?error.message:'unknown error');
    return json({error:'Could not verify live events right now. Retry or end the event manually.'},503);
  }
}
