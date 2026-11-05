import type { CollectionConfig } from 'payload';
import { hasRole } from '../access';

const canModerate = (user: unknown): boolean =>
  hasRole(user, 'administrator', 'editor_in_chief', 'editor', 'moderator');

export const CommunitySubmissions: CollectionConfig = {
  slug: 'community-submissions',
  admin: { useAsTitle: 'subject', group: 'Community' },
  access: {
    // Public creation stays disabled until CAPTCHA, rate limiting, private uploads
    // and consent handling are implemented in a dedicated moderated intake endpoint.
    create: ({ req }) => canModerate(req.user),
    read: ({ req }) => canModerate(req.user),
    update: ({ req }) => canModerate(req.user),
    delete: ({ req }) => hasRole(req.user, 'administrator', 'editor_in_chief'),
  },
  fields: [
    { name: 'subject', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'submitterName', type: 'text', required: true },
    { name: 'contactEmail', type: 'email' },
    { name: 'contactPhone', type: 'text' },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    { name: 'consentToContact', type: 'checkbox', required: true },
    { name: 'permissionToPublish', type: 'checkbox', defaultValue: false },
    {
      name: 'moderationStatus', type: 'select', defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'internalNotes', type: 'textarea' },
    { name: 'convertedArticle', type: 'relationship', relationTo: 'articles' },
  ],
};
