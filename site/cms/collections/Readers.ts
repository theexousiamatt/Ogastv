import type { CollectionConfig } from 'payload';

const own = (user: unknown) => {
  if (!user || typeof user !== 'object') return null;
  const actor = user as { id?: string | number; collection?: string };
  return actor.collection === 'readers' && actor.id != null ? actor.id : null;
};

export const Readers: CollectionConfig = {
  slug: 'readers',
  auth: {
    verify: process.env.NODE_ENV === 'production',
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 24 * 7,
  },
  admin: { useAsTitle: 'email', hidden: true },
  access: {
    admin: () => false,
    // Prevent public signup until a real verification-email provider exists.
    create: () => process.env.READER_SIGNUP_ENABLED === 'true' &&
      Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_ADDRESS),
    read: ({ req }) => own(req.user) == null ? false : { id: { equals: own(req.user)! } },
    update: ({ req }) => own(req.user) == null ? false : { id: { equals: own(req.user)! } },
    delete: ({ req }) => own(req.user) == null ? false : { id: { equals: own(req.user)! } },
  },
  fields: [
    { name: 'displayName', type: 'text', required: true, maxLength: 100 },
    { name: 'preferredLocations', type: 'relationship', relationTo: 'locations', hasMany: true },
    { name: 'savedArticles', type: 'relationship', relationTo: 'articles', hasMany: true },
    { name: 'newsletterOptIn', type: 'checkbox', defaultValue: false },
    { name: 'newsletterConsentAt', type: 'date', access: { create: () => false, update: () => false } },
  ],
};
