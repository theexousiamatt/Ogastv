# OgasTV Africa — custom publication

This is the new Next.js public-facing OgasTV site, developed alongside the preserved static writing-desk prototype in the repository's dist/ directory.

## Current milestone
- Responsive homepage: lead story, latest highlights, Lagos Watch, OgasTV Studio and more stories.
- Article pages and category archives served from a **read-only** WordPress REST adapter.
- Sanitized article content, featured media, byline and published date.
- Live broadcasting page with a clear off-air state until a stream is configured.
- Source WordPress and existing preview remain unchanged.

## Run locally

Requires Node.js 22 or newer.

1. Change directory into site/.
2. Run npm install.
3. Copy .env.example to .env.local.
4. Run npm run dev.
5. Open http://localhost:3000.

Use npm run build to validate a production build.

## Source content audit

Run npm run audit:wordpress from site/. It inspects counts accessible through public WordPress REST endpoints and writes a report to reports/wordpress-inventory.json. It does not write to WordPress. Private drafts, media files and SEO plugin metadata require a complete WordPress backup and authorized access.

## Hostinger

Configure Git-based Node.js deployment for the site/ application subdirectory, Node 22, Next.js, and npm run build.

Do not deploy this development branch to ogastv.inspirarestudio.com yet: the existing Hostinger directory serves a separate writing desk. The site intentionally contains no real CMS or editor authentication yet.

Staging has robots noindex/follow disabled until release. Revisit SEO configuration, canonicals, original WordPress article routes and redirect mappings before production.

## Security

The existing local writing desk's IndexedDB and role switching are prototypes, **not** server-side accounts or authorization. Production publishing and uploads require a secured CMS and persistent storage.

## Next milestones

- Confirm original article URL/permalink formats and category slugs.
- Verify REST API availability and run a complete backup/inventory.
- Add authenticated CMS, editorial roles and publishing.
- Build homepage curation, council filtering, search, submissions and reader features.
- Move media into controlled storage, ensure SEO parity and perform final cutover tests.
