import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ogastv"."wordpress_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wordpress_id" numeric NOT NULL,
  	"source_url" varchar NOT NULL,
  	"original_url" varchar,
  	"mime_type" varchar,
  	"alt" varchar,
  	"caption" varchar,
  	"credit" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."wordpress_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"wordpress_id" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"original_url" varchar NOT NULL,
  	"original_html" varchar,
  	"excerpt" varchar,
  	"published_at" timestamp(3) with time zone,
  	"parent_wordpress_id" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "ogastv"."articles" ADD COLUMN "legacy_html" varchar;
  ALTER TABLE "ogastv"."articles" ADD COLUMN "legacy_featured_image_url" varchar;
  ALTER TABLE "ogastv"."articles" ADD COLUMN "legacy_featured_image_alt" varchar;
  ALTER TABLE "ogastv"."articles" ADD COLUMN "legacy_media_wordpress_id" numeric;
  ALTER TABLE "ogastv"."_articles_v" ADD COLUMN "version_legacy_html" varchar;
  ALTER TABLE "ogastv"."_articles_v" ADD COLUMN "version_legacy_featured_image_url" varchar;
  ALTER TABLE "ogastv"."_articles_v" ADD COLUMN "version_legacy_featured_image_alt" varchar;
  ALTER TABLE "ogastv"."_articles_v" ADD COLUMN "version_legacy_media_wordpress_id" numeric;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD COLUMN "wordpress_media_id" integer;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD COLUMN "wordpress_pages_id" integer;
  CREATE UNIQUE INDEX "wordpress_media_wordpress_id_idx" ON "ogastv"."wordpress_media" USING btree ("wordpress_id");
  CREATE INDEX "wordpress_media_updated_at_idx" ON "ogastv"."wordpress_media" USING btree ("updated_at");
  CREATE INDEX "wordpress_media_created_at_idx" ON "ogastv"."wordpress_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "wordpress_pages_wordpress_id_idx" ON "ogastv"."wordpress_pages" USING btree ("wordpress_id");
  CREATE UNIQUE INDEX "wordpress_pages_slug_idx" ON "ogastv"."wordpress_pages" USING btree ("slug");
  CREATE INDEX "wordpress_pages_updated_at_idx" ON "ogastv"."wordpress_pages" USING btree ("updated_at");
  CREATE INDEX "wordpress_pages_created_at_idx" ON "ogastv"."wordpress_pages" USING btree ("created_at");
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wordpress_media_fk" FOREIGN KEY ("wordpress_media_id") REFERENCES "ogastv"."wordpress_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wordpress_pages_fk" FOREIGN KEY ("wordpress_pages_id") REFERENCES "ogastv"."wordpress_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_wordpress_media_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("wordpress_media_id");
  CREATE INDEX "payload_locked_documents_rels_wordpress_pages_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("wordpress_pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ogastv"."wordpress_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ogastv"."wordpress_pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ogastv"."wordpress_media" CASCADE;
  DROP TABLE "ogastv"."wordpress_pages" CASCADE;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wordpress_media_fk";
  
  ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wordpress_pages_fk";
  
  DROP INDEX "ogastv"."payload_locked_documents_rels_wordpress_media_id_idx";
  DROP INDEX "ogastv"."payload_locked_documents_rels_wordpress_pages_id_idx";
  ALTER TABLE "ogastv"."articles" DROP COLUMN "legacy_html";
  ALTER TABLE "ogastv"."articles" DROP COLUMN "legacy_featured_image_url";
  ALTER TABLE "ogastv"."articles" DROP COLUMN "legacy_featured_image_alt";
  ALTER TABLE "ogastv"."articles" DROP COLUMN "legacy_media_wordpress_id";
  ALTER TABLE "ogastv"."_articles_v" DROP COLUMN "version_legacy_html";
  ALTER TABLE "ogastv"."_articles_v" DROP COLUMN "version_legacy_featured_image_url";
  ALTER TABLE "ogastv"."_articles_v" DROP COLUMN "version_legacy_featured_image_alt";
  ALTER TABLE "ogastv"."_articles_v" DROP COLUMN "version_legacy_media_wordpress_id";
  ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP COLUMN "wordpress_media_id";
  ALTER TABLE "ogastv"."payload_locked_documents_rels" DROP COLUMN "wordpress_pages_id";`)
}
