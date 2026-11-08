// Prevent the retired public name from returning to the active application.
// The existing ogastvafrica.ng domain/email addresses are intentionally unchanged.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['app', 'components', 'cms', 'lib'];
const allowed = /\.(?:ts|tsx|css)$/;
const legacy = /OgasTV(?:\s|%20)+Africa/gi;
const violations = [];

function inspect(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (entry.isFile() && allowed.test(file)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        if (legacy.test(line)) violations.push(file + ':' + (index + 1));
        legacy.lastIndex = 0;
      });
    }
  }
}

for (const root of roots) inspect(root);
const config = readFileSync('payload.config.ts', 'utf8');
if (legacy.test(config)) violations.push('payload.config.ts');
const layout = readFileSync('app/(frontend)/layout.tsx', 'utf8');
if (!layout.includes('OgasTV Nigeria')) violations.push('app/(frontend)/layout.tsx: official name missing');
if (!layout.includes('https://ogastvafrica.ng')) violations.push('app/(frontend)/layout.tsx: existing canonical URL missing');

if (violations.length) {
  console.error('OgasTV Nigeria brand check failed:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('OgasTV Nigeria branding verified; existing domain preserved.');
