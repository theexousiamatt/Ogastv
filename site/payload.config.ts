import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Staff } from './cms/collections/Staff';
import { Readers } from './cms/collections/Readers';
import { Media } from './cms/collections/Media';
import { Articles } from './cms/collections/Articles';
import { Categories, Locations, Tags } from './cms/collections/Taxonomy';
import { Programmes, Episodes, LiveEvents } from './cms/collections/Studio';
import { CommunitySubmissions } from './cms/collections/Community';
import { Homepage } from './cms/globals/Homepage';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  secret: process.env.PAYLOAD_SECRET || '',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
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
