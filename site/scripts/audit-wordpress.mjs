#!/usr/bin/env node
// Read-only WordPress REST inventory: no changes to the source installation.
import { writeFile, mkdir } from 'node:fs/promises';
const base = (process.env.WORDPRESS_API_BASE || 'https://ogastvafrica.ng/wp-json/wp/v2').replace(/\/+$/, '');
const resources = ['posts', 'pages', 'media', 'categories', 'tags', 'users'];
const report = { generatedAt: new Date().toISOString(), source: base, readOnly: true, resources: {} };
for (const type of resources) {
  try {
    const url = new URL(base + '/' + type);
    url.searchParams.set('per_page', '1');
    const response = await fetch(url, {signal: AbortSignal.timeout(15000), headers: {Accept: 'application/json'}});
    if (!response.ok) throw Error(String(response.status) + ' ' + response.statusText);
    report.resources[type] = {status:'accessible',count:Number(response.headers.get('x-wp-total')),pages:Number(response.headers.get('x-wp-totalpages'))};
  } catch (error) {report.resources[type] = {status:'unavailable',message:error.message};}
  console.log(type, report.resources[type]);
}
await mkdir('reports', { recursive:true });
await writeFile('reports/wordpress-inventory.json', JSON.stringify(report,null,2)+'\n');
console.log('Wrote reports/wordpress-inventory.json');
