import React from 'react';
import { canReview, editorial, getStaff } from '../access';

export function DeskNavigation({ user }: { user?: unknown }) {
  const actor = getStaff(user);
  if (!actor) return null;
  return (
    <div className="ogas-desk-nav" aria-label="Writing desk shortcuts">
      <div className="ogas-desk-nav__label">WRITING DESK</div>
      {editorial(actor) && (
        <a href="/admin/collections/articles/create" className="ogas-desk-nav__new">
          <span aria-hidden="true">＋</span> New story
        </a>
      )}
      <a href="/admin/my-stories" className="ogas-desk-nav__link">
        <span aria-hidden="true">▤</span> My stories
      </a>
      {canReview(actor) && (
        <a href="/admin/review-queue" className="ogas-desk-nav__link">
          <span aria-hidden="true">✓</span> Review queue
        </a>
      )}
      <div className="ogas-desk-nav__caption">Write. Save. Review. Publish.</div>
      <div className="ogas-desk-nav__separator" />
    </div>
  );
}
