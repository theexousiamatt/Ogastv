import type { CollectionConfig } from 'payload';
import { canReview, hasRole } from '../access';

// Records are preserved for reconciliation. These are NOT uploaded media files.
export const WordpressMediaInventory: CollectionConfig = {
  slug: 'wordpress-media',
  admin: { hidden: true, useAsTitle: 'sourceUrl', group: 'Migration', description: 'Legacy WordPress attachment metadata; bytes remain on WordPress until storage cutover.' },
  access: {
    read: ({ req }) => canReview(req.user),
    create: ({ req }) => hasRole(req.user, 'administrator'),
    update: ({ req }) => hasRole(req.user, 'administrator'),
    delete: ({ req }) => hasRole(req.user, 'administrator'),
  },
  fields: [
    { name: 'wordpressId', type: 'number', unique: true, required: true, index: true },
    { name: 'sourceUrl', type: 'text', required: true },
    { name: 'originalUrl', type: 'text' },
    { name: 'mimeType', type: 'text' },
    { name: 'alt', type: 'textarea' },
    { name: 'caption', type: 'textarea' },
    { name: 'credit', type: 'text' },
    { name: 'publishedAt', type: 'date' },
  ],
};

// Legacy pages are imported as private archival content until equivalent
// functional public pages and redirects have been verified.
export const WordpressPagesInventory: CollectionConfig = {
  slug: 'wordpress-pages',
  admin: { hidden: true, useAsTitle: 'title', group: 'Migration', description: 'WordPress static pages awaiting editorial layout and routing review.' },
  access: {
    read: ({ req }) => canReview(req.user),
    create: ({ req }) => hasRole(req.user, 'administrator'),
    update: ({ req }) => hasRole(req.user, 'administrator'),
    delete: ({ req }) => hasRole(req.user, 'administrator'),
  },
  fields: [
    { name: 'wordpressId', type: 'number', unique: true, required: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'originalUrl', type: 'text', required: true },
    { name: 'originalHtml', type: 'textarea', maxLength: 2000000 },
    { name: 'excerpt', type: 'textarea' },
    { name: 'publishedAt', type: 'date' },
    { name: 'parentWordpressId', type: 'number' },
  ],
};
