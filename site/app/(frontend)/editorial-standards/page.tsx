import type { Metadata } from 'next';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'Editorial standards',description:'The reporting principles and editorial commitments of OgasTV Nigeria.',alternates:{canonical:'/editorial-standards'}};
export default function StandardsPage(){return <EditorialInfoPage eyebrow="OUR JOURNALISM" title="Editorial standards"
  description="Our aim is reporting that is useful, accurate and fair to the people whose stories we tell.">
    <section><h2>Accuracy before speed</h2><p>We aim to distinguish verified facts from developing reports, clearly attribute information and correct material errors when they are identified.</p></section>
    <section><h2>Public interest and community impact</h2><p>Our coverage should explain not only what officials and institutions announce, but what those decisions mean for residents and their communities.</p></section>
    <section><h2>Fairness and context</h2><p>We aim to represent relevant perspectives fairly, seek responses to significant allegations where appropriate and avoid misleading omissions or sensational framing.</p></section>
    <section><h2>Clear labelling</h2><p>Opinion, analysis and sponsored material should be identified as such so readers can distinguish reporting from commentary or commercial content.</p></section>
    <section><h2>Accountability</h2><p>Readers can raise factual concerns through our <a href="/corrections">corrections process</a>. Corrections or clarifications may be attached directly to the affected article.</p></section>
  </EditorialInfoPage>;}
