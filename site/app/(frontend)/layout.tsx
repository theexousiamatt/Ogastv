import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import '../globals.css';
import './editorial.css';

export const metadata: Metadata = {
  title: { default: 'OgasTV Africa — Stories that matter', template: '%s | OgasTV Africa' },
  description: 'Reporting from Lagos and beyond. Grassroots stories, culture, people and the developments shaping our communities.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="wrap footer-content">
            <div>
              <a href="/" aria-label="OgasTV Africa home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ogas-footer__logo" src="/ogastv-official-logo.png" alt="OgasTV Africa" width={405} height={125} />
              </a>
              <p>Stories from our communities, told with care.</p>
            </div>
            <p>© {new Date().getFullYear()} OgasTV Africa. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
