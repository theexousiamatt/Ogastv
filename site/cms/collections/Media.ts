import type { CollectionConfig } from 'payload';
import { editorial, hasRole } from '../access';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: { useAsTitle: 'alt', group: 'Publishing' },
  // Public editorial media only. PRIVATE submission evidence must use separate restricted storage.
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    pasteURL: false,
  },
  access: {
    read: () => true,
    create: ({ req }) => editorial(req.user),
    update: ({ req }) => editorial(req.user),
    delete: ({ req }) => hasRole(req.user, 'administrator', 'editor_in_chief', 'editor'),
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'textarea' },
    { name: 'credit', type: 'text' },
  ],
};
