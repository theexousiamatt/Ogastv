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
const mediaStorage = {
  endpoint: process.env.OGASTV_MEDIA_S3_ENDPOINT || '',
  region: process.env.OGASTV_MEDIA_S3_REGION || '',
  keyId: process.env.OGASTV_MEDIA_S3_ACCESS_KEY_ID || '',
  secret: process.env.OGASTV_MEDIA_S3_SECRET_ACCESS_KEY || '',
};
// Hostinger deployments replace the app files, so uploaded images must be stored
// in an external bucket. Missing credentials leave the existing local adapter
// available until the bucket connection is explicitly configured.
const durableMediaEnabled = Object.values(mediaStorage).every(Boolean);
const mediaPublicBase = 'https://cjyhayrxadyadaqdrlot.supabase.co/storage/v1/object/public/ogastv-public-media';


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
      enabled: durableMediaEnabled,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({filename, prefix}) => {
            const filePath = prefix ? prefix + '/' + filename : filename;
            return mediaPublicBase + '/' + filePath.split('/').map(encodeURIComponent).join('/');
          },
        },
      },
      bucket: 'ogastv-public-media',
      config: {
        endpoint: mediaStorage.endpoint,
        region: mediaStorage.region || 'us-east-1',
        credentials: {accessKeyId: mediaStorage.keyId, secretAccessKey: mediaStorage.secret},
        forcePathStyle: true,
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
