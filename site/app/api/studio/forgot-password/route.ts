import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export const runtime='nodejs';
export async function POST(req:NextRequest){
  const smtpReady=Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.SMTP_FROM_ADDRESS);
  if(!smtpReady)return NextResponse.json({message:'Email recovery is not yet configured. Contact your newsroom administrator.'},{status:503});
  const allowedOrigin=new URL(process.env.NEXT_PUBLIC_SERVER_URL||req.url).origin;
  if(req.headers.get('origin')!==allowedOrigin)return NextResponse.json({message:'Request blocked.'},{status:403});
  let data:{email?:string};
  try{data=await req.json()}catch{return NextResponse.json({message:'Invalid request.'},{status:400});}
  const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  if(email.length>200||!/^.+@.+\..+$/.test(email))return NextResponse.json({message:'Provide a valid email.'},{status:400});
  // Never reveal whether the address belongs to a staff member.
  try{
    const payload=await getPayload({config});
    await payload.forgotPassword({collection:'staff-users',data:{email}});
  }catch(error){console.error('[OgasTV] Staff recovery request failed',error instanceof Error?error.name:'unknown');}
  return NextResponse.json({message:'If the account exists, an email will be sent.'});
}
