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
    { name: 'leadStory', type: 'relationship', relationTo: 'articles' },
    { name: 'latestHighlights', type: 'relationship', relationTo: 'articles', hasMany: true,
      admin: { description: 'Editorial priority order: select up to five published stories.' },
      },
    { name: 'lagosWatchStories', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'governmentStories', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'grassrootsVoices', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'businessStories', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'personalities', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'featuredEpisode', type: 'relationship', relationTo: 'episodes' },
    { name: 'featuredLiveEvent', type: 'relationship', relationTo: 'live-events' },
    { name: 'breakingNewsEnabled', type: 'checkbox', defaultValue: false },
    { name: 'breakingNewsText', type: 'text' },
    { name: 'breakingNewsLink', type: 'text' },
  ],
};
