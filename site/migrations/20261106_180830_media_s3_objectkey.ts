import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// Additive and idempotent: already applied directly to production through the
// Supabase migration API after the S3 adapter exposed this missing field.
export async function up({db}: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ogastv"."media"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  `);
}

// Dropping this field would destroy the storage key reference for uploaded media.
// Intentionally refuse automatic rollbacks: migrate those records first.
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Cannot automatically remove media storage object keys without relocating stored files first.');
}
