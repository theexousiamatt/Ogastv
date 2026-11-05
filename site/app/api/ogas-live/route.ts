import { getPayload } from 'payload';
import config from '../../../payload.config';
import { editorial, getStaff } from '../../../cms/access';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SDP = { type: 'offer' | 'answer'; sdp: string };
const err = (message: string, status = 400) => NextResponse.json({error:message},{status});
const validSDP = (x: unknown): x is SDP => !!x && typeof x === 'object' &&
  ['offer','answer'].includes((x as SDP).type) && typeof (x as SDP).sdp === 'string' &&
  (x as SDP).sdp.length > 0 && (x as SDP).sdp.length < 120000;
const token = (id: number, session: string) => createHmac('sha256',process.env.PAYLOAD_SECRET!)
  .update(id+':'+session).digest('hex');
const validTicket = (id: number,session: string,ticket: string) =>
  /^[a-f0-9]{64}$/.test(ticket) && timingSafeEqual(Buffer.from(ticket,'hex'),Buffer.from(token(id,session),'hex'));
async function realtime(endpoint:string,method:'POST'|'PUT',body?:object) {
  const app=process.env.CLOUDFLARE_REALTIME_APP_ID!;
  const key=process.env.CLOUDFLARE_REALTIME_API_TOKEN!;
  const response=await fetch('https://rtc.live.cloudflare.com/v1/apps/'+encodeURIComponent(app)+endpoint,{
    method,headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  const result=await response.json();
  if (!response.ok || result.errorCode || result.tracks?.some((t:{errorCode?:string})=>t.errorCode))
    throw new Error('SFU rejected '+endpoint+' ('+response.status+')');
  return result;
}
export async function POST(req:NextRequest) {
  if (!process.env.CLOUDFLARE_REALTIME_APP_ID || !process.env.CLOUDFLARE_REALTIME_API_TOKEN || !process.env.PAYLOAD_SECRET)
    return err('Broadcasting credentials are not configured.',503);
  const origin=req.headers.get('origin');
  if (origin) {
    // Hostinger proxies Next.js through an internal address, so req.nextUrl.host
    // can be localhost even for a legitimate request to ogastvafrica.ng.
    // Trust only the public OgasTV origins, never arbitrary forwarded headers.
    let allowed = false;
    try {
      const source = new URL(origin);
      if (process.env.NODE_ENV === 'production') {
        allowed = source.protocol === 'https:' && source.port === '' &&
          (source.hostname === 'ogastvafrica.ng' || source.hostname === 'www.ogastvafrica.ng');
      } else {
        allowed = source.origin === req.nextUrl.origin;
      }
    } catch {
      allowed = false;
    }
    if (!allowed) return err('Origin not allowed',403);
  }
  let body:any;
  try{body=await req.json()}catch{return err('Invalid request')}
  try {
    const cms=await getPayload({config});
    const authentication=await cms.auth({headers:req.headers});
    const actor=getStaff(authentication.user);
    const canBroadcast=!!actor && editorial(actor);
    if(body.action==='quick-create') {
      if(!canBroadcast) return err('Authorized newsroom login required',403);
      const title=typeof body.title==='string'?body.title.trim():'';
      if(title.length<3 || title.length>120) return err('Enter a broadcast title (3–120 characters).');
      // Create a draft first. Only go-live makes the event publicly visible.
      const event=await cms.create({collection:'live-events',overrideAccess:true,draft:true,data:{
        title,slug:'live-'+randomUUID(),scheduledStart:new Date().toISOString(),
        sourceType:'cloudflare',broadcastStatus:'scheduled',_status:'draft'
      }});
      return NextResponse.json({eventId:event.id});
    }
    const id=Number(body?.eventId);
    if(!Number.isSafeInteger(id) || id<1) return err('Invalid broadcast');
    const event:any=await cms.findByID({collection:'live-events',id,overrideAccess:true,depth:0,draft:true});
    if(!event) return err('Event not found',404);
    const owns=canBroadcast && event.publisherSessionId && body.sessionId===event.publisherSessionId &&
      String(event.broadcasterStaffId)===String(actor!.id);
    if(body.action==='start') {
      if(!canBroadcast) return err('Authorized newsroom login required',403);
      if(event.broadcastStatus==='live') return err('This event is already broadcasting',409);
      const session=await realtime('/sessions/new','POST');
      await cms.update({collection:'live-events',id,overrideAccess:true,data:{
        sourceType:'cloudflare',publisherSessionId:session.sessionId,broadcasterStaffId:String(actor!.id),
        broadcastStatus:'scheduled'
      }});
      return NextResponse.json({sessionId:session.sessionId});
    }
    if(body.action==='publish') {
      if(!owns) return err('Broadcast ownership required',403);
      if(!validSDP(body.sessionDescription) || body.sessionDescription.type!=='offer') return err('Invalid camera offer');
      const tracks=body.tracks;
      if(!Array.isArray(tracks) || tracks.length!==2 ||
        !['camera','microphone'].every(name=>tracks.some((x:any)=>x.trackName===name && typeof x.mid==='string')))
        return err('Audio and video tracks are required');
      const result=await realtime('/sessions/'+encodeURIComponent(body.sessionId)+'/tracks/new','POST',{
        sessionDescription:body.sessionDescription,
        tracks:tracks.map((x:{mid:string;trackName:string})=>({location:'local',mid:x.mid,trackName:x.trackName}))
      });
      return NextResponse.json({sessionDescription:result.sessionDescription});
    }
    if(body.action==='go-live') {
      if(!owns) return err('Broadcast ownership required',403);
      await cms.update({collection:'live-events',id,overrideAccess:true,data:{
        _status:'published',sourceType:'cloudflare',broadcastStatus:'live',actualStart:new Date().toISOString()
      }});
      return NextResponse.json({ok:true});
    }
    if(body.action==='stop') {
      const chief=!!actor && ['administrator','editor_in_chief'].includes(actor.role||'');
      if(!owns && !chief) return err('Broadcast ownership required',403);
      await cms.update({collection:'live-events',id,overrideAccess:true,data:{
        broadcastStatus:'ended',actualEnd:new Date().toISOString(),publisherSessionId:'',broadcasterStaffId:''
      }});
      return NextResponse.json({ok:true});
    }
    if(body.action==='watch') {
      if(event.broadcastStatus!=='live' || event._status!=='published' || event.sourceType!=='cloudflare' ||
        !event.publisherSessionId) return err('Currently off air',404);
      const session=await realtime('/sessions/new','POST');
      const receive=await realtime('/sessions/'+encodeURIComponent(session.sessionId)+'/tracks/new','POST',{
        tracks:['camera','microphone'].map(trackName=>({
          location:'remote',sessionId:event.publisherSessionId,trackName
        }))
      });
      return NextResponse.json({sessionId:session.sessionId,sessionDescription:receive.sessionDescription,
        ticket:token(id,session.sessionId)});
    }
    if(body.action==='answer') {
      if(event.broadcastStatus!=='live' || !body.sessionId || !body.ticket ||
        !validTicket(id,body.sessionId,body.ticket) || !validSDP(body.sessionDescription) ||
        body.sessionDescription.type!=='answer') return err('Invalid viewer session',403);
      await realtime('/sessions/'+encodeURIComponent(body.sessionId)+'/renegotiate','PUT',{
        sessionDescription:body.sessionDescription
      });
      return NextResponse.json({ok:true});
    }
    return err('Invalid operation');
  }catch(e){
    console.error('[OgasTV SFU]',e instanceof Error ? e.message : 'Unknown error');
    return err('Broadcast service unavailable. Try again.',502);
  }
}
