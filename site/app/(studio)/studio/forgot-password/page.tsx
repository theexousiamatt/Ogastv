import Link from 'next/link';
import StudioPasswordRecovery from './StudioPasswordRecovery';

export const metadata = { title: 'Recover access — OgasTV Studio', robots: { index: false, follow: false } };
export default function ForgotPasswordPage() {
  const emailReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_ADDRESS);
  return <main className="ogas-auth">
    <div className="ogas-auth__panel">
      <span className="ogas-auth__eyebrow">OGASTV STUDIO · ACCOUNT RECOVERY</span>
      <h1>Reset your password.</h1>
      <p className="ogas-auth__intro">Enter your staff email and we'll send a secure recovery link.</p>
      <StudioPasswordRecovery emailReady={emailReady} />
    </div>
    <Link className="ogas-auth__back" href="/studio/login">← Back to sign in</Link>
  </main>;
}
