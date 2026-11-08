'use client';
import { useState,type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import '../studio-auth.css';
export default function StudioResetPassword({token}:{token:string}){
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const save=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy||!token)return;
    if(password.length<12||password!==confirm){setError('Use at least 12 characters and make sure the passwords match.');return;}
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/staff-users/reset-password',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',cache:'no-store',
        body:JSON.stringify({token,password}),
      });
      const body=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(body.errors?.[0]?.message||body.message||'The reset link may have expired.');
      setDone(true);setPassword('');setConfirm('');
    }catch(e){setError(e instanceof Error?e.message:'Password reset failed.');}
    finally{setBusy(false);}
  };
  if(!token)return <p className="ogas-auth__error" role="alert">This reset link is missing its security token. Request a new email.</p>;
  if(done)return <p className="ogas-auth__success" role="status">Password updated successfully. <Link href="/studio/login">Sign in to Studio</Link>.</p>;
  return <form onSubmit={event=>void save(event)}>
    {error&&<p className="ogas-auth__error" role="alert">{error}</p>}
    <label htmlFor="reset-password">New password</label>
    <div className="ogas-auth__field"><input id="reset-password" type="password" required minLength={12} autoComplete="new-password"
      value={password} onChange={event=>setPassword(event.target.value)}/></div>
    <label htmlFor="reset-confirm">Confirm new password</label>
    <div className="ogas-auth__field"><input id="reset-confirm" type="password" required minLength={12} autoComplete="new-password"
      value={confirm} onChange={event=>setConfirm(event.target.value)}/></div>
    <button className="ogas-auth__submit" disabled={busy} type="submit">{busy?'Updating…':'Update password'} <ArrowRight size={17}/></button>
  </form>;
}
