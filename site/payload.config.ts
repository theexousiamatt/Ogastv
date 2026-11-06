import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { Staff } from './cms/collections/Staff';
import { Readers } from './cms/collections/Readers';
import { Media } from './cms/collections/Media';
import { AdBanners } from './cms/collections/AdBanners';
import { Articles } from './cms/collections/Articles';
import { Categories, Locations, Tags } from './cms/collections/Taxonomy';
import { Programmes, Episodes, LiveEvents } from './cms/collections/Studio';
import { CommunitySubmissions } from './cms/collections/Community';
import { Homepage } from './cms/globals/Homepage';
import { SUPABASE_ROOT_CA } from './cms/supabase-root-ca';
import { WordpressMediaInventory, WordpressPagesInventory } from './cms/collections/WordpressImport';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_ADDRESS);
const smtpPort = Number(process.env.SMTP_PORT || '465');

// Hostinger replaces build directories on deployment. Keep public editorial images in
// Supabase Storage rather than the ephemeral local ./media folder.
// S3 credentials are read only on the server; never expose them in NEXT_PUBLIC_* vars.
const mediaS3AccessKey = process.env.OGASTV_MEDIA_S3_ACCESS_KEY_ID || '';
const mediaS3SecretKey = process.env.OGASTV_MEDIA_S3_SECRET_ACCESS_KEY || '';
const mediaS3Enabled = Boolean(mediaS3AccessKey && mediaS3SecretKey);
const mediaS3Bucket = 'ogastv-public-media';
const mediaS3PublicRoot = 'https://cjyhayrxadyadaqdrlot.supabase.co/storage/v1/object/public/' + mediaS3Bucket;
const mediaS3Endpoint = process.env.OGASTV_MEDIA_S3_ENDPOINT
  || 'https://cjyhayrxadyadaqdrlot.storage.supabase.co/storage/v1/s3';
const mediaS3Region = process.env.OGASTV_MEDIA_S3_REGION || 'eu-west-1';


export default buildConfig({
  email: emailConfigured ? nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM_ADDRESS!,
    defaultFromName: 'OgasTV Africa',
    transportOptions: {
      host: process.env.SMTP_HOST!,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    },
  }) : undefined,
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL === 'https://ogastv-cms.inspirarestudio.com'
    ? 'https://ogastvafrica.ng'
    : (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    // Dedicated, unexposed Supabase schema; do not use Supabase's public schema.
    schemaName: 'ogastv',
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_TLS_REQUIRED !== 'false'
        ? { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }
        : undefined,
    },
  }),
  editor: lexicalEditor(),
  plugins: [
    s3Storage({
      enabled: mediaS3Enabled,
      bucket: mediaS3Bucket,
      collections: {
        media: {
          // Public editorial media uses an intentionally public Supabase bucket.
          // Upload/change/delete authorization still comes from the Media collection.
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const key = [prefix, filename].filter((part): part is string => Boolean(part)).map(encodeURIComponent).join('/');
            return mediaS3PublicRoot + '/' + key;
          },
        },
      },
      config: {
        endpoint: mediaS3Endpoint,
        region: mediaS3Region,
        forcePathStyle: true,
        credentials: { accessKeyId: mediaS3AccessKey, secretAccessKey: mediaS3SecretKey },
      },
    }),
  ],
  admin: {
    user: 'staff-users',
    theme: 'light',
    timezones: { defaultTimezone: 'Africa/Lagos' },
    components: {
      beforeNavLinks: ['/cms/admin/DeskNavigation#DeskNavigation'],
      graphics: {
        Logo: '/cms/admin/NewsroomBrand#NewsroomLogo',
        Icon: '/cms/admin/NewsroomBrand#NewsroomIcon',
      },
      views: {
        dashboard: { Component: '/cms/admin/NewsroomDashboard#NewsroomDashboard' },
        reviewQueue: { Component: '/cms/admin/ReviewQueue#ReviewQueue', path: '/review-queue' },
        myStories: { Component: '/cms/admin/MyStories#MyStories', path: '/my-stories' },
      },
    },
    importMap: {
      baseDir: dirname,
    },
    meta: { titleSuffix: ' — OgasTV Africa Newsroom' },
  },
  collections: [
    Staff, Readers, Media, AdBanners, Categories, Locations, Tags, Articles,
    Programmes, Episodes, LiveEvents, CommunitySubmissions,
    WordpressMediaInventory, WordpressPagesInventory,
  ],
  globals: [Homepage],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
});
