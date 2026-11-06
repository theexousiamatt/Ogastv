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
    create: ({ req }) => editorial(req.user) || hasRole(req.user, 'advertising_manager'),
    update: ({ req }) => editorial(req.user) || hasRole(req.user, 'advertising_manager'),
    delete: ({ req }) => hasRole(req.user, 'administrator', 'editor_in_chief', 'editor'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
      label: 'Image description',
      admin: {
        placeholder: 'Describe what the image shows',
        description: 'Optional, but helpful for people using screen readers.',
      },
    },
    {
      type: 'collapsible',
      label: 'Optional image details',
      admin: { initCollapsed: true },
      fields: [
        { name: 'caption', type: 'textarea', admin: { placeholder: 'Optional caption shown with the article' } },
        { name: 'credit', type: 'text', admin: { placeholder: 'Photographer or source (if applicable)' } },
      ],
    },
  ],
};
