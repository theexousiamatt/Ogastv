import type { CollectionConfig } from 'payload';
import { getStaff, hasRole, isStaff, staffRoles } from '../access';
import { FIRST_ADMIN_EMAIL } from '../first-admin-invite';

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
    // Staff registration is NEVER public. The one-time invitation is a server-side
    // Local API operation; it does not open this REST access check.
    create: ({ req }) => hasRole(req.user, 'administrator'),
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
        create: ({ req }) => hasRole(req.user, 'administrator'),
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
          // The server-only invitation endpoint supplies this context AFTER checking
          // its expiring token, the destination email and that no staff account exists.
          const verifiedInvite = req.context?.verifiedFirstAdminInvite === true;
          const count = await req.payload.count({ collection: 'staff-users', overrideAccess: true });
          if (!verifiedInvite || String(data.email).toLowerCase() !== FIRST_ADMIN_EMAIL || count.totalDocs !== 0)
            throw new Error('Staff accounts must be created by an administrator.');
          return { ...data, role: 'administrator' };
        }
        return data;
      },
    ],
  },
};
