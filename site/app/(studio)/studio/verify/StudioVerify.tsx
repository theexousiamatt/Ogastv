'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import '../studio-auth.css';
export default function StudioVerify({token}:{token:string}){
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');
  const verify=async()=>{
    if(!token||busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/staff-users/verify/'+encodeURIComponent(token),
        {method:'POST',credentials:'include',cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.errors?.[0]?.message||body.message||'This verification link may have expired.');
      setDone(true);
    }catch(e){setError(e instanceof Error?e.message:'Verification failed.');}
    finally{setBusy(false);}
  };
  if(!token)return <p className="ogas-auth__error">This email verification link is incomplete.</p>;
  if(done)return <p className="ogas-auth__success" role="status">Email verified. <Link href="/studio/login">Sign in to Studio</Link> to continue.</p>;
  return <div>
    {error&&<p className="ogas-auth__error" role="alert">{error}</p>}
    <button className="ogas-auth__submit" disabled={busy} onClick={()=>void verify()}>{busy?'Verifying…':'Verify email'}<ArrowRight size={17}/></button>
  </div>;
}
