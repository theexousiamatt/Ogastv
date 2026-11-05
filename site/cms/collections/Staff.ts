import type { CollectionConfig } from 'payload';
import { getStaff, hasRole, isStaff, staffRoles } from '../access';

export const Staff: CollectionConfig = {
  slug: 'staff-users',
  auth: {
    verify: process.env.NODE_ENV === 'production',
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
  },
  admin: { useAsTitle: 'name', group: 'Team', defaultColumns: ['name', 'email', 'role'] },
  access: {
    admin: ({ req }) => isStaff(req.user),
    read: ({ req }) =>
      hasRole(req.user, 'administrator') ? true :
      getStaff(req.user) ? { id: { equals: getStaff(req.user)!.id } } : false,
    create: async ({ req }) => {
      if (hasRole(req.user, 'administrator')) return true;
      // Initial account creation MUST be restricted to private, controlled setup.
      if (process.env.ALLOW_FIRST_ADMIN_SETUP !== 'true') return false;
      const count = await req.payload.count({ collection: 'staff-users', overrideAccess: true });
      return count.totalDocs === 0;
    },
    update: ({ req }) => {
      if (hasRole(req.user, 'administrator')) return true;
      const actor = getStaff(req.user);
      return actor ? { id: { equals: actor.id } } : false;
    },
    delete: ({ req }) => hasRole(req.user, 'administrator'),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role', type: 'select', required: true, defaultValue: 'journalist',
      options: staffRoles.map((role) => ({ label: role.replace(/_/g, ' '), value: role })),
      access: {
        create: ({ req }) =>
          hasRole(req.user, 'administrator') ||
          process.env.ALLOW_FIRST_ADMIN_SETUP === 'true',
        update: ({ req }) => hasRole(req.user, 'administrator'),
      },
    },
    { name: 'bio', type: 'textarea' },
    { name: 'portrait', type: 'upload', relationTo: 'media' },
  ],
  hooks: {
    beforeChange: [
      async ({ req, data, operation }) => {
        if (operation === 'create' && !getStaff(req.user)) {
          // Bootstrap the very first administrator only during private setup.
          const count = await req.payload.count({ collection: 'staff-users', overrideAccess: true });
          if (process.env.ALLOW_FIRST_ADMIN_SETUP !== 'true' || count.totalDocs > 0)
            throw new Error('Staff accounts must be created by an administrator.');
          return { ...data, role: 'administrator' };
        }
        return data;
      },
    ],
  },
};
