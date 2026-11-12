import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "ogastv"."enum_live_events_source_type" AS ENUM('cloudflare', 'youtube');
    CREATE TYPE "ogastv"."enum__live_events_v_version_source_type" AS ENUM('cloudflare', 'youtube');
    ALTER TABLE "ogastv"."live_events" ADD COLUMN "source_type" "ogastv"."enum_live_events_source_type" DEFAULT 'cloudflare';
    ALTER TABLE "ogastv"."live_events" ADD COLUMN "publisher_session_id" varchar;
    ALTER TABLE "ogastv"."live_events" ADD COLUMN "broadcaster_staff_id" varchar;
    ALTER TABLE "ogastv"."_live_events_v" ADD COLUMN "version_source_type" "ogastv"."enum__live_events_v_version_source_type" DEFAULT 'cloudflare';
    ALTER TABLE "ogastv"."_live_events_v" ADD COLUMN "version_publisher_session_id" varchar;
    ALTER TABLE "ogastv"."_live_events_v" ADD COLUMN "version_broadcaster_staff_id" varchar;
  `);
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ogastv"."_live_events_v" DROP COLUMN "version_broadcaster_staff_id";
    ALTER TABLE "ogastv"."_live_events_v" DROP COLUMN "version_publisher_session_id";
    ALTER TABLE "ogastv"."_live_events_v" DROP COLUMN "version_source_type";
    ALTER TABLE "ogastv"."live_events" DROP COLUMN "broadcaster_staff_id";
    ALTER TABLE "ogastv"."live_events" DROP COLUMN "publisher_session_id";
    ALTER TABLE "ogastv"."live_events" DROP COLUMN "source_type";
    DROP TYPE "ogastv"."enum__live_events_v_version_source_type";
    DROP TYPE "ogastv"."enum_live_events_source_type";
  `);
}
