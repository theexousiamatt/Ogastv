import Link from 'next/link';
import StudioVerify from './StudioVerify';
export const dynamic='force-dynamic';
export const metadata={title:'Verify staff account — OgasTV Studio',robots:{index:false,follow:false}};
export default async function VerifyPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const params=await searchParams;
  const token=typeof params.token==='string'&&params.token.length<500?params.token:'';
  return <main className="ogas-auth">
    <div className="ogas-auth__panel">
      <span className="ogas-auth__eyebrow">OGASTV STUDIO · EMAIL VERIFICATION</span>
      <h1>Verify your account.</h1><p className="ogas-auth__intro">Confirm your email address before signing in.</p>
      <StudioVerify token={token}/>
    </div>
    <Link className="ogas-auth__back" href="/studio/login">← Back to sign in</Link>
  </main>;
}
