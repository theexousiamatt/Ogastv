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
    // Transform the original before storing it: a single bounded WebP asset
    // rather than keeping the uncompressed source or generating extra variants.
    resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82, effort: 4 } },
  },
  access: {
    read: () => true,
    create: ({ req }) => editorial(req.user) || hasRole(req.user, 'advertising_manager'),
    update: ({ req }) => editorial(req.user) || hasRole(req.user, 'advertising_manager'),
    delete: ({ req }) => hasRole(req.user, 'administrator', 'editor_in_chief', 'editor'),
  },
  hooks: {
    // Do not leave published or drafted article covers, or ad banners, broken.
    // The S3 adapter owns removing the object when Payload deletes the media
    // document; never delete storage.objects directly in SQL.
    beforeDelete: [async ({ id, req }) => {
      const where = { featuredImage: { equals: id } };
      const [articles, drafts, banners] = await Promise.all([
        req.payload.find({ collection: 'articles', where, limit: 1, depth: 0, overrideAccess: true, req }),
        req.payload.find({ collection: 'articles', where, draft: true, limit: 1, depth: 0, overrideAccess: true, req }),
        req.payload.find({ collection: 'ad-banners', where: { banner: { equals: id } }, limit: 1, depth: 0, overrideAccess: true, req }),
      ]);
      if (articles.totalDocs || drafts.totalDocs || banners.totalDocs) {
        throw new Error('This image is used by an article or advertisement. Remove or replace it there before deleting the file.');
      }
    }],
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
