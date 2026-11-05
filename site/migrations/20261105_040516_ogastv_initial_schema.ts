import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "ogastv"."enum_staff_users_role" AS ENUM('administrator', 'editor_in_chief', 'editor', 'journalist', 'moderator', 'advertising_manager');
  CREATE TYPE "ogastv"."enum_locations_kind" AS ENUM('state', 'lga', 'lcda', 'community');
  CREATE TYPE "ogastv"."enum_articles_editorial_type" AS ENUM('news', 'analysis', 'explainer', 'opinion', 'interview', 'sponsored');
  CREATE TYPE "ogastv"."enum_articles_workflow_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved');
  CREATE TYPE "ogastv"."enum_articles_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum__articles_v_version_editorial_type" AS ENUM('news', 'analysis', 'explainer', 'opinion', 'interview', 'sponsored');
  CREATE TYPE "ogastv"."enum__articles_v_version_workflow_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved');
  CREATE TYPE "ogastv"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum_episodes_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum__episodes_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum_live_events_broadcast_status" AS ENUM('scheduled', 'live', 'interrupted', 'ended', 'replay_available', 'cancelled');
  CREATE TYPE "ogastv"."enum_live_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum__live_events_v_version_broadcast_status" AS ENUM('scheduled', 'live', 'interrupted', 'ended', 'replay_available', 'cancelled');
  CREATE TYPE "ogastv"."enum__live_events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum_community_submissions_moderation_status" AS ENUM('pending', 'reviewing', 'accepted', 'rejected', 'archived');
  CREATE TYPE "ogastv"."enum_homepage_status" AS ENUM('draft', 'published');
  CREATE TYPE "ogastv"."enum__homepage_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "ogastv"."staff_users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "ogastv"."staff_users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "ogastv"."enum_staff_users_role" DEFAULT 'journalist' NOT NULL,
  	"bio" varchar,
  	"portrait_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "ogastv"."readers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "ogastv"."readers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar NOT NULL,
  	"newsletter_opt_in" boolean DEFAULT false,
  	"newsletter_consent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "ogastv"."readers_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locations_id" integer,
  	"articles_id" integer
  );
  
  CREATE TABLE "ogastv"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "ogastv"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"featured_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"state" varchar DEFAULT 'Lagos' NOT NULL,
  	"kind" "ogastv"."enum_locations_kind" DEFAULT 'lga' NOT NULL,
  	"parent_id" integer,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."articles_source_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "ogastv"."articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"subtitle" varchar,
  	"public_byline" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"featured_image_id" integer,
  	"author_id" integer,
  	"created_by_id" integer,
  	"primary_category_id" integer,
  	"editorial_type" "ogastv"."enum_articles_editorial_type" DEFAULT 'news',
  	"workflow_status" "ogastv"."enum_articles_workflow_status" DEFAULT 'draft',
  	"editor_notes" varchar,
  	"correction_notice" varchar,
  	"first_published_at" timestamp(3) with time zone,
  	"original_wordpress_id" numeric,
  	"original_wordpress_url" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ogastv"."enum_articles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ogastv"."articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"locations_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "ogastv"."_articles_v_version_source_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "ogastv"."_articles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_subtitle" varchar,
  	"version_public_byline" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_featured_image_id" integer,
  	"version_author_id" integer,
  	"version_created_by_id" integer,
  	"version_primary_category_id" integer,
  	"version_editorial_type" "ogastv"."enum__articles_v_version_editorial_type" DEFAULT 'news',
  	"version_workflow_status" "ogastv"."enum__articles_v_version_workflow_status" DEFAULT 'draft',
  	"version_editor_notes" varchar,
  	"version_correction_notice" varchar,
  	"version_first_published_at" timestamp(3) with time zone,
  	"version_original_wordpress_id" numeric,
  	"version_original_wordpress_url" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ogastv"."enum__articles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "ogastv"."_articles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"locations_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "ogastv"."programmes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"cover_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."programmes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer
  );
  
  CREATE TABLE "ogastv"."episodes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"programme_id" integer,
  	"description" varchar,
  	"youtube_video_id" varchar,
  	"thumbnail_id" integer,
  	"released_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ogastv"."enum_episodes_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ogastv"."episodes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer,
  	"articles_id" integer
  );
  
  CREATE TABLE "ogastv"."_episodes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_programme_id" integer,
  	"version_description" varchar,
  	"version_youtube_video_id" varchar,
  	"version_thumbnail_id" integer,
  	"version_released_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ogastv"."enum__episodes_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ogastv"."_episodes_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer,
  	"articles_id" integer
  );
  
  CREATE TABLE "ogastv"."live_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"description" varchar,
  	"location_id" integer,
  	"venue" varchar,
  	"artwork_id" integer,
  	"scheduled_start" timestamp(3) with time zone,
  	"actual_start" timestamp(3) with time zone,
  	"actual_end" timestamp(3) with time zone,
  	"broadcast_status" "ogastv"."enum_live_events_broadcast_status" DEFAULT 'scheduled',
  	"youtube_video_id" varchar,
  	"recording_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "ogastv"."enum_live_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "ogastv"."live_events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer
  );
  
  CREATE TABLE "ogastv"."_live_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_description" varchar,
  	"version_location_id" integer,
  	"version_venue" varchar,
  	"version_artwork_id" integer,
  	"version_scheduled_start" timestamp(3) with time zone,
  	"version_actual_start" timestamp(3) with time zone,
  	"version_actual_end" timestamp(3) with time zone,
  	"version_broadcast_status" "ogastv"."enum__live_events_v_version_broadcast_status" DEFAULT 'scheduled',
  	"version_youtube_video_id" varchar,
  	"version_recording_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "ogastv"."enum__live_events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ogastv"."_live_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer
  );
  
  CREATE TABLE "ogastv"."community_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"submitter_name" varchar NOT NULL,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"location_id" integer,
  	"consent_to_contact" boolean DEFAULT false NOT NULL,
  	"permission_to_publish" boolean DEFAULT false,
  	"moderation_status" "ogastv"."enum_community_submissions_moderation_status" DEFAULT 'pending',
  	"internal_notes" varchar,
  	"converted_article_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "ogastv"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer,
  	"readers_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"locations_id" integer,
  	"tags_id" integer,
  	"articles_id" integer,
  	"programmes_id" integer,
  	"episodes_id" integer,
  	"live_events_id" integer,
  	"community_submissions_id" integer
  );
  
  CREATE TABLE "ogastv"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_users_id" integer,
  	"readers_id" integer
  );
  
  CREATE TABLE "ogastv"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ogastv"."homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lead_story_id" integer,
  	"featured_episode_id" integer,
  	"featured_live_event_id" integer,
  	"breaking_news_enabled" boolean DEFAULT false,
  	"breaking_news_text" varchar,
  	"breaking_news_link" varchar,
  	"_status" "ogastv"."enum_homepage_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "ogastv"."homepage_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "ogastv"."_homepage_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_lead_story_id" integer,
  	"version_featured_episode_id" integer,
  	"version_featured_live_event_id" integer,
  	"version_breaking_news_enabled" boolean DEFAULT false,
  	"version_breaking_news_text" varchar,
  	"version_breaking_news_link" varchar,
  	"version__status" "ogastv"."enum__homepage_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "ogastv"."_homepage_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  ALTER TABLE "ogastv"."staff_users_sessions" ADD CONSTRAINT "staff_users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."staff_users" ADD CONSTRAINT "staff_users_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."readers_sessions" ADD CONSTRAINT "readers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "ogastv"."readers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."readers_rels" ADD CONSTRAINT "readers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."readers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."readers_rels" ADD CONSTRAINT "readers_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "ogastv"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."readers_rels" ADD CONSTRAINT "readers_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."categories" ADD CONSTRAINT "categories_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."articles_source_links" ADD CONSTRAINT "articles_source_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."articles" ADD CONSTRAINT "articles_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."articles" ADD CONSTRAINT "articles_author_id_staff_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."articles" ADD CONSTRAINT "articles_created_by_id_staff_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."articles" ADD CONSTRAINT "articles_primary_category_id_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "ogastv"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."articles_rels" ADD CONSTRAINT "articles_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "ogastv"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."articles_rels" ADD CONSTRAINT "articles_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "ogastv"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."articles_rels" ADD CONSTRAINT "articles_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "ogastv"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v_version_source_links" ADD CONSTRAINT "_articles_v_version_source_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "ogastv"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v" ADD CONSTRAINT "_articles_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v" ADD CONSTRAINT "_articles_v_version_author_id_staff_users_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v" ADD CONSTRAINT "_articles_v_version_created_by_id_staff_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v" ADD CONSTRAINT "_articles_v_version_primary_category_id_categories_id_fk" FOREIGN KEY ("version_primary_category_id") REFERENCES "ogastv"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "ogastv"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "ogastv"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_articles_v_rels" ADD CONSTRAINT "_articles_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "ogastv"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."programmes" ADD CONSTRAINT "programmes_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."programmes_rels" ADD CONSTRAINT "programmes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."programmes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."programmes_rels" ADD CONSTRAINT "programmes_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."episodes" ADD CONSTRAINT "episodes_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "ogastv"."programmes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."episodes" ADD CONSTRAINT "episodes_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."episodes_rels" ADD CONSTRAINT "episodes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."episodes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."episodes_rels" ADD CONSTRAINT "episodes_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."episodes_rels" ADD CONSTRAINT "episodes_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v" ADD CONSTRAINT "_episodes_v_parent_id_episodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."episodes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v" ADD CONSTRAINT "_episodes_v_version_programme_id_programmes_id_fk" FOREIGN KEY ("version_programme_id") REFERENCES "ogastv"."programmes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v" ADD CONSTRAINT "_episodes_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v_rels" ADD CONSTRAINT "_episodes_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."_episodes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v_rels" ADD CONSTRAINT "_episodes_v_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_episodes_v_rels" ADD CONSTRAINT "_episodes_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."live_events" ADD CONSTRAINT "live_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "ogastv"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."live_events" ADD CONSTRAINT "live_events_artwork_id_media_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."live_events" ADD CONSTRAINT "live_events_recording_id_episodes_id_fk" FOREIGN KEY ("recording_id") REFERENCES "ogastv"."episodes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."live_events_rels" ADD CONSTRAINT "live_events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."live_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."live_events_rels" ADD CONSTRAINT "live_events_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v" ADD CONSTRAINT "_live_events_v_parent_id_live_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."live_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v" ADD CONSTRAINT "_live_events_v_version_location_id_locations_id_fk" FOREIGN KEY ("version_location_id") REFERENCES "ogastv"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v" ADD CONSTRAINT "_live_events_v_version_artwork_id_media_id_fk" FOREIGN KEY ("version_artwork_id") REFERENCES "ogastv"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v" ADD CONSTRAINT "_live_events_v_version_recording_id_episodes_id_fk" FOREIGN KEY ("version_recording_id") REFERENCES "ogastv"."episodes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v_rels" ADD CONSTRAINT "_live_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."_live_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_live_events_v_rels" ADD CONSTRAINT "_live_events_v_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."community_submissions" ADD CONSTRAINT "community_submissions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "ogastv"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."community_submissions" ADD CONSTRAINT "community_submissions_converted_article_id_articles_id_fk" FOREIGN KEY ("converted_article_id") REFERENCES "ogastv"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_readers_fk" FOREIGN KEY ("readers_id") REFERENCES "ogastv"."readers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "ogastv"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "ogastv"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "ogastv"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "ogastv"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_programmes_fk" FOREIGN KEY ("programmes_id") REFERENCES "ogastv"."programmes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_episodes_fk" FOREIGN KEY ("episodes_id") REFERENCES "ogastv"."episodes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_events_fk" FOREIGN KEY ("live_events_id") REFERENCES "ogastv"."live_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_community_submissions_fk" FOREIGN KEY ("community_submissions_id") REFERENCES "ogastv"."community_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_staff_users_fk" FOREIGN KEY ("staff_users_id") REFERENCES "ogastv"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_readers_fk" FOREIGN KEY ("readers_id") REFERENCES "ogastv"."readers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."homepage" ADD CONSTRAINT "homepage_lead_story_id_articles_id_fk" FOREIGN KEY ("lead_story_id") REFERENCES "ogastv"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."homepage" ADD CONSTRAINT "homepage_featured_episode_id_episodes_id_fk" FOREIGN KEY ("featured_episode_id") REFERENCES "ogastv"."episodes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."homepage" ADD CONSTRAINT "homepage_featured_live_event_id_live_events_id_fk" FOREIGN KEY ("featured_live_event_id") REFERENCES "ogastv"."live_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."homepage_rels" ADD CONSTRAINT "homepage_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."homepage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."homepage_rels" ADD CONSTRAINT "homepage_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_homepage_v" ADD CONSTRAINT "_homepage_v_version_lead_story_id_articles_id_fk" FOREIGN KEY ("version_lead_story_id") REFERENCES "ogastv"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_homepage_v" ADD CONSTRAINT "_homepage_v_version_featured_episode_id_episodes_id_fk" FOREIGN KEY ("version_featured_episode_id") REFERENCES "ogastv"."episodes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_homepage_v" ADD CONSTRAINT "_homepage_v_version_featured_live_event_id_live_events_id_fk" FOREIGN KEY ("version_featured_live_event_id") REFERENCES "ogastv"."live_events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ogastv"."_homepage_v_rels" ADD CONSTRAINT "_homepage_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "ogastv"."_homepage_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ogastv"."_homepage_v_rels" ADD CONSTRAINT "_homepage_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "ogastv"."articles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "staff_users_sessions_order_idx" ON "ogastv"."staff_users_sessions" USING btree ("_order");
  CREATE INDEX "staff_users_sessions_parent_id_idx" ON "ogastv"."staff_users_sessions" USING btree ("_parent_id");
  CREATE INDEX "staff_users_portrait_idx" ON "ogastv"."staff_users" USING btree ("portrait_id");
  CREATE INDEX "staff_users_updated_at_idx" ON "ogastv"."staff_users" USING btree ("updated_at");
  CREATE INDEX "staff_users_created_at_idx" ON "ogastv"."staff_users" USING btree ("created_at");
  CREATE UNIQUE INDEX "staff_users_email_idx" ON "ogastv"."staff_users" USING btree ("email");
  CREATE INDEX "readers_sessions_order_idx" ON "ogastv"."readers_sessions" USING btree ("_order");
  CREATE INDEX "readers_sessions_parent_id_idx" ON "ogastv"."readers_sessions" USING btree ("_parent_id");
  CREATE INDEX "readers_updated_at_idx" ON "ogastv"."readers" USING btree ("updated_at");
  CREATE INDEX "readers_created_at_idx" ON "ogastv"."readers" USING btree ("created_at");
  CREATE UNIQUE INDEX "readers_email_idx" ON "ogastv"."readers" USING btree ("email");
  CREATE INDEX "readers_rels_order_idx" ON "ogastv"."readers_rels" USING btree ("order");
  CREATE INDEX "readers_rels_parent_idx" ON "ogastv"."readers_rels" USING btree ("parent_id");
  CREATE INDEX "readers_rels_path_idx" ON "ogastv"."readers_rels" USING btree ("path");
  CREATE INDEX "readers_rels_locations_id_idx" ON "ogastv"."readers_rels" USING btree ("locations_id");
  CREATE INDEX "readers_rels_articles_id_idx" ON "ogastv"."readers_rels" USING btree ("articles_id");
  CREATE INDEX "media_updated_at_idx" ON "ogastv"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "ogastv"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "ogastv"."media" USING btree ("filename");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "ogastv"."categories" USING btree ("slug");
  CREATE INDEX "categories_featured_image_idx" ON "ogastv"."categories" USING btree ("featured_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "ogastv"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "ogastv"."categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "locations_slug_idx" ON "ogastv"."locations" USING btree ("slug");
  CREATE INDEX "locations_parent_idx" ON "ogastv"."locations" USING btree ("parent_id");
  CREATE INDEX "locations_updated_at_idx" ON "ogastv"."locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "ogastv"."locations" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "ogastv"."tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "ogastv"."tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "ogastv"."tags" USING btree ("created_at");
  CREATE INDEX "articles_source_links_order_idx" ON "ogastv"."articles_source_links" USING btree ("_order");
  CREATE INDEX "articles_source_links_parent_id_idx" ON "ogastv"."articles_source_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "ogastv"."articles" USING btree ("slug");
  CREATE INDEX "articles_featured_image_idx" ON "ogastv"."articles" USING btree ("featured_image_id");
  CREATE INDEX "articles_author_idx" ON "ogastv"."articles" USING btree ("author_id");
  CREATE INDEX "articles_created_by_idx" ON "ogastv"."articles" USING btree ("created_by_id");
  CREATE INDEX "articles_primary_category_idx" ON "ogastv"."articles" USING btree ("primary_category_id");
  CREATE UNIQUE INDEX "articles_original_wordpress_id_idx" ON "ogastv"."articles" USING btree ("original_wordpress_id");
  CREATE INDEX "articles_updated_at_idx" ON "ogastv"."articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "ogastv"."articles" USING btree ("created_at");
  CREATE INDEX "articles__status_idx" ON "ogastv"."articles" USING btree ("_status");
  CREATE INDEX "articles_rels_order_idx" ON "ogastv"."articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "ogastv"."articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "ogastv"."articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_categories_id_idx" ON "ogastv"."articles_rels" USING btree ("categories_id");
  CREATE INDEX "articles_rels_locations_id_idx" ON "ogastv"."articles_rels" USING btree ("locations_id");
  CREATE INDEX "articles_rels_tags_id_idx" ON "ogastv"."articles_rels" USING btree ("tags_id");
  CREATE INDEX "_articles_v_version_source_links_order_idx" ON "ogastv"."_articles_v_version_source_links" USING btree ("_order");
  CREATE INDEX "_articles_v_version_source_links_parent_id_idx" ON "ogastv"."_articles_v_version_source_links" USING btree ("_parent_id");
  CREATE INDEX "_articles_v_parent_idx" ON "ogastv"."_articles_v" USING btree ("parent_id");
  CREATE INDEX "_articles_v_version_version_slug_idx" ON "ogastv"."_articles_v" USING btree ("version_slug");
  CREATE INDEX "_articles_v_version_version_featured_image_idx" ON "ogastv"."_articles_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_articles_v_version_version_author_idx" ON "ogastv"."_articles_v" USING btree ("version_author_id");
  CREATE INDEX "_articles_v_version_version_created_by_idx" ON "ogastv"."_articles_v" USING btree ("version_created_by_id");
  CREATE INDEX "_articles_v_version_version_primary_category_idx" ON "ogastv"."_articles_v" USING btree ("version_primary_category_id");
  CREATE INDEX "_articles_v_version_version_original_wordpress_id_idx" ON "ogastv"."_articles_v" USING btree ("version_original_wordpress_id");
  CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "ogastv"."_articles_v" USING btree ("version_updated_at");
  CREATE INDEX "_articles_v_version_version_created_at_idx" ON "ogastv"."_articles_v" USING btree ("version_created_at");
  CREATE INDEX "_articles_v_version_version__status_idx" ON "ogastv"."_articles_v" USING btree ("version__status");
  CREATE INDEX "_articles_v_created_at_idx" ON "ogastv"."_articles_v" USING btree ("created_at");
  CREATE INDEX "_articles_v_updated_at_idx" ON "ogastv"."_articles_v" USING btree ("updated_at");
  CREATE INDEX "_articles_v_latest_idx" ON "ogastv"."_articles_v" USING btree ("latest");
  CREATE INDEX "_articles_v_autosave_idx" ON "ogastv"."_articles_v" USING btree ("autosave");
  CREATE INDEX "_articles_v_rels_order_idx" ON "ogastv"."_articles_v_rels" USING btree ("order");
  CREATE INDEX "_articles_v_rels_parent_idx" ON "ogastv"."_articles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_articles_v_rels_path_idx" ON "ogastv"."_articles_v_rels" USING btree ("path");
  CREATE INDEX "_articles_v_rels_categories_id_idx" ON "ogastv"."_articles_v_rels" USING btree ("categories_id");
  CREATE INDEX "_articles_v_rels_locations_id_idx" ON "ogastv"."_articles_v_rels" USING btree ("locations_id");
  CREATE INDEX "_articles_v_rels_tags_id_idx" ON "ogastv"."_articles_v_rels" USING btree ("tags_id");
  CREATE UNIQUE INDEX "programmes_slug_idx" ON "ogastv"."programmes" USING btree ("slug");
  CREATE INDEX "programmes_cover_idx" ON "ogastv"."programmes" USING btree ("cover_id");
  CREATE INDEX "programmes_updated_at_idx" ON "ogastv"."programmes" USING btree ("updated_at");
  CREATE INDEX "programmes_created_at_idx" ON "ogastv"."programmes" USING btree ("created_at");
  CREATE INDEX "programmes_rels_order_idx" ON "ogastv"."programmes_rels" USING btree ("order");
  CREATE INDEX "programmes_rels_parent_idx" ON "ogastv"."programmes_rels" USING btree ("parent_id");
  CREATE INDEX "programmes_rels_path_idx" ON "ogastv"."programmes_rels" USING btree ("path");
  CREATE INDEX "programmes_rels_staff_users_id_idx" ON "ogastv"."programmes_rels" USING btree ("staff_users_id");
  CREATE UNIQUE INDEX "episodes_slug_idx" ON "ogastv"."episodes" USING btree ("slug");
  CREATE INDEX "episodes_programme_idx" ON "ogastv"."episodes" USING btree ("programme_id");
  CREATE INDEX "episodes_thumbnail_idx" ON "ogastv"."episodes" USING btree ("thumbnail_id");
  CREATE INDEX "episodes_updated_at_idx" ON "ogastv"."episodes" USING btree ("updated_at");
  CREATE INDEX "episodes_created_at_idx" ON "ogastv"."episodes" USING btree ("created_at");
  CREATE INDEX "episodes__status_idx" ON "ogastv"."episodes" USING btree ("_status");
  CREATE INDEX "episodes_rels_order_idx" ON "ogastv"."episodes_rels" USING btree ("order");
  CREATE INDEX "episodes_rels_parent_idx" ON "ogastv"."episodes_rels" USING btree ("parent_id");
  CREATE INDEX "episodes_rels_path_idx" ON "ogastv"."episodes_rels" USING btree ("path");
  CREATE INDEX "episodes_rels_staff_users_id_idx" ON "ogastv"."episodes_rels" USING btree ("staff_users_id");
  CREATE INDEX "episodes_rels_articles_id_idx" ON "ogastv"."episodes_rels" USING btree ("articles_id");
  CREATE INDEX "_episodes_v_parent_idx" ON "ogastv"."_episodes_v" USING btree ("parent_id");
  CREATE INDEX "_episodes_v_version_version_slug_idx" ON "ogastv"."_episodes_v" USING btree ("version_slug");
  CREATE INDEX "_episodes_v_version_version_programme_idx" ON "ogastv"."_episodes_v" USING btree ("version_programme_id");
  CREATE INDEX "_episodes_v_version_version_thumbnail_idx" ON "ogastv"."_episodes_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_episodes_v_version_version_updated_at_idx" ON "ogastv"."_episodes_v" USING btree ("version_updated_at");
  CREATE INDEX "_episodes_v_version_version_created_at_idx" ON "ogastv"."_episodes_v" USING btree ("version_created_at");
  CREATE INDEX "_episodes_v_version_version__status_idx" ON "ogastv"."_episodes_v" USING btree ("version__status");
  CREATE INDEX "_episodes_v_created_at_idx" ON "ogastv"."_episodes_v" USING btree ("created_at");
  CREATE INDEX "_episodes_v_updated_at_idx" ON "ogastv"."_episodes_v" USING btree ("updated_at");
  CREATE INDEX "_episodes_v_latest_idx" ON "ogastv"."_episodes_v" USING btree ("latest");
  CREATE INDEX "_episodes_v_rels_order_idx" ON "ogastv"."_episodes_v_rels" USING btree ("order");
  CREATE INDEX "_episodes_v_rels_parent_idx" ON "ogastv"."_episodes_v_rels" USING btree ("parent_id");
  CREATE INDEX "_episodes_v_rels_path_idx" ON "ogastv"."_episodes_v_rels" USING btree ("path");
  CREATE INDEX "_episodes_v_rels_staff_users_id_idx" ON "ogastv"."_episodes_v_rels" USING btree ("staff_users_id");
  CREATE INDEX "_episodes_v_rels_articles_id_idx" ON "ogastv"."_episodes_v_rels" USING btree ("articles_id");
  CREATE UNIQUE INDEX "live_events_slug_idx" ON "ogastv"."live_events" USING btree ("slug");
  CREATE INDEX "live_events_location_idx" ON "ogastv"."live_events" USING btree ("location_id");
  CREATE INDEX "live_events_artwork_idx" ON "ogastv"."live_events" USING btree ("artwork_id");
  CREATE INDEX "live_events_recording_idx" ON "ogastv"."live_events" USING btree ("recording_id");
  CREATE INDEX "live_events_updated_at_idx" ON "ogastv"."live_events" USING btree ("updated_at");
  CREATE INDEX "live_events_created_at_idx" ON "ogastv"."live_events" USING btree ("created_at");
  CREATE INDEX "live_events__status_idx" ON "ogastv"."live_events" USING btree ("_status");
  CREATE INDEX "live_events_rels_order_idx" ON "ogastv"."live_events_rels" USING btree ("order");
  CREATE INDEX "live_events_rels_parent_idx" ON "ogastv"."live_events_rels" USING btree ("parent_id");
  CREATE INDEX "live_events_rels_path_idx" ON "ogastv"."live_events_rels" USING btree ("path");
  CREATE INDEX "live_events_rels_staff_users_id_idx" ON "ogastv"."live_events_rels" USING btree ("staff_users_id");
  CREATE INDEX "_live_events_v_parent_idx" ON "ogastv"."_live_events_v" USING btree ("parent_id");
  CREATE INDEX "_live_events_v_version_version_slug_idx" ON "ogastv"."_live_events_v" USING btree ("version_slug");
  CREATE INDEX "_live_events_v_version_version_location_idx" ON "ogastv"."_live_events_v" USING btree ("version_location_id");
  CREATE INDEX "_live_events_v_version_version_artwork_idx" ON "ogastv"."_live_events_v" USING btree ("version_artwork_id");
  CREATE INDEX "_live_events_v_version_version_recording_idx" ON "ogastv"."_live_events_v" USING btree ("version_recording_id");
  CREATE INDEX "_live_events_v_version_version_updated_at_idx" ON "ogastv"."_live_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_live_events_v_version_version_created_at_idx" ON "ogastv"."_live_events_v" USING btree ("version_created_at");
  CREATE INDEX "_live_events_v_version_version__status_idx" ON "ogastv"."_live_events_v" USING btree ("version__status");
  CREATE INDEX "_live_events_v_created_at_idx" ON "ogastv"."_live_events_v" USING btree ("created_at");
  CREATE INDEX "_live_events_v_updated_at_idx" ON "ogastv"."_live_events_v" USING btree ("updated_at");
  CREATE INDEX "_live_events_v_latest_idx" ON "ogastv"."_live_events_v" USING btree ("latest");
  CREATE INDEX "_live_events_v_rels_order_idx" ON "ogastv"."_live_events_v_rels" USING btree ("order");
  CREATE INDEX "_live_events_v_rels_parent_idx" ON "ogastv"."_live_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_live_events_v_rels_path_idx" ON "ogastv"."_live_events_v_rels" USING btree ("path");
  CREATE INDEX "_live_events_v_rels_staff_users_id_idx" ON "ogastv"."_live_events_v_rels" USING btree ("staff_users_id");
  CREATE INDEX "community_submissions_location_idx" ON "ogastv"."community_submissions" USING btree ("location_id");
  CREATE INDEX "community_submissions_converted_article_idx" ON "ogastv"."community_submissions" USING btree ("converted_article_id");
  CREATE INDEX "community_submissions_updated_at_idx" ON "ogastv"."community_submissions" USING btree ("updated_at");
  CREATE INDEX "community_submissions_created_at_idx" ON "ogastv"."community_submissions" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "ogastv"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "ogastv"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "ogastv"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "ogastv"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_staff_users_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("staff_users_id");
  CREATE INDEX "payload_locked_documents_rels_readers_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("readers_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_programmes_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("programmes_id");
  CREATE INDEX "payload_locked_documents_rels_episodes_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("episodes_id");
  CREATE INDEX "payload_locked_documents_rels_live_events_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("live_events_id");
  CREATE INDEX "payload_locked_documents_rels_community_submissions_id_idx" ON "ogastv"."payload_locked_documents_rels" USING btree ("community_submissions_id");
  CREATE INDEX "payload_preferences_key_idx" ON "ogastv"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "ogastv"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "ogastv"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "ogastv"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "ogastv"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "ogastv"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_staff_users_id_idx" ON "ogastv"."payload_preferences_rels" USING btree ("staff_users_id");
  CREATE INDEX "payload_preferences_rels_readers_id_idx" ON "ogastv"."payload_preferences_rels" USING btree ("readers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "ogastv"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "ogastv"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage_lead_story_idx" ON "ogastv"."homepage" USING btree ("lead_story_id");
  CREATE INDEX "homepage_featured_episode_idx" ON "ogastv"."homepage" USING btree ("featured_episode_id");
  CREATE INDEX "homepage_featured_live_event_idx" ON "ogastv"."homepage" USING btree ("featured_live_event_id");
  CREATE INDEX "homepage__status_idx" ON "ogastv"."homepage" USING btree ("_status");
  CREATE INDEX "homepage_rels_order_idx" ON "ogastv"."homepage_rels" USING btree ("order");
  CREATE INDEX "homepage_rels_parent_idx" ON "ogastv"."homepage_rels" USING btree ("parent_id");
  CREATE INDEX "homepage_rels_path_idx" ON "ogastv"."homepage_rels" USING btree ("path");
  CREATE INDEX "homepage_rels_articles_id_idx" ON "ogastv"."homepage_rels" USING btree ("articles_id");
  CREATE INDEX "_homepage_v_version_version_lead_story_idx" ON "ogastv"."_homepage_v" USING btree ("version_lead_story_id");
  CREATE INDEX "_homepage_v_version_version_featured_episode_idx" ON "ogastv"."_homepage_v" USING btree ("version_featured_episode_id");
  CREATE INDEX "_homepage_v_version_version_featured_live_event_idx" ON "ogastv"."_homepage_v" USING btree ("version_featured_live_event_id");
  CREATE INDEX "_homepage_v_version_version__status_idx" ON "ogastv"."_homepage_v" USING btree ("version__status");
  CREATE INDEX "_homepage_v_created_at_idx" ON "ogastv"."_homepage_v" USING btree ("created_at");
  CREATE INDEX "_homepage_v_updated_at_idx" ON "ogastv"."_homepage_v" USING btree ("updated_at");
  CREATE INDEX "_homepage_v_latest_idx" ON "ogastv"."_homepage_v" USING btree ("latest");
  CREATE INDEX "_homepage_v_rels_order_idx" ON "ogastv"."_homepage_v_rels" USING btree ("order");
  CREATE INDEX "_homepage_v_rels_parent_idx" ON "ogastv"."_homepage_v_rels" USING btree ("parent_id");
  CREATE INDEX "_homepage_v_rels_path_idx" ON "ogastv"."_homepage_v_rels" USING btree ("path");
  CREATE INDEX "_homepage_v_rels_articles_id_idx" ON "ogastv"."_homepage_v_rels" USING btree ("articles_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ogastv"."staff_users_sessions" CASCADE;
  DROP TABLE "ogastv"."staff_users" CASCADE;
  DROP TABLE "ogastv"."readers_sessions" CASCADE;
  DROP TABLE "ogastv"."readers" CASCADE;
  DROP TABLE "ogastv"."readers_rels" CASCADE;
  DROP TABLE "ogastv"."media" CASCADE;
  DROP TABLE "ogastv"."categories" CASCADE;
  DROP TABLE "ogastv"."locations" CASCADE;
  DROP TABLE "ogastv"."tags" CASCADE;
  DROP TABLE "ogastv"."articles_source_links" CASCADE;
  DROP TABLE "ogastv"."articles" CASCADE;
  DROP TABLE "ogastv"."articles_rels" CASCADE;
  DROP TABLE "ogastv"."_articles_v_version_source_links" CASCADE;
  DROP TABLE "ogastv"."_articles_v" CASCADE;
  DROP TABLE "ogastv"."_articles_v_rels" CASCADE;
  DROP TABLE "ogastv"."programmes" CASCADE;
  DROP TABLE "ogastv"."programmes_rels" CASCADE;
  DROP TABLE "ogastv"."episodes" CASCADE;
  DROP TABLE "ogastv"."episodes_rels" CASCADE;
  DROP TABLE "ogastv"."_episodes_v" CASCADE;
  DROP TABLE "ogastv"."_episodes_v_rels" CASCADE;
  DROP TABLE "ogastv"."live_events" CASCADE;
  DROP TABLE "ogastv"."live_events_rels" CASCADE;
  DROP TABLE "ogastv"."_live_events_v" CASCADE;
  DROP TABLE "ogastv"."_live_events_v_rels" CASCADE;
  DROP TABLE "ogastv"."community_submissions" CASCADE;
  DROP TABLE "ogastv"."payload_kv" CASCADE;
  DROP TABLE "ogastv"."payload_locked_documents" CASCADE;
  DROP TABLE "ogastv"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "ogastv"."payload_preferences" CASCADE;
  DROP TABLE "ogastv"."payload_preferences_rels" CASCADE;
  DROP TABLE "ogastv"."payload_migrations" CASCADE;
  DROP TABLE "ogastv"."homepage" CASCADE;
  DROP TABLE "ogastv"."homepage_rels" CASCADE;
  DROP TABLE "ogastv"."_homepage_v" CASCADE;
  DROP TABLE "ogastv"."_homepage_v_rels" CASCADE;
  DROP TYPE "ogastv"."enum_staff_users_role";
  DROP TYPE "ogastv"."enum_locations_kind";
  DROP TYPE "ogastv"."enum_articles_editorial_type";
  DROP TYPE "ogastv"."enum_articles_workflow_status";
  DROP TYPE "ogastv"."enum_articles_status";
  DROP TYPE "ogastv"."enum__articles_v_version_editorial_type";
  DROP TYPE "ogastv"."enum__articles_v_version_workflow_status";
  DROP TYPE "ogastv"."enum__articles_v_version_status";
  DROP TYPE "ogastv"."enum_episodes_status";
  DROP TYPE "ogastv"."enum__episodes_v_version_status";
  DROP TYPE "ogastv"."enum_live_events_broadcast_status";
  DROP TYPE "ogastv"."enum_live_events_status";
  DROP TYPE "ogastv"."enum__live_events_v_version_broadcast_status";
  DROP TYPE "ogastv"."enum__live_events_v_version_status";
  DROP TYPE "ogastv"."enum_community_submissions_moderation_status";
  DROP TYPE "ogastv"."enum_homepage_status";
  DROP TYPE "ogastv"."enum__homepage_v_version_status";`)
}
