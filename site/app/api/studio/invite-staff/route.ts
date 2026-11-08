import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getStaff, hasRole, staffRoles } from '../../../../cms/access';
import type { StaffRole } from '../../../../cms/access';

export const runtime='nodejs';

export async function POST(req:NextRequest){
  const allowedOrigin=new URL(process.env.NEXT_PUBLIC_SERVER_URL||req.url).origin;
  if(req.headers.get('origin')!==allowedOrigin)return NextResponse.json({message:'Request blocked.'},{status:403});
  const payload=await getPayload({config});
  const {user}=await payload.auth({headers:req.headers});
  if(!hasRole(user,'administrator'))return NextResponse.json({message:'Administrator access required.'},{status:403});
  if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS||!process.env.SMTP_FROM_ADDRESS)
    return NextResponse.json({message:'Connect newsroom SMTP email before inviting staff. No invitation has been sent.'},{status:503});
  let data:{email?:string;name?:string;role?:string};
  try{data=await req.json()}catch{return NextResponse.json({message:'Invalid request.'},{status:400});}
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  const name=typeof data.name==='string'?data.name.trim():'';
  const role=data.role as StaffRole;
  if(!/^.+@.+\..+$/.test(email)||email.length>200||name.length<2||name.length>100||!staffRoles.includes(role))
    return NextResponse.json({message:'Provide a valid name, email and staff role.'},{status:400});
  if(!getStaff(user))return NextResponse.json({message:'Access denied.'},{status:403});
  try{
    // A random temporary password is never sent to the browser. User must verify
    // their email and request a personal reset before signing in.
    const created=await payload.create({
      collection:'staff-users',overrideAccess:false,user,
      data:{email,name,role,password:randomBytes(36).toString('base64url')},
    });
    return NextResponse.json({id:created.id,message:'Invitation created. Ask the staff member to check their verification email and set their password through Studio recovery.'},{status:201});
  }catch(error){
    console.error('[OgasTV] Staff invitation failed',error instanceof Error?error.message:'unknown');
    return NextResponse.json({message:'Could not invite this staff member. Check for an existing account and verify SMTP delivery.'},{status:422});
  }
}
