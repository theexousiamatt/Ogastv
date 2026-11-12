import type { Metadata } from 'next';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'Privacy information',description:'Information about cookies, content and personal data on the OgasTV Nigeria website.',alternates:{canonical:'/privacy'}};
export default function PrivacyPage(){return <EditorialInfoPage eyebrow="WEBSITE INFORMATION" title="Privacy"
  description="A practical overview of how information may be used when you visit OgasTV Nigeria.">
    <section><h2>Reading the news</h2><p>Public articles can be read without creating an account. Like other websites, our hosting infrastructure may process technical request information needed to serve pages, monitor errors and protect the service.</p></section>
    <section><h2>Newsroom access</h2><p>Authorised newsroom users sign in using authentication cookies. Staff accounts and editorial records are handled through the website's protected content-management system.</p></section>
    <section><h2>Saved stories</h2><p>If you save articles using the browser reading-list feature, those selections are stored in that browser on your device. They are not synchronised between devices. You can remove individual stories or clear the list at any time.</p></section>
    <section><h2>External media</h2><p>Some articles or video pages may include YouTube or other external media links and embeds. Those services can process information according to their own terms when you choose to interact with them.</p></section>
    <section><h2>Contact and enquiries</h2><p>If you email the newsroom, you choose what information to send. We use the contact details you provide to respond to the request. For privacy enquiries, write to <a href="mailto:support@ogastvafrica.ng">support@ogastvafrica.ng</a>.</p></section>
    <section><h2>Further information</h2><p>Information practices can change as new reader features launch. This notice should be reviewed by OgasTV Nigeria's operators and updated to reflect the final analytics, email and retention arrangements.</p></section>
  </EditorialInfoPage>;}
