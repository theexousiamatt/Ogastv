import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import { Staff } from './cms/collections/Staff';
import { Readers } from './cms/collections/Readers';
import { Media } from './cms/collections/Media';
import { Articles } from './cms/collections/Articles';
import { Categories, Locations, Tags } from './cms/collections/Taxonomy';
import { Programmes, Episodes, LiveEvents } from './cms/collections/Studio';
import { CommunitySubmissions } from './cms/collections/Community';
import { Homepage } from './cms/globals/Homepage';
import { SUPABASE_ROOT_CA } from './cms/supabase-root-ca';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM_ADDRESS);
const smtpPort = Number(process.env.SMTP_PORT || '465');

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
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
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
  admin: {
    user: 'staff-users',
    importMap: {
      baseDir: dirname,
    },
    meta: { titleSuffix: ' — OgasTV Africa Newsroom' },
  },
  collections: [
    Staff, Readers, Media, Categories, Locations, Tags, Articles,
    Programmes, Episodes, LiveEvents, CommunitySubmissions,
  ],
  globals: [Homepage],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
});
