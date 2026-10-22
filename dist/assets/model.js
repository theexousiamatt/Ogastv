export const statuses = {draft:'Draft', review:'In review', changes:'Changes requested', approved:'Approved locally'};
export function uid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Keep local drafts usable on LAN HTTP; microphone tools still require a secure origin.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function newStory(byline='Desk Editor') {
  return {id:uid(),headline:'',html:'',section:'News',byline,source:'',coverId:null,media:[],status:'draft',comments:[],revision:0,createdAt:Date.now(),updatedAt:Date.now()};
}
export function safeURL(value, audio=false) {
  try {const url=new URL(value);if(url.username||url.password)return null;
    if(!['https:','http:'].includes(url.protocol))return null;
    if(audio&&url.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return null;
    return url.href;
  } catch {return null;}
}
const allowed=new Set(['P','BR','STRONG','B','EM','I','U','S','H1','H2','H3','BLOCKQUOTE','UL','OL','LI','A']);
const drop=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','TEMPLATE','NOSCRIPT','INPUT','BUTTON','SELECT','TEXTAREA']);
/** Rebuild trusted markup; pasted HTML never carries scripts, styling or remote media. */
export function cleanHTML(html, mediaIds=[]) {
  const input=new DOMParser().parseFromString(html,'text/html'),out=document.createElement('div'),ids=new Set(mediaIds);
  function append(node,parent) {
    if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
    if(node.nodeType!==1||drop.has(node.tagName))return;
    if(node.tagName==='FIGURE'&&ids.has(node.dataset.mediaId)) {const f=document.createElement('figure');f.dataset.mediaId=node.dataset.mediaId;f.contentEditable='false';parent.append(f);return;}
    if(node.tagName==='IMG'||node.tagName==='AUDIO'||node.tagName==='VIDEO')return;
    if(!allowed.has(node.tagName)&&node.tagName!=='DIV') {node.childNodes.forEach(n=>append(n,parent));return;}
    const tag=node.tagName==='DIV'?'p':node.tagName.toLowerCase(),el=document.createElement(tag);
    if(tag==='a'){const href=safeURL(node.getAttribute('href'));if(href){el.href=href;el.target='_blank';el.rel='noopener noreferrer';}}
    if(['left','center','right'].includes(node.style.textAlign))el.style.textAlign=node.style.textAlign;
    node.childNodes.forEach(n=>append(n,el));parent.append(el);
  }
  input.body.childNodes.forEach(n=>append(n,out));return out.innerHTML;
}
export function storyText(html) {const d=new DOMParser().parseFromString(html,'text/html');d.querySelectorAll('figure').forEach(n=>n.remove());d.querySelectorAll('p,div,h1,h2,h3,li,blockquote,br').forEach(n=>n.after(document.createTextNode(' ')));return d.body.textContent.replace(/\s+/g,' ').trim();}
export const wordCount = html => storyText(html).split(/\s+/).filter(Boolean).length;
export function validateStory(story, approving=false) {
  const errors=[];
  if(!story.headline.trim())errors.push({field:'headline',message:'Add a headline.'});
  if(!storyText(story.html))errors.push({field:'content',message:'Write the story before submitting it.'});
  if(!story.byline.trim())errors.push({field:'byline',message:'Add the reporter’s byline.'});
  if(story.source&&!safeURL(story.source))errors.push({field:'source-url',message:'Use a complete http or https source link.'});
  if(approving&&!story.media.some(m=>m.id===story.coverId&&m.kind==='image'))errors.push({field:'cover-add',message:'Add a featured image before approving the story.'});
  if(approving&&story.media.some(m=>m.kind==='image'&&!m.alt?.trim()))errors.push({field:'cover-add',message:'Add alternative text to every story image in Media.'});
  return errors;
}
export function transition(story,action,role,note='') {
  const next=structuredClone(story);
  if(action==='submit'){const errors=validateStory(next);if(errors.length)throw Error(errors[0].message);next.status='review';}
  else if(action==='changes'){if(role!=='editor')throw Error('Switch to the editor preview to review this story.');if(!note.trim())throw Error('Write feedback for the reporter first.');next.status='changes';}
  else if(action==='approve'){if(role!=='editor')throw Error('Switch to the editor preview to approve this story.');if(story.status!=='review')throw Error('Submit the story for review first.');const errors=validateStory(next,true);if(errors.length)throw Error(errors[0].message);next.status='approved';}
  else if(action==='reopen')next.status='draft';
  else throw Error('Unknown story action.');
  if(note.trim())next.comments.push({id:uid(),text:note.trim(),role,createdAt:Date.now()});
  next.updatedAt=Date.now();return next;
}
export const recordMime = Recorder => ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>Recorder?.isTypeSupported?.(type))||'';
export function mergeSpeech(event,committed) {
  let final='',interim='';
  for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];if(result.isFinal){if(!committed.has(i)){final+=result[0].transcript+' ';committed.add(i);}}else interim+=result[0].transcript+' ';}
  return {final:final.trim(),interim:interim.trim()};
}
