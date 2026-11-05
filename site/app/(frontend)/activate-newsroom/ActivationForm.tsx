'use client';

import { useEffect, useState, type FormEvent } from 'react';

export function ActivationForm() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    // The invitation token arrives as a URL fragment so it is not sent in an
    // HTTP request or Referer header. Immediately remove it from browser history.
    const fragment = window.location.hash.slice(1);
    setToken(fragment);
    if (fragment) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult('');
    if (!token) return setResult('Open the private invitation link sent to your email.');
    if (password.length < 16 || password.length > 128) return setResult('Your password must have 16–128 characters.');
    if (password !== confirmation) return setResult('Your passwords do not match.');

    setPending(true);
    try {
      const response = await fetch('/api/activate-newsroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json() as { success?: boolean; error?: string; loginPath?: string };
      if (!response.ok || !body.success) throw new Error(body.error || 'Activation failed.');
      setToken('');
      setPassword('');
      setConfirmation('');
      window.location.replace(body.loginPath || '/admin/login');
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Unable to activate this account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="wrap" style={{ maxWidth: 620, paddingTop: 72, paddingBottom: 112 }}>
      <span className="eyebrow">OgasTV Africa · Private Newsroom</span>
      <h1 style={{ marginTop: 22, marginBottom: 12, fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>Activate your account.</h1>
      <p style={{ maxWidth: 520, lineHeight: 1.7, marginBottom: 34 }}>
        This invitation is for <strong>ops@inspirarestudio.com</strong>. Choose a strong password to activate the first newsroom administrator.
      </p>
      {!token ? <p role="status" style={{ padding: '16px 0' }}>Open the original private invitation link in your mailbox to continue. This page alone cannot create an administrator.</p> : (
        <form onSubmit={activate} style={{ display: 'grid', gap: 18 }}>
          <label style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
            Password
            <input type="password" required minLength={16} maxLength={128} autoComplete="new-password"
              value={password} onChange={(event) => setPassword(event.target.value)}
              style={{ border: '1px solid #b6b6b6', borderRadius: 8, padding: 14, fontSize: 16 }} />
          </label>
          <label style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
            Confirm password
            <input type="password" required minLength={16} maxLength={128} autoComplete="new-password"
              value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              style={{ border: '1px solid #b6b6b6', borderRadius: 8, padding: 14, fontSize: 16 }} />
          </label>
          <p style={{ fontSize: 14, opacity: 0.8 }}>Use at least 16 characters and a unique password. Your password will never be sent by email.</p>
          <button type="submit" disabled={pending}
            style={{ background: '#151515', color: 'white', border: 0, borderRadius: 8, padding: 16, fontSize: 16, cursor: pending ? 'wait' : 'pointer' }}>
            {pending ? 'Activating…' : 'Activate newsroom administrator'}
          </button>
        </form>
      )}
      {result && <p role="alert" style={{ marginTop: 20, color: '#9e2020' }}>{result}</p>}
    </section>
  );
}
