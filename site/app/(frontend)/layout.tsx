import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import '../globals.css';
import './editorial.css';

export const metadata:Metadata={
  metadataBase:new URL('https://ogastvafrica.ng'),
  title:{default:'OgasTV Nigeria — Stories that matter',template:'%s | OgasTV Nigeria'},
  description:'People-first reporting from Lagos and beyond. Community stories, public decisions, culture and the people shaping Nigeria.',
  applicationName:'OgasTV Nigeria',
  openGraph:{type:'website',siteName:'OgasTV Nigeria',locale:'en_NG',
    title:'OgasTV Nigeria — Stories that matter',
    description:'Grounded reporting on communities, government, business and the voices shaping Lagos and Nigeria.',
    url:'https://ogastvafrica.ng',images:[{url:'/ogastv-nigeria-logo.png',alt:'OgasTV Nigeria'}]},
  twitter:{card:'summary_large_image'},
  robots:{index:true,follow:true},
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader/>
    <main id="main">{children}</main>
    <footer className="site-footer">
      <div className="wrap ogas-footer-layout">
        <div className="ogas-footer-layout__brand">
          <Link href="/" aria-label="OgasTV Nigeria homepage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ogas-footer__logo" src="/ogastv-nigeria-logo.png" alt="OgasTV Nigeria" width={405} height={135}/>
          </Link>
          <p>Stories from our communities, told with care.</p>
          <span>Based in Lagos, reporting on the people and developments shaping Nigeria.</span>
        </div>
        <nav aria-label="Explore OgasTV Nigeria"><strong>Explore</strong>
          <Link href="/latest">Latest stories</Link>
          <Link href="/section/lagos-watch">Lagos Watch</Link>
          <Link href="/section/grassroots-voices">Grassroots Voices</Link>
          <Link href="/watch">OgasTV Studio</Link>
          <Link href="/live">Live coverage</Link>
          <Link href="/reading-list">Saved stories</Link>
        </nav>
        <nav aria-label="About this publication"><strong>OgasTV Nigeria</strong>
          <Link href="/about">About us</Link>
          <Link href="/editorial-standards">Editorial standards</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/advertise">Advertise</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <div className="wrap ogas-footer-bottom">
        <span>© {new Date().getFullYear()} OgasTV Nigeria. All rights reserved.</span>
        <span>Journalism that puts people first.</span>
      </div>
    </footer>
  </body></html>;
}
