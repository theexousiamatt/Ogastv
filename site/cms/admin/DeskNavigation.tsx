import React from 'react';
import { ArrowUpRight, ClipboardCheck, FilePenLine, FolderOpen, Radio, LayoutGrid } from 'lucide-react';
import { canReview, editorial, getStaff } from '../access';

/**
 * Small shortcuts INSIDE Payload's single native navigation drawer.
 * Payload owns the sidebar, its mobile toggle, its collection links and logout.
 * Don't render a second sidebar or repeat the native collection navigation.
 */
export function DeskNavigation({ user }: { user?: unknown }) {
  const actor = getStaff(user);
  if (!actor) return null;
  const canWrite = editorial(actor);
  const canManage = canReview(actor);

  return (
    <div className="ogas-newsroom-shortcuts" aria-label="Newsroom shortcuts">
      <span className="ogas-newsroom-shortcuts__label">YOUR WORKSPACE</span>
      <a className="ogas-newsroom-shortcuts__primary" href="/studio"><LayoutGrid size={18} aria-hidden="true" /> Open OgasTV Studio</a>
      {canWrite && <a href="/studio?tab=write">
        <FilePenLine size={18} aria-hidden="true" /> Write a story
      </a>}
      <a href="/studio?tab=articles">
        <FolderOpen size={18} aria-hidden="true" /> My stories
      </a>
      {canManage && <a href="/admin/review-queue">
        <ClipboardCheck size={18} aria-hidden="true" /> Review queue
      </a>}
      {canWrite && <a href="/studio?tab=live">
        <Radio size={18} aria-hidden="true" /> Go live
      </a>}
      <a href="https://ogastvafrica.ng" target="_blank" rel="noopener noreferrer">
        <ArrowUpRight size={18} aria-hidden="true" /> View website
      </a>
      <span className="ogas-newsroom-shortcuts__label ogas-newsroom-shortcuts__label--browse">MANAGE CONTENT</span>
    </div>
  );
}
