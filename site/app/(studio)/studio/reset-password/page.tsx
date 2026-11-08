import Link from 'next/link';
import StudioResetPassword from './StudioResetPassword';
export const dynamic='force-dynamic';
export const metadata = { title: 'New password — OgasTV Studio', robots: { index: false, follow: false } };
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const params=await searchParams;
  const token=typeof params.token==='string'&&params.token.length<500?params.token:'';
  return <main className="ogas-auth">
    <div className="ogas-auth__panel">
      <span className="ogas-auth__eyebrow">OGASTV STUDIO · ACCOUNT RECOVERY</span>
      <h1>Choose a new password.</h1><p className="ogas-auth__intro">Use a unique password of at least 12 characters.</p>
      <StudioResetPassword token={token}/>
    </div>
    <Link href="/studio/login" className="ogas-auth__back">← Back to sign in</Link>
  </main>;
}
