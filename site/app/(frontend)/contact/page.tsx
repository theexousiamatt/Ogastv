import type { Metadata } from 'next';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'Contact',description:'Reach the OgasTV Nigeria newsroom for tips, corrections, questions and partnerships.',alternates:{canonical:'/contact'}};
export default function ContactPage(){return <EditorialInfoPage eyebrow="REACH THE NEWSROOM" title="Contact"
  description="Share a lead, ask a question, or get in touch about something we published.">
    <section><h2>Newsroom enquiries</h2><p>For story tips, corrections, general enquiries and community perspectives:</p>
      <p><a className="ogas-info__email" href="mailto:support@ogastvafrica.ng">support@ogastvafrica.ng</a></p>
      <p>Please include the relevant article URL and any supporting context when writing about a published story.</p>
    </section>
    <section><h2>Partnerships and advertising</h2><p>For collaborations, media partnerships or advertising opportunities, include your organisation, the proposed scope and the contact person.</p>
      <p><a href="mailto:support@ogastvafrica.ng?subject=OgasTV%20Nigeria%20Partnership">Contact our partnerships team</a></p>
    </section>
    <section><h2>Location</h2><p>OgasTV Nigeria is based in Lagos, Nigeria.</p></section>
  </EditorialInfoPage>;}
