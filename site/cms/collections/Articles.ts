import type { CollectionConfig, Where } from 'payload';
import { canPublish, canReview, editorial, getStaff, hasRole } from '../access';

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    group: 'Publishing',
    defaultColumns: ['title', 'primaryCategory', 'workflowStatus', '_status', 'updatedAt'],
  },
  versions: {
    drafts: { autosave: { interval: 3000 } },
    maxPerDoc: 50,
  },
  access: {
    read: ({ req }) => getStaff(req.user) ? true : { _status: { equals: 'published' } },
    readVersions: ({ req }) => canReview(req.user),
    create: ({ req }) => editorial(req.user),
    update: ({ req }) => {
      if (canReview(req.user)) return true;
      const actor = getStaff(req.user);
      if (actor?.role === 'journalist') {
        const where: Where = { and: [
          { createdBy: { equals: actor.id } },
          { _status: { not_equals: 'published' } },
        ] };
        return where;
      }
      return false;
    },
    delete: ({ req }) => canPublish(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, req }) => {
        // Do not allow a writer to impersonate another staff member as record creator.
        const actor = getStaff(req.user);
        if (operation === 'create' && actor) data.createdBy = actor.id;
        if (operation === 'update' && originalDoc) data.createdBy = originalDoc.createdBy;
        // WordPress imports keep original bylines without synthetic user accounts.
        if (!(data.author || originalDoc?.author) && !(data.originalWordpressId || originalDoc?.originalWordpressId)) {
          throw new Error('A staff author is required for new newsroom stories.');
        }

        // A published article is an editorial record: updates must be supervised
        // by a publishing authority, even if the incoming patch omits _status.
        if (operation === 'update' && originalDoc?._status === 'published' && !canPublish(req.user)) {
          throw new Error('Only the Editor-in-Chief or Administrator may edit published articles.');
        }

        if (hasRole(req.user, 'journalist')) {
          if (data._status === 'published' || originalDoc?._status === 'published') {
            throw new Error('Journalists cannot publish or modify published articles.');
          }
          if (operation === 'update' && originalDoc && ['approved', 'in_review'].includes(String(originalDoc.workflowStatus))) {
            data.workflowStatus = 'draft';
          }
          if (['approved', 'changes_requested'].includes(String(data.workflowStatus || ''))) {
            throw new Error('An editor must review and approve this article.');
          }
        }
        if (data._status === 'published' && !canPublish(req.user)) {
          throw new Error('Only the Editor-in-Chief or Administrator can publish.');
        }
        if (data._status === 'published') {
          const state = data.workflowStatus || originalDoc?.workflowStatus;
          if (state !== 'approved') throw new Error('Approve the article before publication.');
        }
        return data;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 250 },
    { name: 'slug', type: 'text', unique: true, required: true, index: true },
    { name: 'subtitle', type: 'text' },
    { name: 'publicByline', type: 'text', admin: { description: 'Public-facing author attribution; never expose staff email addresses.' } },
    { name: 'summary', type: 'textarea', required: true, maxLength: 800 },
    { name: 'body', type: 'richText', required: true },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'author', type: 'relationship', relationTo: 'staff-users',
      admin: { description: 'Assign a staff author on new articles; historical WordPress bylines are preserved separately.' } },
    {
      name: 'createdBy', type: 'relationship', relationTo: 'staff-users',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true },
    },
    { name: 'primaryCategory', type: 'relationship', relationTo: 'categories', required: true, index: true },
    { name: 'secondaryCategories', type: 'relationship', relationTo: 'categories', hasMany: true },
    { name: 'locations', type: 'relationship', relationTo: 'locations', hasMany: true },
    { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
    {
      name: 'editorialType', type: 'select', required: true, defaultValue: 'news',
      options: [
        { label: 'News', value: 'news' }, { label: 'Analysis', value: 'analysis' },
        { label: 'Explainer', value: 'explainer' }, { label: 'Opinion', value: 'opinion' },
        { label: 'Interview', value: 'interview' }, { label: 'Sponsored', value: 'sponsored' },
      ],
    },
    {
      name: 'workflowStatus', type: 'select', required: true, defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' }, { label: 'Submitted for review', value: 'in_review' },
        { label: 'Changes requested', value: 'changes_requested' },
        { label: 'Approved', value: 'approved' },
      ],
    },
    {
      name: 'editorNotes', type: 'textarea',
      access: { read: ({ req }) => editorial(req.user), update: ({ req }) => canReview(req.user) },
      admin: { description: 'Internal editorial notes; never public.' },
    },
    { name: 'sourceLinks', type: 'array', fields: [
      { name: 'label', type: 'text' },
      { name: 'url', type: 'text', required: true },
    ] },
    { name: 'correctionNotice', type: 'textarea' },
    { name: 'firstPublishedAt', type: 'date', admin: { readOnly: true } },
    { name: 'originalWordpressId', type: 'number', unique: true, admin: { readOnly: true } },
    { name: 'originalWordpressUrl', type: 'text' },
    { name: 'legacyHtml', type: 'textarea', maxLength: 2000000, admin: { description: 'Original WordPress HTML preserved for review. Sanitized when rendered publicly.' } },
    { name: 'legacyFeaturedImageUrl', type: 'text' },
    { name: 'legacyFeaturedImageAlt', type: 'text' },
    { name: 'legacyMediaWordpressId', type: 'number' },
    { name: 'metaTitle', type: 'text', maxLength: 180 },
    { name: 'metaDescription', type: 'textarea', maxLength: 320 },
  ],
};
