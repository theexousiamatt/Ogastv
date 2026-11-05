import type { CollectionConfig } from 'payload';
import { canReview, canPublish } from '../access';

const canEdit = ({ req }: { req: { user?: unknown } }) => canReview(req.user);
const canDelete = ({ req }: { req: { user?: unknown } }) => canPublish(req.user);

export const Programmes: CollectionConfig = {
  slug: 'programmes',
  admin: { useAsTitle: 'title', group: 'Video & Live' },
  access: { read: () => true, create: canEdit, update: canEdit, delete: canDelete },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, required: true },
    { name: 'description', type: 'textarea' },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'presenters', type: 'relationship', relationTo: 'staff-users', hasMany: true },
  ],
};

export const Episodes: CollectionConfig = {
  slug: 'episodes',
  admin: { useAsTitle: 'title', group: 'Video & Live' },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: ({ req }) => canReview(req.user) ? true : { _status: { equals: 'published' } },
    create: canEdit, update: canEdit, delete: canDelete,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'programme', type: 'relationship', relationTo: 'programmes', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'youtubeVideoId', type: 'text', required: true,
      validate: (value: unknown) => /^[\w-]{11}$/.test(String(value || '')) || 'Enter an 11-character YouTube video ID.' },
    { name: 'thumbnail', type: 'upload', relationTo: 'media' },
    { name: 'presenters', type: 'relationship', relationTo: 'staff-users', hasMany: true },
    { name: 'releasedAt', type: 'date' },
    { name: 'relatedArticles', type: 'relationship', relationTo: 'articles', hasMany: true },
  ],
};

export const LiveEvents: CollectionConfig = {
  slug: 'live-events',
  admin: { useAsTitle: 'title', group: 'Video & Live' },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: ({ req }) => canReview(req.user) ? true : { _status: { equals: 'published' } },
    create: canEdit, update: canEdit, delete: canDelete,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, required: true },
    { name: 'description', type: 'textarea' },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    { name: 'venue', type: 'text' },
    { name: 'artwork', type: 'upload', relationTo: 'media' },
    { name: 'scheduledStart', type: 'date', required: true },
    { name: 'actualStart', type: 'date' },
    { name: 'actualEnd', type: 'date' },
    {
      name: 'broadcastStatus', type: 'select', defaultValue: 'scheduled', required: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live', value: 'live' },
        { label: 'Interrupted', value: 'interrupted' },
        { label: 'Ended', value: 'ended' },
        { label: 'Replay Available', value: 'replay_available' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    { name: 'youtubeVideoId', type: 'text',
      validate: (value: unknown) => !value || /^[\w-]{11}$/.test(String(value)) || 'Enter a valid YouTube video ID.' },
    { name: 'recording', type: 'relationship', relationTo: 'episodes' },
    { name: 'presenters', type: 'relationship', relationTo: 'staff-users', hasMany: true },
    // Stream keys are deliberately not stored here. Use provider-managed credentials/secrets.
  ],
};
