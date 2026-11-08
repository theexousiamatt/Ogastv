import type { Metadata } from 'next';
import { EditorialInfoPage } from '@/components/EditorialInfoPage';
export const metadata:Metadata={title:'Advertise and partner',description:'Explore advertising, sponsorship and media partnerships with OgasTV Nigeria.',alternates:{canonical:'/advertise'}};
export default function AdvertisePage(){return <EditorialInfoPage eyebrow="WORK WITH OGASTV" title="Advertise"
  description="Reach readers interested in community developments, public decisions, business opportunities and people shaping Africa.">
    <section><h2>Advertising</h2><p>OgasTV Nigeria supports clearly labelled advertising placements. Available formats and campaign schedules can be discussed directly with the team.</p></section>
    <section><h2>Partnerships</h2><p>For branded coverage, production or community-led collaborations, tell us about the organisation and the intended audience. Editorial coverage and commercial partnerships should remain distinguishable.</p></section>
    <section><h2>Start a conversation</h2><p><a className="ogas-info__email" href="mailto:support@ogastvafrica.ng?subject=Advertising%20with%20OgasTV%20Nigeria">Contact OgasTV Nigeria</a></p></section>
  </EditorialInfoPage>;}
