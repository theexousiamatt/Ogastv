import { notFound, permanentRedirect } from 'next/navigation';
import { getArticle, getCategories } from '@/lib/content';

export const dynamic='force-dynamic';
type Props={params:Promise<{legacy:string[]}>};

/**
 * Old WordPress URLs often placed article slugs at the root, whereas
 * the rebuilt platform uses /stories/<slug>. Use a real 308 only for
 * known published articles, never redirect an unknown URL to homepage.
 */
export default async function LegacyWordpressRedirect({params}:Props){
  const parts=(await params).legacy;
  if(!parts||parts.length<1||parts.length>5)notFound();
  if(parts.length===1){
    const old=parts[0].toLowerCase();
    const pages:Record<string,string>={
      'about-us':'/about','contact-us':'/contact',
      'privacy-policy':'/privacy','editorial-policy':'/editorial-standards',
    };
    if(pages[old])permanentRedirect(pages[old]);
  }
  if(parts.length===2&&parts[0]==='category'){
    const categories=await getCategories();
    if(categories.some(category=>category.slug===parts[1]))
      permanentRedirect('/section/'+encodeURIComponent(parts[1]));
  }
  // Common WordPress date-prefixed permalinks: /2026/08/story,
  // /2026/08/12/story. Otherwise only root slugs are eligible.
  const dated=parts.length>=3&&parts.length<=4&&/^20\d{2}$/.test(parts[0])&&
    /^(0?[1-9]|1[0-2])$/.test(parts[1])&&(parts.length===3||/^([1-9]|[12]\d|3[01])$/.test(parts[2]));
  if(parts.length!==1&&!dated)notFound();
  const slug=parts[parts.length-1];
  if(!slug||slug.length>210||!/^[\p{L}\p{N}_%.~-]+$/u.test(slug))notFound();
  const article=await getArticle(slug);
  if(!article)notFound();
  permanentRedirect('/stories/'+encodeURIComponent(article.slug));
}
