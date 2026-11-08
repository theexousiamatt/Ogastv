'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, LogOut } from 'lucide-react';
import '../studio-auth.css';

type Props = { staffId: string; name: string; email: string };
type ApiError = { errors?: Array<{ message?: string }>; message?: string };

function detail(data: ApiError): string {
  return data?.errors?.[0]?.message || data?.message || 'Unable to save the change.';
}
async function json(url: string, options: RequestInit) {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(detail(data));
  return data;
}

export default function StudioAccount({ staffId, email, name: initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const saveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await json('/api/staff-users/' + encodeURIComponent(staffId), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      setSuccess('Your name has been updated.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save your name.'); }
    finally { setBusy(false); }
  };
  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setSuccess('');
    if (busy) return;
    if (newPassword.length < 12) { setError('Choose a password of at least 12 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Your new passwords do not match.'); return; }
    setBusy(true);
    try {
      // Reauthenticate before changing sensitive credentials.
      await json('/api/staff-users/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: currentPassword }),
      });
      await json('/api/staff-users/' + encodeURIComponent(staffId), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Your password has been updated. Sign in again if asked.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not change your password.'); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await json('/api/staff-users/logout', { method: 'POST' });
      window.location.replace('/studio/login');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign out.');
      setBusy(false);
    }
  };
  return <main className="ogas-auth">
    <div className="ogas-auth__account">
      <div className="ogas-auth__account-header">
        <Link href="/studio">← Back to newsroom</Link>
        <button className="ogas-auth__signout" type="button" disabled={busy} onClick={() => void logout()}><LogOut size={15} style={{verticalAlign:'middle'}} /> Sign out</button>
      </div>
      <div className="ogas-auth__panel">
        <span className="ogas-auth__eyebrow">OGASTV STUDIO · YOUR PROFILE</span>
        <h1>Account settings.</h1>
        <p className="ogas-auth__intro">{email}</p>
        {error && <p role="alert" className="ogas-auth__error">{error}</p>}
        {success && <p role="status" className="ogas-auth__success">{success}</p>}
        <section>
          <h2>Your details</h2>
          <form onSubmit={event => void saveName(event)}>
            <label htmlFor="account-name">Display name</label>
            <div className="ogas-auth__field"><input id="account-name" type="text" value={name} maxLength={100}
              required onChange={event => setName(event.target.value)} /></div>
            <button className="ogas-auth__submit" type="submit" disabled={busy}>Save name <ArrowRight size={17}/></button>
          </form>
        </section>
        <section>
          <h2>Change password</h2>
          <p className="ogas-auth__muted">For your security, confirm your current password before choosing a new one.</p>
          <form onSubmit={event => void savePassword(event)}>
            <label htmlFor="old-password">Current password</label>
            <div className="ogas-auth__field"><input id="old-password" type="password" autoComplete="current-password"
              required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div>
            <label htmlFor="new-password">New password (at least 12 characters)</label>
            <div className="ogas-auth__field"><input id="new-password" type="password" autoComplete="new-password"
              required minLength={12} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></div>
            <label htmlFor="confirm-password">Confirm new password</label>
            <div className="ogas-auth__field"><input id="confirm-password" type="password" autoComplete="new-password"
              required minLength={12} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></div>
            <button className="ogas-auth__submit" type="submit" disabled={busy}>Update password <ArrowRight size={17}/></button>
          </form>
        </section>
      </div>
    </div>
  </main>;
}
