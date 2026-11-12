import type { CollectionConfig } from 'payload';
import { hasRole } from '../access';

const manageAds = (user: unknown) => hasRole(user, 'administrator', 'editor_in_chief', 'advertising_manager');

export const AdBanners: CollectionConfig = {
  slug: 'ad-banners',
  labels: { singular: 'Banner advertisement', plural: 'Banner advertisements' },
  admin: { useAsTitle: 'name', group: 'Advertising', defaultColumns: ['name','status','startsAt','endsAt','updatedAt'] },
  access: {
    read: ({req}) => manageAds(req.user), create: ({req}) => manageAds(req.user),
    update: ({req}) => manageAds(req.user),
    delete: ({req}) => hasRole(req.user,'administrator','editor_in_chief'),
  },
  hooks: { beforeChange: [async ({data,originalDoc,req}) => {
    const status = String(data.status || originalDoc?.status || 'scheduled');
    const startsAt = String(data.startsAt || originalDoc?.startsAt || '');
    const endsAt = String(data.endsAt || originalDoc?.endsAt || '');
    if (!startsAt || !endsAt || Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) {
      throw new Error('The banner end date must be after its start date.');
    }
    const destinationUrl = String(data.destinationUrl || originalDoc?.destinationUrl || '');
    try { const url = new URL(destinationUrl); if (!['http:','https:'].includes(url.protocol)) throw new Error(); }
    catch { throw new Error('Enter a valid http or https destination link.'); }
    if (status === 'scheduled') {
      // A single homepage advertiser may occupy each Lagos calendar day.
      // Compare full local days rather than only overlapping clock hours.
      const lagosOffsetMs = 60 * 60 * 1000;
      const startDay = new Date(Date.parse(startsAt) + lagosOffsetMs).toISOString().slice(0, 10);
      const endDay = new Date(Date.parse(endsAt) - 1 + lagosOffsetMs).toISOString().slice(0, 10);
      const startOfDay = new Date(Date.parse(startDay + 'T00:00:00.000Z') - lagosOffsetMs).toISOString();
      const startOfNextDay = new Date(Date.parse(endDay + 'T00:00:00.000Z') - lagosOffsetMs + 24 * 60 * 60 * 1000).toISOString();
      const overlaps = await req.payload.find({
        collection:'ad-banners',
        where: { and: [
          { status: { equals: 'scheduled' } },
          { placement: { equals: 'homepage' } },
          { startsAt: { less_than: startOfNextDay } },
          { endsAt: { greater_than: startOfDay } },
          ...(originalDoc?.id ? [{id:{not_equals:originalDoc.id}}] : []),
        ] },
        limit:1, req, overrideAccess:true,
      });
      if (overlaps.totalDocs) throw new Error('A homepage banner is already booked on one or more of these days. Choose different dates.');
    }
    return data;
  }] },
  fields: [
    {name:'name',type:'text',required:true,label:'Campaign name'},
    {name:'banner',type:'upload',relationTo:'media',required:true,label:'Banner image'},
    {name:'destinationUrl',type:'text',required:true,label:'Website link'},
    {name:'startsAt',type:'date',required:true,label:'Starts on',admin:{date:{pickerAppearance:'dayAndTime'}}},
    {name:'endsAt',type:'date',required:true,label:'Ends on',admin:{date:{pickerAppearance:'dayAndTime'}}},
    {name:'status',type:'select',required:true,defaultValue:'scheduled',options:[
      {label:'Scheduled',value:'scheduled'},{label:'Paused',value:'paused'},
    ]},
    {name:'placement',type:'select',required:true,defaultValue:'homepage',options:[{label:'Homepage',value:'homepage'}]},
  ],
};
