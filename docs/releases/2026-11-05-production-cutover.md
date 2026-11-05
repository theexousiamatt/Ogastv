# OgasTV Africa — Production cutover gate (not yet satisfied)

**Prepared:** 2026-11-05  
**Current public site:** https://ogastvafrica.ng (WordPress)  
**Current functional staging:** https://ogastv-cms.inspirarestudio.com (Next.js/Payload)  
**Visual review:** https://ogastv-design.inspirarestudio.com (static prototype)  
**Release branch:** `release/ogastv-editorial-ui-v1`

## Implemented in release candidate

- Approved Newsprint Editorial token layer added to the functional Next.js public frontend.
- Responsive masthead, story hierarchy, location-discovery CTA and Studio entry use existing real article/category data from the WordPress read-only adapter.
- Refined article typography and interaction/focus/reduced-motion styles.
- Live Studio page reads **published** Payload live-event status and Youtube ID, with scheduled/on-air/interrupted/ended/replay and honest off-air states. No mock viewer counts or fictional breaking-news updates.
- Hostinger production site deliberately left untouched.

## Blockers that MUST pass before replacing WordPress

1. **Production content:** As checked on Nov 5, OgasTV Payload had 0 articles, 0 categories, and 0 media. WordPress is still the source. Import the entire WordPress archive to Payload, including post bodies, media references, bylines, categories and timestamps. Verify counts and sampled accuracy.
2. **WordPress API continuity:** The current frontend's `WORDPRESS_API_BASE` reads `https://ogastvafrica.ng/wp-json/wp/v2`. Switching that domain from WordPress to Next.js would break content fetching. Before DNS/site cutover, either switch to `CMS_CONTENT_SOURCE=payload` with a reconciled migration or move WordPress REST to a *separately secured, verified stable* legacy hostname and update the private config. Do not cut over with current default.
3. **Editorial administrator:** Latest confirmed OgasTV database staff count was 0. Verify first admin authentication actually persists and verify journalist/editor/editor-in-chief permission boundaries on staging.
4. **Media durability:** Payload local media needs persistent object storage and tested upload lifecycle. WordPress legacy media URLs must continue serving or be migrated with correct alt text.
5. **Streaming:** No real OBS/YouTube Live broadcast has been performed. Confirm scheduled -> live -> interruption -> ended -> replay states using a permitted real test stream, including mobile low-bandwidth conditions. No simulated viewers or invented live updates.
6. **Email:** SMTP verification, password recovery and newsletters must use a configured verified sender with delivery tests.
7. **SEO:** Preserve canonical URLs or provide 301 redirects, old article slugs, sitemap, structured data, robots and index behavior. Current frontend metadata contains `robots: { index: false }` intentionally for staging. Change that ONLY at production cutover after SEO QA.
8. **Security/reliability:** Fix remaining high package advisories, verify authorization, remove/disable test bootstrap paths, confirm rate limiting, CSP, CDN media, logs, backups and rollback playbook.
9. **Review:** Responsive UI and screen reader/keyboard testing on homepage, reading, search, location archives, auth, newsroom and Studio; WCAG 2.2 AA target. Separate client approval required for production replacement.
10. **Rollback:** Make and verify a complete export/backup of WordPress files and database. Record TTL, routing, reversion procedure and contact owner. Rehearse on staging where feasible.

## Release decision

**NO-GO for root-domain replacement until blockers are resolved.** A static design preview must never replace the live publication. Changes here are code-level implementation in a protected release branch, not a production deployment.
