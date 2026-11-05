'use client';

import React, { useEffect, useRef } from 'react';
import type { TextFieldClientComponent } from 'payload';
import { TextField, useField, useFormFields } from '@payloadcms/ui';

/**
 * The old writing desk never required reporters to invent a URL before writing.
 * Keep the native Payload field (validation, permissions and errors), but
 * derive a readable URL from the headline until someone edits it manually.
 */
export const AutoSlugField: TextFieldClientComponent = (props) => {
  const title = useFormFields(([fields]) => fields.title?.value);
  const { value, setValue } = useField<string>({ path: props.path });
  const lastAutoValue = useRef('');

  useEffect(() => {
    if (typeof title !== 'string' || !title.trim()) return;
    const generated = title.normalize('NFKD').toLowerCase()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
    if (!generated) return;
    const existing = typeof value === 'string' ? value : '';
    // Respect imported and manually edited slugs. Regenerate only while
    // untouched or while the value equals a slug we generated earlier.
    if (!existing || (lastAutoValue.current && existing === lastAutoValue.current)) {
      lastAutoValue.current = generated;
      if (existing !== generated) setValue(generated);
    }
  }, [title, value, setValue]);

  return <TextField {...props} />;
};
