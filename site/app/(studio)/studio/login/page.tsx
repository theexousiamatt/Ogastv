'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import '../studio-auth.css';

function messageFrom(response: unknown): string {
  const value = response as { errors?: Array<{ message?: string }>; message?: string };
  return value?.errors?.[0]?.message || value?.message || 'Unable to sign in. Check your details and try again.';
}

export default function StudioLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/staff-users/login', {
        method: 'POST', credentials: 'include', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(messageFrom(result));
      // Full navigation ensures the server verifies the new HTTP-only session.
      window.location.replace('/studio');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to sign in.');
      setBusy(false);
    }
  };

  return <main className="ogas-auth">
    <div className="ogas-auth__brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ogastv-official-logo.png" alt="OgasTV Africa" width={224} height={70} />
      <p>THE NEWSROOM</p>
    </div>
    <div className="ogas-auth__panel">
      <span className="ogas-auth__eyebrow">OGASTV STUDIO · STAFF ACCESS</span>
      <h1>Welcome back.</h1>
      <p className="ogas-auth__intro">Sign in to write, review and publish stories from your newsroom.</p>
      <form onSubmit={event => void submit(event)}>
        {error && <p className="ogas-auth__error" role="alert">{error}</p>}
        <label htmlFor="staff-email">Work email</label>
        <div className="ogas-auth__field"><Mail size={18} aria-hidden="true" />
          <input id="staff-email" type="email" autoComplete="username" required maxLength={200}
            placeholder="you@ogastvafrica.ng" value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <label htmlFor="staff-password">Password</label>
        <div className="ogas-auth__field"><LockKeyhole size={18} aria-hidden="true" />
          <input id="staff-password" type={visible ? 'text' : 'password'} autoComplete="current-password"
            required value={password} onChange={event => setPassword(event.target.value)} />
          <button type="button" onClick={() => setVisible(state => !state)} aria-label={visible ? 'Hide password' : 'Show password'}>
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button className="ogas-auth__submit" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in to Studio'} <ArrowRight size={18} /></button>
      </form>
      <p className="ogas-auth__help">Forgot your password? <Link href="/studio/forgot-password">Request a recovery link</Link>. For a new staff account, contact your administrator.</p>
    </div>
    <Link className="ogas-auth__back" href="/">← Back to OgasTV Africa</Link>
  </main>;
}
