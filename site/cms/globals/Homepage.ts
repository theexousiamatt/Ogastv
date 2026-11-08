import type { GlobalConfig } from 'payload';
import { canPublish } from '../access';

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: { group: 'Publishing' },
  access: {
    read: () => true,
    update: ({ req }) => canPublish(req.user),
  },
  versions: { drafts: true },
  fields: [
    { name: 'leadStory', label: '1 · Lead Grassroots Story', type: 'relationship', relationTo: 'articles', admin: { description: 'Choose the main people-first story with a strong photograph.' } },
    { name: 'latestHighlights', label: '2 · Latest Highlights', type: 'relationship', relationTo: 'articles', hasMany: true,
      admin: { description: 'Editorial priority order: select up to five published stories.' },
      },
    { name: 'lagosWatchStories', label: '3 · Lagos Watch', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { description: 'Feature council and community updates from Kosofe, Ikorodu and across Lagos.' } },
    { name: 'governmentStories', label: '4 · Government & Policies', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { description: 'Select reporting that explains government decisions and their effects on residents.' } },
    { name: 'grassrootsVoices', label: '5 · Grassroots Voices', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { description: 'Residents’ experiences, opinions and community concerns.' } },
    { name: 'businessStories', label: '6 · Business & Investment', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { description: 'Entrepreneurs, opportunities and investment developments.' } },
    { name: 'personalities', label: '7 · Personalities', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { description: 'Interviews and profiles of people creating impact.' } },
    { name: 'featuredEpisode', label: '8 · OgasTV Studio — Featured Episode', type: 'relationship', relationTo: 'episodes', admin: { description: 'Select a published video podcast or YouTube episode.' } },
    { name: 'featuredLiveEvent', type: 'relationship', relationTo: 'live-events' },
    { name: 'breakingNewsEnabled', type: 'checkbox', defaultValue: false },
    { name: 'breakingNewsText', type: 'text' },
    { name: 'breakingNewsLink', type: 'text' },
  ],
};
