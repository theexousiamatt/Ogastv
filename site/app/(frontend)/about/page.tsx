import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'About us',description:'Meet OgasTV Nigeria, a digital-first newsroom telling stories that inform and strengthen communities.',alternates:{canonical:'/about'}};
export default function AboutPage(){return <EditorialInfoPage eyebrow="ABOUT OGASTV NIGERIA" title="About us"
  description="A digital-first news platform telling stories that help people understand their communities and the decisions shaping them.">
    <section><h2>Why we exist</h2><p>OgasTV Nigeria reports from Lagos and communities across the country, with a focus on the people behind the headlines. We believe news should help readers understand what happened, why it matters, and how it affects their lives.</p></section>
    <section><h2>Our mission</h2><p>To inform, educate and empower audiences through credible reporting, thoughtful analysis and responsible journalism.</p></section>
    <section><h2>Where we focus</h2><p>Our coverage brings together grassroots community issues, Lagos councils, government and public policies, business and investment, interviews, culture and video journalism.</p>
      <p>Visit <Link href="/section/lagos-watch">Lagos Watch</Link> for local reporting and <Link href="/watch">OgasTV Studio</Link> for programmes and interviews.</p></section>
    <section><h2>Our values</h2><p>Accuracy, independence, integrity, transparency and the public interest guide the kind of journalism we aim to produce.</p></section>
  </EditorialInfoPage>;}
