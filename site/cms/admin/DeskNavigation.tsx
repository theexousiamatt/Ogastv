import React from 'react';
import {
  BookOpenText, CheckCheck, Clapperboard, FilePlus2, FolderClosed,
  Image, LayoutDashboard, MailCheck, Radio, Settings2, UsersRound,
} from 'lucide-react';
import { canReview, editorial, getStaff, hasRole } from '../access';

export function DeskNavigation({ user }: {user?: unknown}) {
  const actor = getStaff(user);
  if (!actor) return null;
  const review = canReview(actor);
  const moderate = hasRole(actor,'administrator','editor_in_chief','editor','moderator');
  const admin = hasRole(actor,'administrator');
  return <nav className="ogas-nav-v2" aria-label="Newsroom navigation">
    <a className="ogas-nav-v2__logo" href="/admin" aria-label="OgasTV newsroom home">
      <span>▶</span> <strong>OgasTV <em>Africa</em></strong>
    </a>
    <span className="ogas-nav-v2__eyebrow">WORKSPACE</span>
    <a href="/admin" className="ogas-nav-v2__link ogas-nav-v2__dashboard"><LayoutDashboard size={18}/> Dashboard</a>
    <a href="/admin/collections/articles" className="ogas-nav-v2__link"><BookOpenText size={18}/> Articles</a>
    {editorial(actor) && <a href="/admin/collections/articles/create" className="ogas-nav-v2__link"><FilePlus2 size={18}/> New story</a>}
    <a href="/admin/my-stories" className="ogas-nav-v2__link"><FolderClosed size={18}/> My stories</a>
    {review && <a href="/admin/review-queue" className="ogas-nav-v2__link"><CheckCheck size={18}/> Review queue</a>}
    <a href="/admin/collections/categories" className="ogas-nav-v2__link"><FolderClosed size={18}/> Categories</a>
    {editorial(actor) && <a href="/admin/collections/media" className="ogas-nav-v2__link"><Image size={18}/> Media</a>}
    <a href="/admin/collections/live-events" className="ogas-nav-v2__link"><Radio size={18}/> Live events</a>
    {editorial(actor) && <a href="/broadcast-studio" className="ogas-nav-v2__link"><Radio size={18}/> Go live from phone</a>}
    {moderate && <a href="/admin/collections/community-submissions" className="ogas-nav-v2__link"><MailCheck size={18}/> Submissions</a>}
    {review && <a href="/admin/collections/programmes" className="ogas-nav-v2__link"><Clapperboard size={18}/> Studio</a>}
    {admin && <a href="/admin/collections/staff-users" className="ogas-nav-v2__link"><UsersRound size={18}/> Team</a>}
    {admin && <a href="/admin/globals/homepage" className="ogas-nav-v2__link"><LayoutDashboard size={18}/> Homepage layout</a>}
    <details className="ogas-nav-v2__more">
      <summary>More newsroom tools</summary>
      <div>
        {review && <a href="/admin/collections/episodes">Video episodes</a>}
        <a href="/admin/collections/locations">Locations</a>
        <a href="/admin/collections/tags">Story tags</a>
        {admin && <a href="/admin/collections/readers">Reader accounts</a>}
      </div>
    </details>
    <span className="ogas-nav-v2__eyebrow ogas-nav-v2__eyebrow--bottom">ACCOUNT</span>
    <a href="/admin/account" className="ogas-nav-v2__link"><Settings2 size={18}/> My settings</a>
    <div className="ogas-nav-v2__note">OgasTV Africa<br/><span>Stories that bring us closer.</span></div>
  </nav>;
}
