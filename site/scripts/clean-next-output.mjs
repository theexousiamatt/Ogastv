// Hostinger uses quota-limited, reused build workspaces. Only delete Next.js
// generated output from the current repository checkout, never user uploads.
import { rmSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const dir = resolve(process.cwd(), '.next');
if (basename(dir) !== '.next') throw new Error('Refusing to remove anything other than .next output.');
rmSync(dir, {recursive:true, force:true});
console.log('Old generated Next.js build output cleared.');
