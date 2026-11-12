import React from 'react';
import './studio.css';
import './studio-unified.css';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="ogas-studio-body">{children}</body></html>;
}
