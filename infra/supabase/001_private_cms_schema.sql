-- OgasTV Africa: private schema used by the Payload PostgreSQL adapter.
-- This setup was applied to the OgasTV Supabase project on 2026-11-05.
-- Re-run only for a new, dedicated OgasTV project. Keep schema OUT of exposed API schemas.
CREATE SCHEMA IF NOT EXISTS ogastv;
REVOKE ALL ON SCHEMA ogastv FROM PUBLIC;
REVOKE ALL ON SCHEMA ogastv FROM anon;
REVOKE ALL ON SCHEMA ogastv FROM authenticated;
GRANT USAGE, CREATE ON SCHEMA ogastv TO postgres;
COMMENT ON SCHEMA ogastv IS
  'Private OgasTV Payload CMS application data. Not exposed through Supabase Data API.';
-- Payload generates its own collection-table migrations; do not hand-create those here.
