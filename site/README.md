# OgasTV Africa — Custom Publishing Platform

This `site/` folder contains the custom Next.js publication and the Payload CMS backend.
The legacy `dist/` folder is the older local writing-desk prototype; it is deliberately preserved.

## Implemented foundation

- Independent public website routes and protected Payload admin panel.
- Staff authentication model: Administrator, Editor-in-Chief, Editor, Journalist, Moderator, Advertising Manager.
- Separate reader authentication model, saved-article and location-preference fields.
- Database collections: Articles, Media, Categories, Tags, Locations, Programmes, Episodes, Live Events and Community Submissions.
- Homepage curation configuration, drafts, revisions and editorial workflow fields.
- Public frontend pages for all eight editorial sections, article pages, category archives, Latest News and an off-air/live player.
- Read-only WordPress adapter and separate CMS-backed content provider.
- Automated TypeScript checks in GitHub Actions.

**Not yet finished:** This is a foundation, not a functional production launch. The database must be provisioned. Editors cannot be expected to use the new CMS until it is initialized, tested and connected to the publishing workflow. WordPress migration, live provider status syncing, email delivery, reader UI, search, moderation intake, ads, analytics and persistent media storage remain implementation tasks.

## Local development

Requires Node.js 24.22.1 or newer, or a Payload-compatible Node 22 release.

1. `cd site`
2. `npm install`
3. Copy `.env.example` to `.env.local` and provide valid `DATABASE_URL` and `PAYLOAD_SECRET`.
4. Keep `CMS_CONTENT_SOURCE=wordpress` while the new CMS is empty.
5. `npm run dev`
6. Visit `http://localhost:3000/` for the public site and `http://localhost:3000/admin` for the CMS.
7. Run `npm run typecheck` and `npm run build` with a working database configuration.

Never add `.env.local`, real passwords, stream keys or service tokens to GitHub.

## First administrator — private setup only

Staff signup must NOT be publicly open. During private local/staging initialization only, set `ALLOW_FIRST_ADMIN_SETUP=true`, create the first staff account from the protected admin setup interface, verify it has administrator permissions, then immediately unset `ALLOW_FIRST_ADMIN_SETUP` and restart. Do not expose a newly deployed empty database to public traffic while bootstrap mode is on. Subsequent staff accounts must be created by the administrator.

Staff email verification is enforced in production; integrate a transactional email provider before deployment, and test verification, recovery and reset flows. Development authentication without verified outbound mail is **not** acceptable for production.

## Database

The primary database is PostgreSQL using `@payloadcms/db-postgres`. Use a distinct database for OgasTV; do not reuse another client or studio product's database. Supabase is a possible free development provider, but plan for provider quotas, backups and database pausing. Do not run production migrations without a verified backup. `npm run cms:migrate:create` creates a reviewed schema migration; `npm run cms:migrate` executes pending migrations.

## Content cutover

`CMS_CONTENT_SOURCE=wordpress` is the default. The public site reads the original public WordPress REST endpoints without modifying WordPress. After importing and reconciling articles, categories, authors and media into Payload, change the flag to `payload` in staging, verify article counts and URLs, and only then cut over the public domain.

Run `npm run audit:wordpress` to inventory public WordPress resources. This is not a complete private WordPress database/media backup.

## Media

The current Payload media collection accepts public editorial images and stores them locally. This is suitable only as an initial development adapter. Configure persistent media object storage (for example, R2) and backups before migration/production. Community evidence requires a separate private upload system and is not yet accepted publicly.

## Roles and safety

- Publishing permissions are checked server-side.
- The editorial CMS uses versioned drafts and workflow stages.
- Only Administrator and Editor-in-Chief roles may publish articles.
- Public article reads are restricted to published content.
- Community submissions are private, and public submissions remain disabled until secure intake, consent, file handling and anti-spam controls are implemented.
- This initial model does not implement staff MFA, invite emails or an audit-trail dashboard; those are production requirements.

## Deployment

Hostinger Business supports Next.js applications, but the Node runtime must meet the pinned Payload requirements and the account must have resources to run the CMS. Deploy the `site/` directory as the Node app after verifying build and database connectivity; do not overwrite the existing `ogastv.inspirarestudio.com` directory without a staging backup and explicit cutover.

Hostinger limits background workers and WebSockets. Use provider-managed video streaming and scheduled external jobs for future publishing sync and real-time features.
