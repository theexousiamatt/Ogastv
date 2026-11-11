import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../payload.config';
import { publicBroadcastState } from '../../../../lib/public-broadcast-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
} as const;
const respond = (body: object, status = 200) => NextResponse.json(body,{status,headers});

/** Small read-only endpoint so viewers who already joined learn when a stream ends.
 * No session identifiers, secret tokens or private fields are returned.
 */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('eventId'));
  if (!Number.isSafeInteger(id) || id < 1) return respond({error:'Invalid event'},400);
  try {
    const cms = await getPayload({config});
    const event = await cms.findByID({
      collection:'live-events',id,overrideAccess:true,depth:0,draft:false,
    }).catch(()=>null);
    return respond(publicBroadcastState(event));
  } catch {
    return respond({error:'Unable to retrieve broadcast status'},503);
  }
}
