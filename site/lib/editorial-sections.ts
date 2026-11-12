/** These desks are populated automatically from published article categories.
 * Slug aliases keep earlier newsroom classifications working after the redesign.
 * New categories can be created in Studio → Advanced Settings → Sections.
 */
export const homepageCategoryDefinitions = [
  { key: 'lagosWatch', title: 'Lagos Watch', slug: 'lagos-watch',
    aliases: ['lagos-watch', 'lagos', 'local-government', 'lcda'] },
  { key: 'government', title: 'Government & Policies', slug: 'government-policies',
    aliases: ['government-policies', 'government-and-policies', 'government', 'politics', 'policy', 'civic-responsibility'] },
  { key: 'grassrootsVoices', title: 'Grassroots Voices', slug: 'grassroots-voices',
    aliases: ['grassroots-voices', 'grassroots', 'community', 'community-voices'] },
  { key: 'business', title: 'Business & Investment', slug: 'business-investment',
    aliases: ['business-investment', 'business-and-investment', 'business', 'investment', 'economic', 'economics'] },
  { key: 'personalities', title: 'Personalities', slug: 'personalities',
    aliases: ['personalities', 'profiles', 'interviews', 'people'] },
] as const;

export type HomepageCategoryKey = (typeof homepageCategoryDefinitions)[number]['key'];

export function preferredSectionSlug(
  aliases: readonly string[],
  available: readonly {slug:string}[],
  canonical: string,
): string {
  return aliases.find(slug => available.some(category => category.slug === slug)) || canonical;
}

/** Canonical editorial archive pages also contain legacy categories grouped
 * into the same desk. Individual legacy category URLs stay narrowly scoped.
 */
export function archiveCategoryAliases(slug: string): string[] {
  const desk = homepageCategoryDefinitions.find(def => def.slug === slug);
  return desk ? [...desk.aliases] : [slug];
}

/** Prioritise OgasTV's key Lagos reporting communities without hiding other LGAs. */
export function prioritiseLagosCouncils<T extends {slug:string;name:string}>(items:readonly T[]):T[]{
  const top=['kosofe','ikorodu'];
  return [...items].sort((a,b)=>{
    const pa=top.indexOf(a.slug),pb=top.indexOf(b.slug);
    const left=pa<0?top.length:pa,right=pb<0?top.length:pb;
    return left-right||a.name.localeCompare(b.name);
  });
}
