import { readFileSync } from 'node:fs';

const mapPath = new URL('../app/(payload)/admin/importMap.js', import.meta.url);
const source = readFileSync(mapPath, 'utf8');
const required = [
  '/cms/admin/NewsroomDashboard',
  '/cms/admin/DeskNavigation',
  '/cms/admin/NewsroomBrand',
  '/cms/admin/ReviewQueue',
  '/cms/admin/MyStories',
];

const missing = required.filter((component) => !source.includes(component));
if (missing.length) {
  console.error('Payload admin import map is incomplete. Missing:', missing.join(', '));
  process.exit(1);
}
console.log('Payload admin import map verified for custom newsroom components.');
