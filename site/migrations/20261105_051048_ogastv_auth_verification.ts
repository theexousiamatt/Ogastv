import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ogastv"."staff_users" ADD COLUMN "_verified" boolean;
  ALTER TABLE "ogastv"."staff_users" ADD COLUMN "_verificationtoken" varchar;
  ALTER TABLE "ogastv"."readers" ADD COLUMN "_verified" boolean;
  ALTER TABLE "ogastv"."readers" ADD COLUMN "_verificationtoken" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ogastv"."staff_users" DROP COLUMN "_verified";
  ALTER TABLE "ogastv"."staff_users" DROP COLUMN "_verificationtoken";
  ALTER TABLE "ogastv"."readers" DROP COLUMN "_verified";
  ALTER TABLE "ogastv"."readers" DROP COLUMN "_verificationtoken";`)
}
