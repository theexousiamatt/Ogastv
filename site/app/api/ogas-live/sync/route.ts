import { createHash, timingSafeEqual } from 'node:crypto';
import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../payload.config';
import { reconcileBroadcasts } from '../../../../lib/reconcile-broadcasts';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/** Hash only: Hostinger's scheduler retains the actual high-entropy bearer
 * token in its private job configuration, never in this public repository. */
const HOSTINGER_JOB_TOKEN_SHA256='10f932f5bdaee1ddd96b9a568d1ef2ec1a661a71c09278d132eca4368ac1da27';
function digest(s:string){return createHash('sha256').update(s,'utf8').digest();}
function authorized(request:NextRequest):boolean{
  const authorization=request.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return false;
  const supplied=authorization.slice(7);
  if(supplied.length<32||supplied.length>256)return false;
  const actual=digest(supplied);
  const scheduled=Buffer.from(HOSTINGER_JOB_TOKEN_SHA256,'hex');
  const configured=process.env.OGASTV_BROADCAST_SYNC_TOKEN;
  const matchesScheduled=timingSafeEqual(actual,scheduled);
  const matchesConfigured=Boolean(configured&&timingSafeEqual(actual,digest(configured)));
  return matchesScheduled||matchesConfigured;
}

export async function POST(request:NextRequest){
  if(!authorized(request))return NextResponse.json({error:'Not authorized'},{
    status:401,headers:{'Cache-Control':'no-store'},
  });
  try{
    const cms=await getPayload({config});
    const result=await reconcileBroadcasts(cms);
    console.info('[OgasTV broadcast cron]',JSON.stringify(result));
    return NextResponse.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    console.error('[OgasTV Broadcast Sync]',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'Broadcast synchronization unavailable'},{
      status:503,headers:{'Cache-Control':'no-store'},
    });
  }
}
