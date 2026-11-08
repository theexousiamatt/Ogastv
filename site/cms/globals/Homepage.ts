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
    { name: 'leadStory', type: 'relationship', relationTo: 'articles', label: 'Optional lead story', admin: { description: 'Pin a main story here. If empty, the homepage automatically selects a published grassroots story with a photograph.' } },
    { name: 'latestHighlights', type: 'relationship', relationTo: 'articles', hasMany: true,
      admin: { hidden: true, description: 'Legacy field. Latest Highlights now populates automatically from published articles.' },
      },
    { name: 'lagosWatchStories', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { hidden: true } },
    { name: 'governmentStories', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { hidden: true } },
    { name: 'grassrootsVoices', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { hidden: true } },
    { name: 'businessStories', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { hidden: true } },
    { name: 'personalities', type: 'relationship', relationTo: 'articles', hasMany: true, admin: { hidden: true } },
    { name: 'featuredEpisode', type: 'relationship', relationTo: 'episodes' },
    { name: 'featuredLiveEvent', type: 'relationship', relationTo: 'live-events' },
    { name: 'breakingNewsEnabled', type: 'checkbox', defaultValue: false },
    { name: 'breakingNewsText', type: 'text' },
    { name: 'breakingNewsLink', type: 'text' },
  ],
};
