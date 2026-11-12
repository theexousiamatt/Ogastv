import { randomUUID } from 'node:crypto';
import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../payload.config';
import { editorial, getStaff } from '../../../../cms/access';
import { parseYouTubeLiveId, isYouTubeLiveVideoId } from '../../../../lib/youtube-live';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
function validOrigin(req:NextRequest){
  const origin=req.headers.get('origin');
  if(!origin)return false;
  try{
    const url=new URL(origin);
    return process.env.NODE_ENV==='production'
      ? url.protocol==='https:'&&url.port===''&&['ogastvafrica.ng','www.ogastvafrica.ng'].includes(url.hostname)
      : url.origin===req.nextUrl.origin;
  }catch{return false}
}
/** YouTube is an existing third-party livestream embedded here.
 * This endpoint never starts, stops, or takes over a stream on YouTube itself.
 */
export async function POST(req:NextRequest){
  if(!validOrigin(req))return reply({error:'Origin not allowed'},403);
  let body:Record<string,unknown>;
  try{body=await req.json()}catch{return reply({error:'Invalid request'},400)}
  if(!body||typeof body!=='object')return reply({error:'Invalid request'},400);
  try{
    const cms=await getPayload({config});
    const auth=await cms.auth({headers:req.headers});
    const actor=getStaff(auth.user);
    if(!actor||!editorial(actor))return reply({error:'Authorized newsroom login required'},403);

    if(body.action==='start'||body.action==='publish-existing'){
      const id=body.action==='start'?parseYouTubeLiveId(body.youtubeUrl):null;
      let title='';
      let sourceId=id;
      let existingId:number|null=null;
      if(body.action==='start'){
        title=typeof body.title==='string'?body.title.trim():'';
        if(title.length<3||title.length>120)return reply({error:'Enter a broadcast title (3–120 characters).'},400);
        if(!id)return reply({error:'Paste a valid YouTube livestream URL or 11-character video ID.'},400);
      }else{
        existingId=Number(body.eventId);
        if(!Number.isSafeInteger(existingId)||existingId<1)return reply({error:'Invalid broadcast'},400);
        const event=await cms.findByID({collection:'live-events',id:existingId,overrideAccess:true,depth:0,draft:false}).catch(()=>null);
        if(!event||event.sourceType!=='youtube')return reply({error:'YouTube event not found'},404);
        if(event.broadcastStatus!=='scheduled')return reply({error:'Only scheduled YouTube events can be published.'},409);
        sourceId=typeof event.youtubeVideoId==='string'?event.youtubeVideoId:null;
        if(!isYouTubeLiveVideoId(sourceId))return reply({error:'Attach a valid YouTube video ID to this event first.'},400);
        title=String(event.title||'');
      }
      // The public site has one primary live player. Never silently replace
      // an existing Cloudflare/YouTube event or mark it ended on behalf of staff.
      const currentlyLive=await cms.find({collection:'live-events',overrideAccess:true,draft:false,depth:0,limit:5,
        where:{and:[{_status:{equals:'published'}},{broadcastStatus:{equals:'live'}}]}});
      const active=currentlyLive.docs.find(e=>Number(e.id)!==existingId);
      if(active)return reply({error:'Another event is marked LIVE. End it in Broadcast Studio before publishing a YouTube stream.'},409);
      const now=new Date().toISOString();
      if(existingId){
        await cms.update({collection:'live-events',id:existingId,overrideAccess:true,draft:false,data:{
          broadcastStatus:'live',_status:'published',sourceType:'youtube',actualStart:now,actualEnd:null,
          broadcasterStaffId:String(actor.id)
        }});
        return reply({ok:true,eventId:existingId,youtubeVideoId:sourceId});
      }
      const description=typeof body.description==='string'?body.description.trim().slice(0,500):'';
      const event=await cms.create({collection:'live-events',overrideAccess:true,draft:false,data:{
        title,slug:'youtube-live-'+randomUUID(),description,
        sourceType:'youtube',youtubeVideoId:sourceId!,scheduledStart:now,actualStart:now,
        actualEnd:null,broadcastStatus:'live',_status:'published',broadcasterStaffId:String(actor.id),
      }});
      return reply({ok:true,eventId:event.id,youtubeVideoId:sourceId},201);
    }

    if(body.action==='end'){
      const id=Number(body.eventId);
      if(!Number.isSafeInteger(id)||id<1)return reply({error:'Invalid broadcast'},400);
      const event=await cms.findByID({collection:'live-events',id,overrideAccess:true,depth:0,draft:false}).catch(()=>null);
      if(!event||event.sourceType!=='youtube')return reply({error:'YouTube event not found'},404);
      const isChief=['administrator','editor_in_chief'].includes(String(actor.role||''));
      const isOwner=String(event.broadcasterStaffId||'')===String(actor.id);
      if(!isChief&&!isOwner)return reply({error:'Only the original broadcaster or newsroom lead can end this event.'},403);
      if(event.broadcastStatus==='ended')return reply({ok:true,actualEnd:event.actualEnd||null});
      if(event.broadcastStatus!=='live')return reply({error:'This event is not currently live.'},409);
      const actualEnd=new Date().toISOString();
      await cms.update({collection:'live-events',id,overrideAccess:true,draft:false,data:{
        broadcastStatus:'ended',actualEnd,publisherSessionId:'',broadcasterStaffId:''
      }});
      return reply({ok:true,actualEnd});
    }
    return reply({error:'Invalid action'},400);
  }catch(error){
    console.error('[OgasTV YouTube Live]',error instanceof Error?error.message:'Unknown error');
    return reply({error:'Could not update the OgasTV broadcast. Try again.'},503);
  }
}
