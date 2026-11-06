import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';
export async function up({db}:MigrateUpArgs):Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ogastv"."media" ALTER COLUMN "alt" DROP NOT NULL;
    CREATE TYPE "ogastv"."enum_ad_banners_status" AS ENUM ('scheduled','paused');
    CREATE TYPE "ogastv"."enum_ad_banners_placement" AS ENUM ('homepage');
    CREATE TABLE "ogastv"."ad_banners" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "banner_id" integer NOT NULL,
      "destination_url" varchar NOT NULL,
      "starts_at" timestamp(3) with time zone NOT NULL,
      "ends_at" timestamp(3) with time zone NOT NULL,
      "status" "ogastv"."enum_ad_banners_status" DEFAULT 'scheduled' NOT NULL,
      "placement" "ogastv"."enum_ad_banners_placement" DEFAULT 'homepage' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    ALTER TABLE "ogastv"."ad_banners" ADD CONSTRAINT "ad_banners_banner_id_media_id_fk"
      FOREIGN KEY ("banner_id") REFERENCES "ogastv"."media"("id") ON DELETE no action ON UPDATE no action;
    CREATE INDEX "ad_banners_banner_idx" ON "ogastv"."ad_banners" ("banner_id");
    CREATE INDEX "ad_banners_updated_at_idx" ON "ogastv"."ad_banners" ("updated_at");
    CREATE INDEX "ad_banners_created_at_idx" ON "ogastv"."ad_banners" ("created_at");
    ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD COLUMN "ad_banners_id" integer;
    ALTER TABLE "ogastv"."payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_ad_banners_fk"
      FOREIGN KEY ("ad_banners_id") REFERENCES "ogastv"."ad_banners"("id")
      ON DELETE cascade ON UPDATE no action;
    CREATE INDEX "payload_locked_documents_rels_ad_banners_id_idx"
      ON "ogastv"."payload_locked_documents_rels" ("ad_banners_id");
  `);
}
export async function down({db}:MigrateDownArgs):Promise<void> {
  await db.execute(sql`
    ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ad_banners_fk";
    DROP INDEX "ogastv"."payload_locked_documents_rels_ad_banners_id_idx";
    ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP COLUMN "ad_banners_id";
    DROP TABLE "ogastv"."ad_banners";
    DROP TYPE "ogastv"."enum_ad_banners_placement";
    DROP TYPE "ogastv"."enum_ad_banners_status";
    UPDATE "ogastv"."media" SET "alt" = '' WHERE "alt" IS NULL;
    ALTER TABLE "ogastv"."media" ALTER COLUMN "alt" SET NOT NULL;
  `);
}
