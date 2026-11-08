export type SavedStory={slug:string;title:string;date:string;category:string};
const KEY='ogastv-reading-list-v1';
const MAX_ITEMS=100;

export function readSavedStories():SavedStory[]{
  if(typeof window==='undefined')return [];
  try{
    const value=JSON.parse(window.localStorage.getItem(KEY)||'[]');
    if(!Array.isArray(value))return [];
    return value.filter(item=>item&&typeof item.slug==='string'&&typeof item.title==='string'&&
      item.slug.length<=200&&item.title.length<=300)
      .map(item=>({slug:item.slug,title:item.title,date:String(item.date||''),category:String(item.category||'')}))
      .slice(0,MAX_ITEMS);
  }catch{return [];}
}
export function writeSavedStories(stories:SavedStory[]):boolean{
  if(typeof window==='undefined')return false;
  try{
    window.localStorage.setItem(KEY,JSON.stringify(stories.slice(0,MAX_ITEMS)));
    window.dispatchEvent(new Event('ogastv-reading-list-change'));
    return true;
  }catch{return false;}
}
