import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const standalone = join(process.cwd(), '.next', 'standalone');
const bundledStatic = join(process.cwd(), '.next', 'static');
const deployedStatic = join(standalone, '.next', 'static');

if (!existsSync(join(standalone, 'server.js'))) {
  throw new Error('Next.js standalone server.js was not produced.');
}
if (!existsSync(bundledStatic)) {
  throw new Error('Next.js .next/static assets missing; refusing to deploy an unstyled site.');
}

function countFiles(folder, extension) {
  if (!existsSync(folder)) return 0;
  return readdirSync(folder, { withFileTypes: true }).reduce((count, entry) => {
    const path = join(folder, entry.name);
    return count + (entry.isDirectory() ? countFiles(path, extension) : (entry.isFile() && entry.name.endsWith(extension) ? 1 : 0));
  }, 0);
}
const styleCount = countFiles(bundledStatic, '.css');
if (styleCount < 1) throw new Error('Next.js build produced no CSS assets.');

cpSync(bundledStatic, deployedStatic, { recursive: true, force: true });
const publicDir = join(process.cwd(), 'public');
if (existsSync(publicDir) && statSync(publicDir).isDirectory()) {
  cpSync(publicDir, join(standalone, 'public'), { recursive: true, force: true });
}
const deployedStyles = countFiles(deployedStatic, '.css');
if (deployedStyles !== styleCount) {
  throw new Error(`CSS packaging incomplete: ${deployedStyles}/${styleCount} stylesheets copied.`);
}
console.log(`Standalone assets ready: ${deployedStyles} CSS files + static JS chunks copied; public/ included when present.`);
