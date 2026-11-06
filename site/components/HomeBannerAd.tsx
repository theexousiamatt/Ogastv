import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';

type Banner = {
  id: number | string;
  name?: string;
  destinationUrl?: string;
  banner?: { url?: string; alt?: string; filename?: string } | null;
};

export async function HomeBannerAd() {
  try {
    const payload = await getPayload({config});
    const now = new Date().toISOString();
    const result = await payload.find({
      collection: 'ad-banners',
      where: {and:[
        {status:{equals:'scheduled'}},
        {placement:{equals:'homepage'}},
        {startsAt:{less_than_equal:now}},
        {endsAt:{greater_than:now}},
      ]},
      sort:'-startsAt',
      limit:1,
      depth:1,
      overrideAccess:true,
    });
    const active = result.docs[0] as Banner | undefined;
    if (!active || !active.destinationUrl) return null;
    const destination=new URL(active.destinationUrl);
    if (!['http:','https:'].includes(destination.protocol)) return null;
    const picture = active.banner && typeof active.banner === 'object' ? active.banner : null;
    const image = picture?.url;
    if (!image) return null;
    return <section className="ogas-paid-banner" aria-label="Advertisement">
      <div className="ogas-paid-banner__label">ADVERTISEMENT</div>
      <a className="ogas-paid-banner__link" href={destination.toString()} target="_blank" rel="noopener noreferrer sponsored" aria-label={'Advertisement: '+(active.name || 'Visit advertiser website')}>
        <img src={image} alt={picture?.alt || active.name || 'Advertisement'}/>
        <span className="ogas-paid-banner__action">Visit advertiser <span aria-hidden="true">↗</span></span>
      </a>
    </section>;
  } catch {
    // An advertisement must never cause the news homepage to fail.
    return null;
  }
}
