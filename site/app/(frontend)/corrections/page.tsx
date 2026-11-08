import type { Metadata } from 'next';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'Corrections and clarifications',description:'How to report a factual error in an OgasTV Africa article.',alternates:{canonical:'/corrections'}};
export default function CorrectionsPage(){return <EditorialInfoPage eyebrow="EDITORIAL ACCOUNTABILITY" title="Corrections"
  description="Accurate journalism is a continuing responsibility. Help us identify and correct factual errors.">
    <section><h2>How to flag an error</h2><p>Send the story link, the information you believe is incorrect, and any source material supporting the correction to <a href="mailto:support@ogastvafrica.ng?subject=Article%20correction">support@ogastvafrica.ng</a>.</p></section>
    <section><h2>What happens next</h2><p>Our newsroom can review relevant evidence and, when an error or misleading point is confirmed, update the article and add a correction or clarification notice where appropriate.</p></section>
    <section><h2>Updates versus corrections</h2><p>As developing events change, reports may be updated with new facts. A correction addresses information previously published inaccurately; a clarification adds necessary context.</p></section>
  </EditorialInfoPage>;}
