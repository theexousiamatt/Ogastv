export class ConflictError extends Error {constructor(){super('This story was saved in another tab. Download your backup before reopening the saved version.');this.name='ConflictError';}}
export async function openWorkspace(name='ogas-writer-desk-v1') {
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>{request.result.createObjectStore('stories',{keyPath:'id'});request.result.createObjectStore('meta');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close other copies of this preview and try again.'));});
  const read=(store,key)=>new Promise((resolve,reject)=>{const request=db.transaction(store).objectStore(store).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const meta=(key,value)=>new Promise((resolve,reject)=>{const tx=db.transaction('meta','readwrite');tx.objectStore('meta').put(value,key);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not save locally.'));});
  return {
    db,read:id=>read('stories',id),getMeta:key=>read('meta',key),setMeta:meta,
    list:()=>new Promise((resolve,reject)=>{const request=db.transaction('stories').objectStore('stories').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.updatedAt-a.updatedAt));request.onerror=()=>reject(request.error);}),
    save:(story,revision)=>new Promise((resolve,reject)=>{
      let conflict=false,result;
      const tx=db.transaction(['stories','meta'],'readwrite'),store=tx.objectStore('stories'),request=store.get(story.id);
      request.onsuccess=()=>{if((request.result?.revision||0)!==revision){conflict=true;tx.abort();return;}result={...story,revision:revision+1};store.put(result);tx.objectStore('meta').put(story.id,'active-story');};
      tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(conflict?new ConflictError():tx.error||Error('Local storage is full or unavailable. Download a backup to keep your work.'));
    }),
    close:()=>db.close()
  };
}
