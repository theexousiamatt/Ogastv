import {escapeHTML,safeURL,uid} from './model.js';
export class MediaURLs {
  constructor(){this.cache=new WeakMap();this.urls=new Set();}
  get(blob){if(!blob)return '';let url=this.cache.get(blob);if(!url){url=URL.createObjectURL(blob);this.cache.set(blob,url);this.urls.add(url);}return url;}
  clear(){this.urls.forEach(url=>URL.revokeObjectURL(url));this.urls.clear();this.cache=new WeakMap();}
}
const toBlob=(canvas,type='image/webp',quality=.86)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('This image could not be prepared. Try a JPG or PNG.')),type,quality));
export async function prepareImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP image.');
  if(file.size>25*1024*1024)throw Error('Choose an image smaller than 25 MB.');
  const image=await createImageBitmap(file);
  try {
    if(image.width*image.height>50000000)throw Error('This image is too large to prepare safely. Resize it below 50 megapixels.');
    const factor=Math.min(1,2000/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*factor);canvas.height=Math.round(image.height*factor);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await toBlob(canvas);return {id:uid(),kind:'image',name:file.name,blob,width:canvas.width,height:canvas.height,originalSize:file.size,alt:'',caption:'',credit:'',crop:{enabled:true,x:50,y:50}};
  } finally {image.close();}
}
export async function cropImage(asset,crop){
  if(!crop.enabled)return asset.blob;
  const image=await createImageBitmap(asset.blob);
  try {
    const ratio=16/9,w=Math.min(image.width,image.height*ratio),h=w/ratio,x=(image.width-w)*crop.x/100,y=(image.height-h)*crop.y/100,canvas=document.createElement('canvas');canvas.width=Math.round(w);canvas.height=Math.round(h);canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);return await toBlob(canvas);
  } finally {image.close();}
}
export function createFigure(asset,urls,{editable=false,onRemove=()=>{}}={}) {
  const figure=document.createElement('figure');figure.dataset.mediaId=asset.id;figure.contentEditable='false';figure.className=asset.kind==='audio'?'audio-figure':'image-figure';
  if(asset.kind==='image'){
    const img=document.createElement('img');img.src=urls.get(asset.displayBlob||asset.blob);img.alt=asset.alt||'';img.loading='lazy';figure.append(img);
  }else if(asset.kind==='audio'){
    const title=document.createElement('strong');title.textContent=asset.title||asset.name||'Audio clip';const audio=document.createElement('audio');audio.controls=true;audio.preload=asset.url?'none':'metadata';audio.src=asset.url?safeURL(asset.url,true)||'':urls.get(asset.blob);audio.setAttribute('aria-label',title.textContent);figure.append(title,audio);
    audio.addEventListener('error',()=>{if(!figure.querySelector('.audio-playback-error')){const error=document.createElement('p');error.className='hint audio-playback-error';error.textContent='This audio could not be played. Check the file format or replace the audio link.';figure.append(error);}});
  }
  if(asset.caption||asset.credit){const caption=document.createElement('figcaption');caption.textContent=[asset.caption,asset.credit&&`Photo: ${asset.credit}`].filter(Boolean).join(' — ');figure.append(caption);}
  if(asset.kind==='audio'&&asset.transcript){const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');summary.textContent='Read transcript';text.textContent=asset.transcript;details.append(summary,text);figure.append(details);}
  if(editable){const remove=document.createElement('button');remove.type='button';remove.className='text-button media-remove';remove.textContent='Remove from story';remove.setAttribute('aria-label',`Remove ${asset.kind==='audio'?'audio':'image'} from story`);remove.onclick=()=>onRemove(figure,asset);figure.append(remove);}
  return figure;
}
export function hydrateMedia(container,story,urls,options={}){
  container.querySelectorAll('figure[data-media-id]').forEach(node=>{const asset=story.media.find(m=>m.id===node.dataset.mediaId);if(asset&&['image','audio'].includes(asset.kind))node.replaceWith(createFigure(asset,urls,options));else node.remove();});
}
export function readerMarkup(story,html){return `<div class="reader-brand">OGAs <span>TV</span> Africa</div><span class="reader-section">${escapeHTML(story.section)}</span><h1>${escapeHTML(story.headline||'Your headline will appear here')}</h1><p class="reader-byline">By ${escapeHTML(story.byline||'Reporter')} · ${new Date(story.updatedAt).toLocaleDateString(undefined,{dateStyle:'long'})}</p><div id="reader-cover"></div><div class="reader-body">${html||'<p>Your story will appear here as you write.</p>'}</div><p class="preview-note">Local article preview. This story has not been published to the live website.</p>`;}
