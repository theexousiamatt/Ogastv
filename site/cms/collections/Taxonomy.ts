import type { CollectionConfig } from 'payload';
import { canReview, hasRole } from '../access';

const editorialEdit = ({ req }: { req: { user?: unknown } }) => canReview(req.user);
const editorialDelete = ({ req }: { req: { user?: unknown } }) => hasRole(req.user, 'administrator', 'editor_in_chief');

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name', group: 'Organisation' },
  access: { read: () => true, create: editorialEdit, update: editorialEdit, delete: editorialDelete },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
  ],
};

export const Locations: CollectionConfig = {
  slug: 'locations',
  admin: { useAsTitle: 'name', group: 'Organisation' },
  access: { read: () => true, create: editorialEdit, update: editorialEdit, delete: editorialDelete },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'state', type: 'text', defaultValue: 'Lagos', required: true },
    {
      name: 'kind', type: 'select', required: true, defaultValue: 'lga',
      options: [{ label: 'State', value: 'state' }, { label: 'LGA', value: 'lga' }, { label: 'LCDA', value: 'lcda' }, { label: 'Community', value: 'community' }],
    },
    { name: 'parent', type: 'relationship', relationTo: 'locations' },
    { name: 'description', type: 'textarea' },
  ],
};

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: { useAsTitle: 'name', group: 'Organisation' },
  access: { read: () => true, create: editorialEdit, update: editorialEdit, delete: editorialDelete },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
  ],
};
