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
          // Publishing an older draft should make it newly visible in its category.
          // Never overwrite the first publication date on later revisions.
          if (!data.firstPublishedAt && !originalDoc?.firstPublishedAt) {
            data.firstPublishedAt = new Date().toISOString();
          }
        }
        return data;
      },
    ],
  },
  fields: [
    // The writing canvas is always first, just like the original OgasTV desk.
    { name: 'title', type: 'text', required: true, maxLength: 250, label: 'Headline',
      admin: { className: 'ogas-headline-field', placeholder: 'What’s the story?',
        description: 'Be specific: tell readers what happened.' } },
    { name: 'body', type: 'richText', required: true, label: 'Story',
      admin: { className: 'ogas-story-body', description: 'Write or paste your reporting. Drafts save automatically.' } },
    { name: 'summary', type: 'textarea', required: true, maxLength: 800, label: 'Short introduction',
      admin: { className: 'ogas-summary-field', rows: 3, placeholder: 'In two or three sentences, what should readers know?',
        description: 'This appears beneath the headline and in story previews.' } },
    { name: 'featuredImage', type: 'upload', relationTo: 'media', label: 'Featured image',
      admin: { className: 'ogas-featured-media', description: 'Choose or upload the photograph for this story.' } },

    // Keep essential publishing information alongside Payload's native save
    // and draft controls. Roles and workflow enforcement remain server-side.
    { name: 'primaryCategory', type: 'relationship', relationTo: 'categories', required: true, index: true,
      label: 'Section', admin: { position: 'sidebar', description: 'Where should this appear on the website?' } },
    { name: 'author', type: 'relationship', relationTo: 'staff-users',
      defaultValue: ({ user }) => getStaff(user)?.id,
      admin: { position: 'sidebar', description: 'Defaults to you. Change only if another reporter wrote this story.' } },
    { name: 'workflowStatus', type: 'select', required: true, defaultValue: 'draft',
      admin: { position: 'sidebar', description: 'Writers: select “Submit for review”, then save. Editors approve before publishing.' },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submit for review', value: 'in_review' },
        { label: 'Changes requested', value: 'changes_requested' },
        { label: 'Approved', value: 'approved' },
      ] },
    { name: 'editorNotes', type: 'textarea',
      access: { read: ({ req }) => editorial(req.user), update: ({ req }) => canReview(req.user) },
      admin: { position: 'sidebar', rows: 3, description: 'Private editor feedback. Reporters can read it but only editors can change it.' } },

    {
      type: 'collapsible',
      label: 'Story details',
      admin: { initCollapsed: true, className: 'ogas-editor-details' },
      fields: [
        { name: 'subtitle', type: 'text', admin: { placeholder: 'Optional supporting headline' } },
        { name: 'publicByline', type: 'text', label: 'Public byline',
          admin: { placeholder: 'Name shown to readers', description: 'Never expose staff email addresses.' } },
        { name: 'editorialType', type: 'select', required: true, defaultValue: 'news', options: [
          { label: 'News', value: 'news' }, { label: 'Analysis', value: 'analysis' },
          { label: 'Explainer', value: 'explainer' }, { label: 'Opinion', value: 'opinion' },
          { label: 'Interview', value: 'interview' }, { label: 'Sponsored', value: 'sponsored' },
        ] },
        { name: 'secondaryCategories', type: 'relationship', relationTo: 'categories', hasMany: true },
        { name: 'locations', type: 'relationship', relationTo: 'locations', hasMany: true },
        { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true },
        { name: 'sourceLinks', type: 'array', label: 'Sources and reference links', fields: [
          { name: 'label', type: 'text' },
          { name: 'url', type: 'text', required: true },
        ] },
        { name: 'correctionNotice', type: 'textarea' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Search and story URL',
      admin: { initCollapsed: true, className: 'ogas-editor-details' },
      fields: [
        { name: 'slug', type: 'text', unique: true, required: true, index: true,
          admin: {
            components: { Field: '/cms/admin/AutoSlugField#AutoSlugField' },
            description: 'Generated from your headline. Edit only when necessary; changing a published URL can break links.',
          },
          hooks: {
            beforeValidate: [({value, data, originalDoc}) => {
              if (typeof value === 'string' && value.trim()) return value;
              if (originalDoc?.slug) return originalDoc.slug;
              const title = typeof data?.title === 'string' ? data.title : '';
              return title.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'')
                .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180) || value;
            }],
          },
        },
        { name: 'metaTitle', type: 'text', maxLength: 180 },
        { name: 'metaDescription', type: 'textarea', maxLength: 320 },
      ],
    },
    {
      type: 'collapsible',
      label: 'Original archive information',
      admin: { initCollapsed: true, className: 'ogas-editor-details' },
      fields: [
        { name: 'createdBy', type: 'relationship', relationTo: 'staff-users',
          access: { create: () => false, update: () => false }, admin: { readOnly: true } },
        { name: 'firstPublishedAt', type: 'date', admin: { readOnly: true } },
        { name: 'originalWordpressId', type: 'number', unique: true, admin: { readOnly: true } },
        { name: 'originalWordpressUrl', type: 'text' },
        { name: 'legacyHtml', type: 'textarea', maxLength: 2000000, admin: {
          description: 'Original HTML retained from WordPress imports. It is sanitized when displayed publicly.' } },
        { name: 'legacyFeaturedImageUrl', type: 'text' },
        { name: 'legacyFeaturedImageAlt', type: 'text' },
        { name: 'legacyMediaWordpressId', type: 'number' },
      ],
    },
  ],
};
