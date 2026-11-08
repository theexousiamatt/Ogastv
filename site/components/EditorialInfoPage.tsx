import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

export function EditorialInfoPage({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}){
  return <article className="ogas-info">
    <nav aria-label="Breadcrumb" className="ogas-info__breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">{title}</span></nav>
    <header className="ogas-info__header">
      <span className="ogas-info__eyebrow">{eyebrow}</span>
      <h1>{title}<span>.</span></h1>
      <p>{description}</p>
    </header>
    <div className="ogas-info__body">{children}</div>
    <aside className="ogas-info__contact"><span>GET IN TOUCH</span><h2>Have a question for our newsroom?</h2>
      <p>Contact OgasTV Africa about our reporting, corrections or collaborations.</p>
      <Link href="/contact">Contact the newsroom <ArrowUpRight size={16}/></Link>
    </aside>
  </article>;
}
