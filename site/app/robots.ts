import type { MetadataRoute } from 'next';
export default function robots():MetadataRoute.Robots{
  return {
    rules:[{userAgent:'*',allow:'/',disallow:[
      '/studio','/admin','/api','/activate-newsroom','/broadcast-studio',
      '/reading-list',
    ]}],
    sitemap:'https://ogastvafrica.ng/sitemap.xml',
    host:'https://ogastvafrica.ng',
  };
}
