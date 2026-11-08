# OgasTV Nigeria — private CMS staging rollout

## Current environment
- Production WordPress: `ogastvafrica.ng` — do not modify or point DNS here yet.
- Existing writer-desk preview: `ogastv.inspirarestudio.com` — preserve.
- **New isolated CMS staging host:** `ogastv-cms.inspirarestudio.com` — provisioned on Hostinger Business hosting.
- Supabase project ref: `cjyhayrxadyadaqdrlot` (eu-west-1). The unexposed `ogastv` schema exists, and `anon`/`authenticated` do not have USAGE. This is intentionally separate from the public Supabase Data API.
- GitHub branch: `feat/custom-ogastv-foundation-2026-11-05` (draft PR #1).
- Payload app root within repository: `site/`. Hostinger Node.js: 24, Next.js, `npm run build`.

## Private configuration before deploying
Set the following **in Hostinger Node.js environment variables**, not GitHub source code, ChatGPT messages or publicly accessible pages.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | From Supabase dashboard **Connect → Session pooler**, port 5432, DB `postgres` (suitable for IPv4 hosting). The password is the Supabase DB password, URL-encoded when necessary. |
| `PAYLOAD_SECRET` | Strong random secret from `openssl rand -hex 32` or a password manager. |
| `NEXT_PUBLIC_SERVER_URL` | `https://ogastv-cms.inspirarestudio.com` |
| `CMS_CONTENT_SOURCE` | `wordpress` until all new CMS content is migrated and verified. |
| `WORDPRESS_API_BASE` | `https://ogastvafrica.ng/wp-json/wp/v2` |
| `ALLOW_FIRST_ADMIN_SETUP` | `false` except in access-restricted, short initial setup. |

The new Node.js host currently has **no secrets set by ChatGPT**. Hostinger's replace-environment-variables API overwrites the **entire** set, so do not use it without the complete final values. Do not use public or browser-prefixed variables for the database URL or Payload secret.

## Migration procedure
1. Generate Payload migrations from the application with `npm run cms:migrate:create -- ogastv_initial_schema`, after confirming a correctly configured, **disposable** database. CI generates this migration archive for review.
2. Commit the migration files (`site/migrations/*.ts` and `site/migrations/index.ts`) to the development branch; do not rely on expiring CI artifacts as production migration history.
3. Validate migration on a disposable PostgreSQL 17 instance via `npm run cms:migrate` and verify that staff/users, articles, media, categories, locations and broadcasts exist.
4. Take a backup/snapshot before applying migrations to real OgasTV Supabase. Its `ogastv` schema starts empty.
5. Apply *the committed Payload migrations* to the real OgasTV DB using `npm run cms:migrate` in a private environment configured with the real `DATABASE_URL`. Do not separately create Payload tables manually in the Supabase SQL editor, or migration histories will drift.
6. Verify the generated tables live **only** in `ogastv`, that `anon` and `authenticated` still lack access, and run Supabase security advisors.

## Staging application & access
1. Protect the site from public access before initial admin bootstrap, preferably by host-level HTTP authentication or an allowlisted access policy. `robots noindex` alone is **not** access control.
2. Configure a real transactional email adapter and verified sender domain before requiring production account verification or password reset.
3. Deploy the feature branch to the **new** CMS staging host, with Node.js 24 and root directory `site`.
4. Only during private bootstrap, set `ALLOW_FIRST_ADMIN_SETUP=true`. Create the first administrator in `/admin` and verify its permissions. Immediately set this flag back to `false` and rebuild/restart as required.
5. Verify editor/in-chief, journalist and reader login boundaries; never treat the original `dist/` preview role switcher as authentication.
6. Confirm create → draft → review → approval → publish, plus unpublish/restore and hidden drafts, using test articles.
7. Before launch, connect durable media storage, app monitoring, email and reliable scheduled jobs, and import/compare the WordPress content.

## Do not deploy yet if
- The `DATABASE_URL` and `PAYLOAD_SECRET` are missing.
- Initial migration files are unreviewed/uncommitted.
- Email verification cannot deliver.
- There is no staging access restriction during staff bootstrap.
- The Next.js/Payload build or integration tests have not passed.
