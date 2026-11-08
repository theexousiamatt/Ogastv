import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'OgasTV Studio', robots: { index: false, follow: false } };

/**
 * Compatibility redirects only. No native Payload admin components or pages
 * are shipped; Payload remains headless behind /api for all collections/auth.
 */
export default async function RetiredAdminRedirect({params,searchParams}:{
  params:Promise<{segments?:string[]}>;
  searchParams:Promise<{token?:string}>;
}){
  const {segments=[]}=await params;
  const query=await searchParams;
  const token=typeof query.token==='string' && query.token.length<500 ? query.token : '';
  const first=segments[0]||'';
  if(first==='login'||first==='create-first-user')redirect('/studio/login');
  if(first==='account')redirect('/studio/account');
  if(first==='forgot')redirect('/studio/forgot-password');
  if(first==='reset')redirect(token?'/studio/reset-password?token='+encodeURIComponent(token):'/studio/forgot-password');
  if(first==='verify'&&segments[1])redirect('/studio/verify?token='+encodeURIComponent(segments[1]));
  if(first==='collections'){
    const collection=segments[1]||'';
    if(collection==='articles')redirect('/studio?tab=articles');
    if(collection==='media')redirect('/studio?tab=media');
    if(collection==='ad-banners')redirect('/studio?tab=ads');
    if(['categories','tags','locations'].includes(collection))redirect('/studio?tab=advanced');
    if(['staff-users','programmes','episodes','live-events','community-submissions'].includes(collection))redirect('/studio/manage');
  }
  if(first==='globals')redirect('/studio/manage');
  redirect('/studio');
}
