# OgasTV Nigeria — Custom Publishing Platform

This `site/` folder contains the custom Next.js publication and the Payload CMS backend.
The legacy `dist/` folder is the older local writing-desk prototype; it is deliberately preserved.

## Implemented foundation

- Public website and a **single custom OgasTV Studio** admin experience. Payload remains a headless CMS/API/auth engine; its native visual admin UI is removed.
- Staff authentication model: Administrator, Editor-in-Chief, Editor, Journalist, Moderator, Advertising Manager.
- Separate reader authentication model, saved-article and location-preference fields.
- Database collections: Articles, Media, Categories, Tags, Locations, Programmes, Episodes, Live Events and Community Submissions.
- WordPress-style category publishing: posts automatically appear in the matching homepage desks. Studio management covers the optional lead story, featured video, breaking news, programmes, episodes, community moderation and staff roles.
- Public frontend pages for all eight editorial sections, article pages, category archives, Latest News and an off-air/live player.
- Read-only WordPress adapter and separate CMS-backed content provider.
- Automated TypeScript checks in GitHub Actions.

**Remaining work:** The site and newsroom are deployed, but real-device broadcast testing, reader UI, public community intake, email delivery, analytics and ongoing operational QA are still required. SMTP is currently not configured, so staff invitations and email recovery must remain disabled until outbound mail works.

## Official logo

The approved OgasTV Nigeria logo was supplied by the client. A web-sized transparent PNG derived from that upload is committed at `site/public/ogastv-nigeria-logo.png`. Builds must use that committed asset directly; do not regenerate the red OGAS TV lettering or black NIGERIA subtitle. The existing `ogastvafrica.ng` domain remains unchanged.

## Local development

Requires Node.js 24.22.1 or newer, or a Payload-compatible Node 22 release.

1. `cd site`
2. `npm install`
3. Copy `.env.example` to `.env.local` and provide valid `DATABASE_URL` and `PAYLOAD_SECRET`.
4. Keep `CMS_CONTENT_SOURCE=wordpress` while the new CMS is empty.
5. `npm run dev`
6. Visit `http://localhost:3000/` for the public site and `http://localhost:3000/studio` for the newsroom; sign in through `/studio/login`.
7. Run `npm run typecheck` and `npm run build` with a working database configuration.

Never add `.env.local`, real passwords, stream keys or service tokens to GitHub.

## First administrator — private setup only

Staff signup must NOT be publicly open. During private local/staging initialization only, set `ALLOW_FIRST_ADMIN_SETUP=true`, use the protected one-time staff activation flow, verify administrator permissions, then immediately unset `ALLOW_FIRST_ADMIN_SETUP` and restart. Do not expose a newly deployed empty database to public traffic while bootstrap mode is on. Subsequent staff accounts must be created by the administrator.

Staff accounts are private. Administrators can provision another staff account, including another administrator, in Studio > Team & access; a single-use display of a generated temporary password is returned only to the signed-in administrator, and the account is verified through Payload's authenticated server-side flow. Configure and test a transactional email provider to enable automatic invitations and password recovery. The native Payload admin screen is intentionally not deployed. Development authentication without verified outbound mail is **not** acceptable for production.

## Connected Supabase project (verified November 5, 2026)

- Project reference: `cjyhayrxadyadaqdrlot` (active, region `eu-west-1`).
- A dedicated PostgreSQL `ogastv` schema has been created and verified; it has **no application tables yet**.
- `anon` and `authenticated` have no schema usage rights. This schema must not be added to the Supabase Data API exposed-schemas list.
- Set the database connection in your private local environment or hosting secret manager. Use the **Supabase Session pooler**, port 5432, database `postgres`, as a starting point for IPv4-oriented application hosting. Copy the exact connection string from the Supabase Connect panel; the real password must not be committed or posted in chat.
- Payload has been configured with `schemaName: 'ogastv'` (a currently experimental adapter feature). Verify its behavior and generated migration output on staging before public release.
- Do not manually recreate Payload collection tables in the Supabase SQL editor; generate and apply Payload migrations using the app configuration.

## Database

The primary database is PostgreSQL using `@payloadcms/db-postgres`. Use a distinct database for OgasTV; do not reuse another client or studio product's database. Supabase is a possible free development provider, but plan for provider quotas, backups and database pausing. Do not run production migrations without a verified backup. `npm run cms:migrate:create` creates a reviewed schema migration; `npm run cms:migrate` executes pending migrations.

## Content cutover

`CMS_CONTENT_SOURCE=wordpress` is the default. The public site reads the original public WordPress REST endpoints without modifying WordPress. After importing and reconciling articles, categories, authors and media into Payload, change the flag to `payload` in staging, verify article counts and URLs, and only then cut over the public domain.

Run `npm run audit:wordpress` to inventory public WordPress resources. This is not a complete private WordPress database/media backup.

## Media

Editorial media uses the configured Supabase S3-compatible storage adapter; ensure the server-side S3 credentials are configured in Hostinger so uploads survive deployments. Without them, local fallback storage is not a reliable production solution. Community evidence requires a separate private upload system and is not yet accepted publicly.

## Roles and safety

- Publishing permissions are checked server-side.
- The editorial CMS uses versioned drafts and workflow stages.
- Only Administrator and Editor-in-Chief roles may publish articles.
- Public article reads are restricted to published content.
- Community submissions are private, and public submissions remain disabled until secure intake, consent, file handling and anti-spam controls are implemented.
- Staff MFA and a complete audit-trail dashboard remain future security improvements. Secure invitations and email recovery in Studio require configured SMTP; the UI blocks them if mail delivery is unavailable.

## Deployment

Hostinger Business supports Next.js applications, but the Node runtime must meet the pinned Payload requirements and the account must have resources to run the CMS. Deploy the `site/` directory as the Node app after verifying build and database connectivity; do not overwrite the existing `ogastv.inspirarestudio.com` directory without a staging backup and explicit cutover.

Hostinger limits background workers and WebSockets. Use provider-managed video streaming and scheduled external jobs for future publishing sync and real-time features.

## Email and reader registration
Configure the official Payload Nodemailer SMTP adapter through Hostinger environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM_ADDRESS`. Use an OgasTV-owned verified sender. Never commit or share SMTP credentials. Real staff email verification and password recovery must be tested before administrator activation. Public reader sign-up is disabled with `READER_SIGNUP_ENABLED=false` and remains denied unless email is configured.
