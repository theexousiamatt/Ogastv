'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import '../studio-auth.css';

export default function StudioPasswordRecovery({emailReady}:{emailReady:boolean}) {
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sent,setSent]=useState(false);
  const send=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy||!emailReady)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/studio/forgot-password',{
        method:'POST',credentials:'include',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:email.trim()}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||'Unable to send reset instructions.');
      setSent(true);
    }catch(e){setError(e instanceof Error?e.message:'Unable to send recovery email.');}
    finally{setBusy(false);}
  };
  if(!emailReady)return <p className="ogas-auth__error" role="status">
    Email recovery is temporarily unavailable because the newsroom's SMTP mail service is not configured.
    Please ask your administrator to enable it. Your existing login will still work.
  </p>;
  if(sent)return <p className="ogas-auth__success" role="status">
    If this email belongs to a staff account, recovery instructions will arrive shortly. Check your inbox and spam folder.
  </p>;
  return <form onSubmit={event=>void send(event)}>
    {error&&<p className="ogas-auth__error" role="alert">{error}</p>}
    <label htmlFor="recovery-email">Staff email</label>
    <div className="ogas-auth__field"><input id="recovery-email" type="email" required autoComplete="username"
      value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@ogastvafrica.ng"/></div>
    <button className="ogas-auth__submit" type="submit" disabled={busy}>{busy?'Sending…':'Send recovery link'} <ArrowRight size={17}/></button>
  </form>;
}
