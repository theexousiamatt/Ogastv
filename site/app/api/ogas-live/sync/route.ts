import { timingSafeEqual } from 'node:crypto';
import { getPayload } from 'payload';
import { NextRequest,NextResponse } from 'next/server';
import config from '../../../../payload.config';
import { reconcileBroadcasts } from '../../../../lib/reconcile-broadcasts';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:NextRequest){
  const secret=process.env.OGASTV_BROADCAST_SYNC_TOKEN;
  const supplied=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  if(!secret||!supplied)return NextResponse.json({error:'Not authorized'},{status:401});
  const expected=Buffer.from(secret),actual=Buffer.from(supplied);
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))
    return NextResponse.json({error:'Not authorized'},{status:401});
  try{
    const cms=await getPayload({config});
    const result=await reconcileBroadcasts(cms);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    console.error('[OgasTV Broadcast Sync]',error instanceof Error?error.message:'Unknown error');
    return NextResponse.json({error:'Broadcast synchronization unavailable'},{status:503});
  }
}
