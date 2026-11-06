import React from 'react';
import { ArrowUpRight, LayoutDashboard } from 'lucide-react';

export function StudioLink() {
  return <a href="/studio" className="ogas-studio-entry"><LayoutDashboard size={18} aria-hidden="true"/> Open OgasTV Studio <ArrowUpRight size={15} aria-hidden="true"/></a>;
}
